from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from database import get_db
from dependencies import require_admin
from models.service import Service
from models.user import User
from schemas.common import ApiResponse, ServiceRead, UserRead
from schemas.service import AdminServiceUpdate, AdminUserUpdate

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/users", response_model=ApiResponse[list[UserRead]])
def list_users(_: User = Depends(require_admin), db: Session = Depends(get_db)):
    users = db.query(User).order_by(User.created_at.desc()).all()
    return ApiResponse(
        message="Список пользователей",
        data=[UserRead.model_validate(u) for u in users],
    )


@router.patch("/users/{user_id}", response_model=ApiResponse[UserRead])
def update_user(
    user_id: int,
    body: AdminUserUpdate,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Пользователь не найден")
    if user.id == admin.id and body.is_admin is False:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Нельзя снять права admin с себя")

    if body.is_active is not None:
        user.is_active = body.is_active
    if body.is_admin is not None:
        user.is_admin = body.is_admin

    db.commit()
    db.refresh(user)
    return ApiResponse(message="Пользователь обновлён", data=UserRead.model_validate(user))


@router.get("/services", response_model=ApiResponse[list[ServiceRead]])
def list_all_services(_: User = Depends(require_admin), db: Session = Depends(get_db)):
    services = (
        db.query(Service)
        .options(joinedload(Service.owner))
        .order_by(Service.created_at.desc())
        .all()
    )
    return ApiResponse(
        message="Список всех услуг",
        data=[ServiceRead.model_validate(s) for s in services],
    )


@router.patch("/services/{service_id}", response_model=ApiResponse[ServiceRead])
def moderate_service(
    service_id: int,
    body: AdminServiceUpdate,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    service = db.query(Service).options(joinedload(Service.owner)).filter(Service.id == service_id).first()
    if not service:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Услуга не найдена")

    if body.is_active is not None:
        service.is_active = body.is_active

    db.commit()
    db.refresh(service)
    service = db.query(Service).options(joinedload(Service.owner)).filter(Service.id == service.id).first()
    return ApiResponse(message="Услуга обновлена", data=ServiceRead.model_validate(service))


@router.delete("/services/{service_id}", response_model=ApiResponse[None])
def admin_delete_service(
    service_id: int,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    service = db.query(Service).filter(Service.id == service_id).first()
    if not service:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Услуга не найдена")

    db.delete(service)
    db.commit()
    return ApiResponse(message="Услуга удалена")
