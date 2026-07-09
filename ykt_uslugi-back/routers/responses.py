from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from database import get_db
from dependencies import get_current_user, require_admin
from models.response import Report, ServiceResponse
from models.review import Review
from models.service import Service
from models.user import User
from schemas.common import ApiResponse, UserBrief
from schemas.response import (
    AdminResponseResolution,
    ReportCreate,
    ReportRead,
    ReportUpdate,
    ResponseCreate,
    ResponseRead,
    ResponseUpdate,
)

router = APIRouter(tags=["responses"])
AUTO_COMPLETE_HOURS = 72
ACTIVE_STATUSES = ("new", "accepted", "work_submitted", "revision_requested", "disputed")
FINAL_STATUSES = {"completed", "cancelled", "declined"}


def _now() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _response_options():
    return (joinedload(ServiceResponse.respondent), joinedload(ServiceResponse.service).joinedload(Service.owner))


def _deal_roles(item: ServiceResponse) -> tuple[int, int]:
    """Return (customer_id, performer_id) for either listing direction."""
    if item.service.listing_type == "request":
        return item.service.owner_id, item.respondent_id
    return item.respondent_id, item.service.owner_id


async def _auto_complete_overdue(db: AsyncSession) -> None:
    now = _now()
    cutoff = now - timedelta(hours=AUTO_COMPLETE_HOURS)
    result = await db.execute(
        update(ServiceResponse)
        .where(
            ServiceResponse.status == "work_submitted",
            ServiceResponse.work_submitted_at.is_not(None),
            ServiceResponse.work_submitted_at <= cutoff,
        )
        .values(
            status="completed",
            completed_at=now,
            status_note="Завершено автоматически: заказчик не открыл спор в течение 72 часов",
        )
    )
    if result.rowcount:
        await db.commit()


async def _reviewed_response_ids(db: AsyncSession, user_id: int, response_ids: list[int]) -> set[int]:
    if not response_ids:
        return set()
    result = await db.execute(
        select(Review.response_id).where(
            Review.author_id == user_id,
            Review.response_id.in_(response_ids),
        )
    )
    return {row[0] for row in result.all() if row[0] is not None}


def _to_response_read(item: ServiceResponse, current_user: User, review_left: bool = False) -> ResponseRead:
    data = ResponseRead.model_validate(item)
    customer_id, performer_id = _deal_roles(item)
    is_customer = current_user.id == customer_id
    is_performer = current_user.id == performer_id
    is_participant = is_customer or is_performer

    data.can_accept = item.service.owner_id == current_user.id and item.status == "new"
    data.can_submit_work = is_performer and item.status in {"accepted", "revision_requested"}
    data.can_confirm = is_customer and item.status == "work_submitted"
    data.can_request_revision = is_customer and item.status == "work_submitted"
    data.can_dispute = is_participant and item.status in {"accepted", "work_submitted", "revision_requested"}
    data.can_cancel = is_participant and item.status in {"new", "accepted"}
    if item.work_submitted_at:
        submitted_utc = item.work_submitted_at.replace(tzinfo=timezone.utc)
        data.completion_deadline = submitted_utc + timedelta(hours=AUTO_COMPLETE_HOURS)

    data.review_left = review_left
    data.can_review = is_participant and item.status == "completed" and not data.review_left
    if data.can_review:
        target = item.respondent if current_user.id == item.service.owner_id else item.service.owner
        data.review_target = UserBrief.model_validate(target)
        data.review_type = "performer" if is_customer else "customer"
    return data


async def _responses_payload(items: list[ServiceResponse], current_user: User, db: AsyncSession) -> list[ResponseRead]:
    reviewed_ids = await _reviewed_response_ids(db, current_user.id, [item.id for item in items])
    return [_to_response_read(item, current_user, item.id in reviewed_ids) for item in items]


async def _get_response(db: AsyncSession, *criteria, for_update: bool = False) -> ServiceResponse | None:
    stmt = select(ServiceResponse).options(*_response_options()).where(*criteria)
    if for_update:
        stmt = stmt.with_for_update()
    result = await db.execute(stmt)
    return result.unique().scalar_one_or_none()


@router.post("/services/{service_id}/responses", response_model=ApiResponse[ResponseRead], status_code=201)
async def create_response(
    service_id: int,
    body: ResponseCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _auto_complete_overdue(db)
    service = await db.scalar(
        select(Service)
        .where(Service.id == service_id, Service.is_active.is_(True), Service.status == "active")
        .with_for_update()
    )
    if not service:
        raise HTTPException(status_code=404, detail="Объявление не найдено")
    if service.owner_id == current_user.id:
        raise HTTPException(status_code=400, detail="Нельзя откликнуться на своё объявление")
    if await db.scalar(
        select(ServiceResponse.id).where(
            ServiceResponse.service_id == service_id,
            ServiceResponse.respondent_id == current_user.id,
            ServiceResponse.status.in_(ACTIVE_STATUSES),
        )
    ):
        raise HTTPException(status_code=409, detail="У вас уже есть активная сделка по этому объявлению")

    message = body.message.strip() if body.message else None
    response = ServiceResponse(service_id=service_id, respondent_id=current_user.id, message=message or None)
    db.add(response)
    await db.commit()
    response = await _get_response(db, ServiceResponse.id == response.id)
    return ApiResponse(message="Отклик отправлен", data=_to_response_read(response, current_user, False))


@router.get("/responses/sent", response_model=ApiResponse[list[ResponseRead]])
async def sent_responses(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    await _auto_complete_overdue(db)
    result = await db.execute(
        select(ServiceResponse)
        .options(*_response_options())
        .where(ServiceResponse.respondent_id == current_user.id)
        .order_by(ServiceResponse.created_at.desc())
    )
    items = result.unique().scalars().all()
    return ApiResponse(message="Исходящие отклики", data=await _responses_payload(items, current_user, db))


@router.get("/responses/received", response_model=ApiResponse[list[ResponseRead]])
async def received_responses(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    await _auto_complete_overdue(db)
    result = await db.execute(
        select(ServiceResponse)
        .join(Service)
        .options(*_response_options())
        .where(Service.owner_id == current_user.id)
        .order_by(ServiceResponse.created_at.desc())
    )
    items = result.unique().scalars().all()
    return ApiResponse(message="Входящие отклики", data=await _responses_payload(items, current_user, db))


@router.patch("/responses/{response_id}", response_model=ApiResponse[ResponseRead])
async def update_response(
    response_id: int,
    body: ResponseUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _auto_complete_overdue(db)
    item = await _get_response(db, ServiceResponse.id == response_id, for_update=True)
    if not item:
        raise HTTPException(status_code=404, detail="Отклик не найден")

    customer_id, performer_id = _deal_roles(item)
    is_customer = current_user.id == customer_id
    is_performer = current_user.id == performer_id
    if not is_customer and not is_performer:
        raise HTTPException(status_code=403, detail="Недостаточно прав")
    if item.status in FINAL_STATUSES:
        raise HTTPException(status_code=409, detail="Финальный статус нельзя изменить")
    if item.status == "disputed":
        raise HTTPException(status_code=409, detail="Спорную сделку может изменить только администратор")

    note = body.note.strip() if body.note else None
    now = _now()
    if body.status == "accepted":
        if item.service.owner_id != current_user.id or item.status != "new":
            raise HTTPException(status_code=403, detail="Принять новый отклик может только автор объявления")
        if item.service.listing_type == "request":
            active_deal = await db.scalar(
                select(ServiceResponse.id).where(
                    ServiceResponse.service_id == item.service_id,
                    ServiceResponse.status.in_(("accepted", "work_submitted", "revision_requested", "disputed")),
                    ServiceResponse.id != item.id,
                )
            )
            if active_deal:
                raise HTTPException(status_code=409, detail="Для этого задания уже выбран исполнитель")
            await db.execute(
                update(ServiceResponse)
                .where(
                    ServiceResponse.service_id == item.service_id,
                    ServiceResponse.status == "new",
                    ServiceResponse.id != item.id,
                )
                .values(status="declined")
            )
        item.status_note = None
    elif body.status == "work_submitted":
        if not is_performer or item.status not in {"accepted", "revision_requested"}:
            raise HTTPException(status_code=403, detail="Сообщить о выполнении может только исполнитель активной сделки")
        item.work_submitted_at = now
        item.status_note = note
    elif body.status == "completed":
        if not is_customer or item.status != "work_submitted":
            raise HTTPException(status_code=403, detail="Принять выполненную работу может только заказчик")
        item.completed_at = now
        item.status_note = note
    elif body.status == "revision_requested":
        if not is_customer or item.status != "work_submitted":
            raise HTTPException(status_code=403, detail="Вернуть работу на доработку может только заказчик")
        if not note or len(note) < 3:
            raise HTTPException(status_code=400, detail="Опишите, что необходимо исправить")
        item.work_submitted_at = None
        item.status_note = note
    elif body.status == "disputed":
        if item.status not in {"accepted", "work_submitted", "revision_requested"}:
            raise HTTPException(status_code=409, detail="Для этой сделки нельзя открыть спор")
        if not note or len(note) < 10:
            raise HTTPException(status_code=400, detail="Опишите причину спора минимум в 10 символах")
        item.status_note = note
    elif body.status == "declined":
        if item.service.owner_id != current_user.id or item.status != "new":
            raise HTTPException(status_code=403, detail="Отклонить новый отклик может только автор объявления")
        item.status_note = note
    elif body.status == "cancelled":
        if item.status not in {"new", "accepted"}:
            raise HTTPException(status_code=409, detail="После отправки результата используйте спор")
        item.status_note = note

    item.status = body.status
    await db.commit()
    item = await _get_response(db, ServiceResponse.id == item.id)
    review_left = bool(
        await db.scalar(select(Review.id).where(Review.author_id == current_user.id, Review.response_id == item.id))
    )
    return ApiResponse(message="Статус сделки обновлён", data=_to_response_read(item, current_user, review_left))


@router.get("/admin/responses/disputed", response_model=ApiResponse[list[ResponseRead]], tags=["admin"])
async def disputed_responses(admin: User = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(ServiceResponse)
        .options(*_response_options())
        .where(ServiceResponse.status == "disputed")
        .order_by(ServiceResponse.updated_at.desc())
    )
    items = result.unique().scalars().all()
    return ApiResponse(message="Спорные сделки", data=await _responses_payload(items, admin, db))


@router.patch("/admin/responses/{response_id}", response_model=ApiResponse[ResponseRead], tags=["admin"])
async def resolve_disputed_response(
    response_id: int,
    body: AdminResponseResolution,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    item = await _get_response(db, ServiceResponse.id == response_id, for_update=True)
    if not item:
        raise HTTPException(status_code=404, detail="Сделка не найдена")
    if item.status != "disputed":
        raise HTTPException(status_code=409, detail="Решение доступно только для спорной сделки")
    item.status = body.status
    item.status_note = f"Решение модератора: {body.note.strip()}"
    if body.status == "completed":
        item.completed_at = _now()
    if body.status == "revision_requested":
        item.work_submitted_at = None
    await db.commit()
    item = await _get_response(db, ServiceResponse.id == item.id)
    review_left = bool(await db.scalar(select(Review.id).where(Review.author_id == admin.id, Review.response_id == item.id)))
    return ApiResponse(message="Спор разрешён", data=_to_response_read(item, admin, review_left))


async def _target_exists(db: AsyncSession, target_type: str, target_id: int) -> bool:
    models = {"service": Service, "user": User, "review": Review}
    return await db.scalar(select(models[target_type].id).where(models[target_type].id == target_id)) is not None


@router.post("/reports", response_model=ApiResponse[ReportRead], status_code=201)
async def create_report(
    body: ReportCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not await _target_exists(db, body.target_type, body.target_id):
        raise HTTPException(status_code=404, detail="Объект жалобы не найден")
    if body.target_type == "user" and body.target_id == current_user.id:
        raise HTTPException(status_code=400, detail="Нельзя пожаловаться на собственный профиль")
    if body.target_type == "service" and await db.scalar(
        select(Service.id).where(Service.id == body.target_id, Service.owner_id == current_user.id)
    ):
        raise HTTPException(status_code=400, detail="Нельзя пожаловаться на собственное объявление")
    if body.target_type == "review" and await db.scalar(
        select(Review.id).where(Review.id == body.target_id, Review.author_id == current_user.id)
    ):
        raise HTTPException(status_code=400, detail="Нельзя пожаловаться на собственный отзыв")
    comment = body.comment.strip() if body.comment else None
    if body.reason == "other" and (not comment or len(comment) < 10):
        raise HTTPException(status_code=400, detail="Для другой причины добавьте комментарий минимум из 10 символов")
    duplicate = await db.scalar(
        select(Report.id).where(
            Report.reporter_id == current_user.id,
            Report.target_type == body.target_type,
            Report.target_id == body.target_id,
            Report.status.in_(("new", "reviewed")),
        )
    )
    if duplicate:
        raise HTTPException(status_code=409, detail="Ваша жалоба уже принята и находится на рассмотрении")
    report = Report(reporter_id=current_user.id, target_type=body.target_type, target_id=body.target_id, reason=body.reason, comment=comment)
    db.add(report)
    await db.commit()
    report = await db.scalar(select(Report).options(joinedload(Report.reporter)).where(Report.id == report.id))
    return ApiResponse(message="Жалоба отправлена", data=ReportRead.model_validate(report))


@router.get("/admin/reports", response_model=ApiResponse[list[ReportRead]], tags=["admin"])
async def list_reports(_: User = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Report).options(joinedload(Report.reporter)).order_by(Report.created_at.desc()))
    reports = result.unique().scalars().all()
    return ApiResponse(message="Список жалоб", data=[ReportRead.model_validate(item) for item in reports])


@router.patch("/admin/reports/{report_id}", response_model=ApiResponse[ReportRead], tags=["admin"])
async def update_report(
    report_id: int,
    body: ReportUpdate,
    _: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    report = await db.scalar(select(Report).options(joinedload(Report.reporter)).where(Report.id == report_id))
    if not report:
        raise HTTPException(status_code=404, detail="Жалоба не найдена")
    report.status = body.status
    await db.commit()
    report = await db.scalar(select(Report).options(joinedload(Report.reporter)).where(Report.id == report.id))
    return ApiResponse(message="Жалоба обработана", data=ReportRead.model_validate(report))
