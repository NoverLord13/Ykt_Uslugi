from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from database import get_db
from dependencies import get_current_user, require_admin
from models.response import Report, ServiceResponse
from models.review import Review
from models.service import Service
from models.user import User
from schemas.common import ApiResponse
from schemas.response import ReportCreate, ReportRead, ReportUpdate, ResponseCreate, ResponseRead, ResponseUpdate

router = APIRouter(tags=["responses"])


def _response_options():
    return (joinedload(ServiceResponse.respondent), joinedload(ServiceResponse.service).joinedload(Service.owner))


def _deal_roles(item: ServiceResponse) -> tuple[int, int]:
    """Return (customer_id, performer_id) for either listing direction."""
    if item.service.listing_type == "request":
        return item.service.owner_id, item.respondent_id
    return item.respondent_id, item.service.owner_id


def _to_response_read(item: ServiceResponse, current_user: User, db: Session) -> ResponseRead:
    data = ResponseRead.model_validate(item)
    _, performer_id = _deal_roles(item)
    data.can_accept = item.service.owner_id == current_user.id and item.status == "new"
    data.can_complete = current_user.id == performer_id and item.status == "accepted"
    data.can_cancel = current_user.id in {item.service.owner_id, item.respondent_id} and item.status in {"new", "accepted"}
    data.review_left = db.query(Review.id).filter(
        Review.author_id == current_user.id, Review.response_id == item.id
    ).first() is not None
    data.can_review = (
        current_user.id == performer_id
        and item.status == "completed"
        and not data.review_left
    )
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
        ServiceResponse.status.in_(("new", "accepted")),
    ).first():
        raise HTTPException(status_code=409, detail="У вас уже есть активный отклик. Новый можно отправить после завершения или отмены текущего")

    message = body.message.strip() if body.message else None
    response = ServiceResponse(service_id=service_id, respondent_id=current_user.id, message=message or None)
    db.add(response)
    db.commit()
    response = db.query(ServiceResponse).options(*_response_options()).filter(ServiceResponse.id == response.id).one()
    return ApiResponse(message="Отклик отправлен", data=_to_response_read(response, current_user, db))


@router.get("/responses/sent", response_model=ApiResponse[list[ResponseRead]])
def sent_responses(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    items = db.query(ServiceResponse).options(*_response_options()).filter(
        ServiceResponse.respondent_id == current_user.id
    ).order_by(ServiceResponse.created_at.desc()).all()
    return ApiResponse(message="Исходящие отклики", data=[_to_response_read(item, current_user, db) for item in items])


@router.get("/responses/received", response_model=ApiResponse[list[ResponseRead]])
def received_responses(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    items = db.query(ServiceResponse).join(Service).options(*_response_options()).filter(
        Service.owner_id == current_user.id
    ).order_by(ServiceResponse.created_at.desc()).all()
    return ApiResponse(message="Входящие отклики", data=[_to_response_read(item, current_user, db) for item in items])


@router.patch("/responses/{response_id}", response_model=ApiResponse[ResponseRead])
def update_response(
    response_id: int,
    body: ResponseUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    item = db.query(ServiceResponse).options(*_response_options()).filter(ServiceResponse.id == response_id).with_for_update().first()
    if not item:
        raise HTTPException(status_code=404, detail="Отклик не найден")

    is_owner = item.service.owner_id == current_user.id
    is_respondent = item.respondent_id == current_user.id
    if not is_owner and not is_respondent:
        raise HTTPException(status_code=403, detail="Недостаточно прав")
    if item.status in {"completed", "cancelled", "declined"}:
        raise HTTPException(status_code=409, detail="Финальный статус нельзя изменить")

    _, performer_id = _deal_roles(item)
    if body.status == "accepted":
        if not is_owner:
            raise HTTPException(status_code=403, detail="Принять отклик может только автор объявления")
        if item.status != "new":
            raise HTTPException(status_code=409, detail="Принять можно только новый отклик")
        if item.service.listing_type == "request":
            active_deal = db.query(ServiceResponse.id).filter(
                ServiceResponse.service_id == item.service_id,
                ServiceResponse.status == "accepted",
                ServiceResponse.id != item.id,
            ).first()
            if active_deal:
                raise HTTPException(status_code=409, detail="Для этого задания уже выбран исполнитель")
            db.query(ServiceResponse).filter(
                ServiceResponse.service_id == item.service_id,
                ServiceResponse.status == "new",
                ServiceResponse.id != item.id,
            ).update({ServiceResponse.status: "declined"}, synchronize_session=False)
    elif body.status == "completed":
        if current_user.id != performer_id:
            raise HTTPException(status_code=403, detail="Подтвердить выполнение может только выбранный исполнитель")
        if item.status != "accepted":
            raise HTTPException(status_code=409, detail="Завершить можно только принятую сделку")
    elif body.status == "declined":
        if not is_owner or item.status != "new":
            raise HTTPException(status_code=403, detail="Отклонить новый отклик может только автор объявления")
    elif body.status == "cancelled":
        if item.status not in {"new", "accepted"}:
            raise HTTPException(status_code=409, detail="Эту сделку уже нельзя отменить")

    item.status = body.status
    db.commit()
    db.refresh(item)
    return ApiResponse(message="Статус отклика обновлён", data=_to_response_read(item, current_user, db))


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
def list_reports(_: User = Depends(require_admin), db: Session = Depends(get_db)):
    reports = db.query(Report).options(joinedload(Report.reporter)).order_by(Report.created_at.desc()).all()
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
