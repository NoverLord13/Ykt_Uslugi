from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload

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
from services.deals import ACTIVE_STATUSES, AUTO_COMPLETE_HOURS, DealTransitionError, apply_transition, deal_roles, utc_from_storage, utc_now_naive

router = APIRouter(tags=["responses"])


def _response_options():
    return (joinedload(ServiceResponse.respondent), joinedload(ServiceResponse.service).joinedload(Service.owner))


def _deal_roles(item: ServiceResponse) -> tuple[int, int]:
    return deal_roles(item)


def _reviewed_response_ids(db: Session, user_id: int, response_ids: list[int]) -> set[int]:
    if not response_ids:
        return set()
    rows = db.query(Review.response_id).filter(
        Review.author_id == user_id,
        Review.response_id.in_(response_ids),
    ).all()
    return {response_id for (response_id,) in rows if response_id is not None}


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
        submitted_utc = utc_from_storage(item.work_submitted_at)
        data.completion_deadline = submitted_utc + timedelta(hours=AUTO_COMPLETE_HOURS)

    data.review_left = review_left
    data.can_review = is_participant and item.status == "completed" and not data.review_left
    if data.can_review:
        target = item.respondent if current_user.id == item.service.owner_id else item.service.owner
        data.review_target = UserBrief.model_validate(target)
        data.review_type = "performer" if is_customer else "customer"
    return data


@router.post("/services/{service_id}/responses", response_model=ApiResponse[ResponseRead], status_code=201)
def create_response(
    service_id: int,
    body: ResponseCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = db.query(Service).filter(
        Service.id == service_id, Service.is_active.is_(True), Service.status == "active"
    ).with_for_update().first()
    if not service:
        raise HTTPException(status_code=404, detail="Объявление не найдено")
    if service.owner_id == current_user.id:
        raise HTTPException(status_code=400, detail="Нельзя откликнуться на своё объявление")
    if db.query(ServiceResponse).filter(
        ServiceResponse.service_id == service_id,
        ServiceResponse.respondent_id == current_user.id,
        ServiceResponse.status.in_(ACTIVE_STATUSES),
    ).first():
        raise HTTPException(status_code=409, detail="У вас уже есть активная сделка по этому объявлению")

    message = body.message.strip() if body.message else None
    response = ServiceResponse(service_id=service_id, respondent_id=current_user.id, message=message or None)
    db.add(response)
    db.commit()
    response = db.query(ServiceResponse).options(*_response_options()).filter(ServiceResponse.id == response.id).one()
    return ApiResponse(message="Отклик отправлен", data=_to_response_read(response, current_user))


@router.get("/services/{service_id}/my-response", response_model=ApiResponse[ResponseRead | None])
def get_my_active_response(
    service_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    item = db.query(ServiceResponse).options(*_response_options()).filter(
        ServiceResponse.service_id == service_id,
        ServiceResponse.respondent_id == current_user.id,
        ServiceResponse.status.in_(ACTIVE_STATUSES),
    ).order_by(ServiceResponse.updated_at.desc()).first()
    if not item:
        return ApiResponse(message="Активный отклик отсутствует", data=None)
    reviewed_ids = _reviewed_response_ids(db, current_user.id, [item.id])
    return ApiResponse(message="Активный отклик", data=_to_response_read(item, current_user, item.id in reviewed_ids))


@router.get("/responses/sent", response_model=ApiResponse[list[ResponseRead]])
def sent_responses(skip: int = Query(0, ge=0), limit: int = Query(50, ge=1, le=100), current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    items = db.query(ServiceResponse).options(*_response_options()).filter(
        ServiceResponse.respondent_id == current_user.id
    ).order_by(ServiceResponse.created_at.desc()).offset(skip).limit(limit).all()
    reviewed_ids = _reviewed_response_ids(db, current_user.id, [item.id for item in items])
    return ApiResponse(message="Исходящие отклики", data=[
        _to_response_read(item, current_user, item.id in reviewed_ids) for item in items
    ])


@router.get("/responses/received", response_model=ApiResponse[list[ResponseRead]])
def received_responses(skip: int = Query(0, ge=0), limit: int = Query(50, ge=1, le=100), current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    items = db.query(ServiceResponse).join(Service).options(*_response_options()).filter(
        Service.owner_id == current_user.id
    ).order_by(ServiceResponse.created_at.desc()).offset(skip).limit(limit).all()
    reviewed_ids = _reviewed_response_ids(db, current_user.id, [item.id for item in items])
    return ApiResponse(message="Входящие отклики", data=[
        _to_response_read(item, current_user, item.id in reviewed_ids) for item in items
    ])


@router.patch("/responses/{response_id}", response_model=ApiResponse[ResponseRead])
def update_response(
    response_id: int,
    body: ResponseUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    item = db.query(ServiceResponse).options(*_response_options()).filter(
        ServiceResponse.id == response_id
    ).with_for_update().first()
    if not item:
        raise HTTPException(status_code=404, detail="Отклик не найден")

    note = body.note.strip() if body.note else None
    try:
        apply_transition(db, item, user_id=current_user.id, next_status=body.status, note=note)
    except DealTransitionError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc
    db.commit()
    item = db.query(ServiceResponse).options(*_response_options()).filter(ServiceResponse.id == item.id).one()
    reviewed_ids = _reviewed_response_ids(db, current_user.id, [item.id])
    return ApiResponse(message="Статус сделки обновлён", data=_to_response_read(item, current_user, item.id in reviewed_ids))


@router.get("/admin/responses/disputed", response_model=ApiResponse[list[ResponseRead]], tags=["admin"])
def disputed_responses(skip: int = Query(0, ge=0), limit: int = Query(50, ge=1, le=100), admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    items = db.query(ServiceResponse).options(*_response_options()).filter(
        ServiceResponse.status == "disputed"
    ).order_by(ServiceResponse.updated_at.desc()).offset(skip).limit(limit).all()
    return ApiResponse(message="Спорные сделки", data=[_to_response_read(item, admin) for item in items])


@router.patch("/admin/responses/{response_id}", response_model=ApiResponse[ResponseRead], tags=["admin"])
def resolve_disputed_response(
    response_id: int,
    body: AdminResponseResolution,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    item = db.query(ServiceResponse).options(*_response_options()).filter(
        ServiceResponse.id == response_id
    ).with_for_update().first()
    if not item:
        raise HTTPException(status_code=404, detail="Сделка не найдена")
    if item.status != "disputed":
        raise HTTPException(status_code=409, detail="Решение доступно только для спорной сделки")
    item.status = body.status
    item.status_note = f"Решение модератора: {body.note.strip()}"
    if body.status == "completed":
        item.completed_at = utc_now_naive()
    if body.status == "revision_requested":
        item.work_submitted_at = None
    db.commit()
    item = db.query(ServiceResponse).options(*_response_options()).filter(ServiceResponse.id == item.id).one()
    return ApiResponse(message="Спор разрешён", data=_to_response_read(item, admin))


def _target_exists(db: Session, target_type: str, target_id: int) -> bool:
    models = {"service": Service, "user": User, "review": Review}
    return db.query(models[target_type]).filter(models[target_type].id == target_id).first() is not None


@router.post("/reports", response_model=ApiResponse[ReportRead], status_code=201)
def create_report(
    body: ReportCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not _target_exists(db, body.target_type, body.target_id):
        raise HTTPException(status_code=404, detail="Объект жалобы не найден")
    if body.target_type == "user" and body.target_id == current_user.id:
        raise HTTPException(status_code=400, detail="Нельзя пожаловаться на собственный профиль")
    if body.target_type == "service" and db.query(Service.id).filter(
        Service.id == body.target_id, Service.owner_id == current_user.id
    ).first():
        raise HTTPException(status_code=400, detail="Нельзя пожаловаться на собственное объявление")
    if body.target_type == "review" and db.query(Review.id).filter(
        Review.id == body.target_id, Review.author_id == current_user.id
    ).first():
        raise HTTPException(status_code=400, detail="Нельзя пожаловаться на собственный отзыв")
    comment = body.comment.strip() if body.comment else None
    if body.reason == "other" and (not comment or len(comment) < 10):
        raise HTTPException(status_code=400, detail="Для другой причины добавьте комментарий минимум из 10 символов")
    duplicate = db.query(Report.id).filter(
        Report.reporter_id == current_user.id,
        Report.target_type == body.target_type,
        Report.target_id == body.target_id,
        Report.status.in_(("new", "reviewed")),
    ).first()
    if duplicate:
        raise HTTPException(status_code=409, detail="Ваша жалоба уже принята и находится на рассмотрении")
    report = Report(reporter_id=current_user.id, target_type=body.target_type, target_id=body.target_id, reason=body.reason, comment=comment)
    db.add(report)
    db.commit()
    db.refresh(report)
    return ApiResponse(message="Жалоба отправлена", data=ReportRead.model_validate(report))


@router.get("/admin/reports", response_model=ApiResponse[list[ReportRead]], tags=["admin"])
def list_reports(skip: int = Query(0, ge=0), limit: int = Query(50, ge=1, le=100), _: User = Depends(require_admin), db: Session = Depends(get_db)):
    reports = db.query(Report).options(joinedload(Report.reporter)).order_by(Report.created_at.desc()).offset(skip).limit(limit).all()
    return ApiResponse(message="Список жалоб", data=[ReportRead.model_validate(item) for item in reports])


@router.patch("/admin/reports/{report_id}", response_model=ApiResponse[ReportRead], tags=["admin"])
def update_report(
    report_id: int,
    body: ReportUpdate,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    report = db.query(Report).options(joinedload(Report.reporter)).filter(Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Жалоба не найдена")
    report.status = body.status
    db.commit()
    db.refresh(report)
    return ApiResponse(message="Жалоба обработана", data=ReportRead.model_validate(report))
