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


@router.post("/services/{service_id}/responses", response_model=ApiResponse[ResponseRead], status_code=201)
def create_response(
    service_id: int,
    body: ResponseCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = db.query(Service).filter(
        Service.id == service_id, Service.is_active.is_(True), Service.status == "active"
    ).first()
    if not service:
        raise HTTPException(status_code=404, detail="Объявление не найдено")
    if service.owner_id == current_user.id:
        raise HTTPException(status_code=400, detail="Нельзя откликнуться на своё объявление")
    if db.query(ServiceResponse).filter(
        ServiceResponse.service_id == service_id, ServiceResponse.respondent_id == current_user.id
    ).first():
        raise HTTPException(status_code=409, detail="Вы уже откликались на это объявление")

    response = ServiceResponse(service_id=service_id, respondent_id=current_user.id, message=body.message)
    db.add(response)
    db.commit()
    response = db.query(ServiceResponse).options(*_response_options()).filter(ServiceResponse.id == response.id).one()
    return ApiResponse(message="Отклик отправлен", data=ResponseRead.model_validate(response))


@router.get("/responses/sent", response_model=ApiResponse[list[ResponseRead]])
def sent_responses(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    items = db.query(ServiceResponse).options(*_response_options()).filter(
        ServiceResponse.respondent_id == current_user.id
    ).order_by(ServiceResponse.created_at.desc()).all()
    return ApiResponse(message="Исходящие отклики", data=[ResponseRead.model_validate(item) for item in items])


@router.get("/responses/received", response_model=ApiResponse[list[ResponseRead]])
def received_responses(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    items = db.query(ServiceResponse).join(Service).options(*_response_options()).filter(
        Service.owner_id == current_user.id
    ).order_by(ServiceResponse.created_at.desc()).all()
    return ApiResponse(message="Входящие отклики", data=[ResponseRead.model_validate(item) for item in items])


@router.patch("/responses/{response_id}", response_model=ApiResponse[ResponseRead])
def update_response(
    response_id: int,
    body: ResponseUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    item = db.query(ServiceResponse).options(*_response_options()).filter(ServiceResponse.id == response_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Отклик не найден")

    is_owner = item.service.owner_id == current_user.id
    is_respondent = item.respondent_id == current_user.id
    if not is_owner and not is_respondent:
        raise HTTPException(status_code=403, detail="Недостаточно прав")
    if item.status in {"completed", "cancelled"}:
        raise HTTPException(status_code=409, detail="Финальный статус нельзя изменить")
    if is_respondent and body.status != "cancelled":
        raise HTTPException(status_code=403, detail="Автор отклика может только отменить его")
    if is_owner and body.status == "completed" and item.status != "accepted":
        raise HTTPException(status_code=409, detail="Сначала примите отклик")
    if is_owner and body.status == "accepted" and item.status != "new":
        raise HTTPException(status_code=409, detail="Принять можно только новый отклик")

    item.status = body.status
    db.commit()
    db.refresh(item)
    return ApiResponse(message="Статус отклика обновлён", data=ResponseRead.model_validate(item))


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
    report = Report(reporter_id=current_user.id, **body.model_dump())
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
