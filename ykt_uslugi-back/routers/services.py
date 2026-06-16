from decimal import Decimal

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.orm import Session, joinedload, selectinload

from database import get_db
from dependencies import get_current_user
from models.service import Service
from models.service import Tag
from models.user import User
from schemas.common import ApiResponse, ServiceRead, TagRead
from schemas.service import ServiceUpdate
from services.files import save_upload

router = APIRouter(prefix="/services", tags=["services"])


def _to_service_read(service: Service) -> ServiceRead:
    return ServiceRead.model_validate(service)


@router.get("", response_model=ApiResponse[list[ServiceRead]])
def list_services(db: Session = Depends(get_db)):
    services = (
        db.query(Service)
        .options(joinedload(Service.owner))
        .filter(Service.is_active.is_(True))
        .order_by(Service.created_at.desc())
        .all()
    )
    return ApiResponse(
        message="Список услуг",
        data=[_to_service_read(s) for s in services],
    )


@router.get("/mine", response_model=ApiResponse[list[ServiceRead]])
def list_my_services(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    services = (
        db.query(Service)
        .options(joinedload(Service.owner))
        .filter(Service.owner_id == current_user.id)
        .order_by(Service.created_at.desc())
        .all()
    )
    return ApiResponse(
        message="Ваши услуги",
        data=[_to_service_read(s) for s in services],
    )

@router.get("/tags", response_model=ApiResponse[list[TagRead]])
def get_all_tags(db: Session = Depends(get_db)):
    tags = db.query(Tag).all()
    # Форматируем список через Pydantic
    tags_data = [TagRead(id=t.id, name=t.name) for t in tags]
    return ApiResponse(message="Список тегов получен", data=tags_data)

@router.get("/{service_id}", response_model=ApiResponse[ServiceRead])
def get_service(service_id: int, db: Session = Depends(get_db)):
    service = (
        db.query(Service)
        .options(joinedload(Service.owner))
        .filter(Service.id == service_id, Service.is_active.is_(True))
        .first()
    )
    if not service:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Услуга не найдена")
    return ApiResponse(message="Услуга найдена", data=_to_service_read(service))


@router.post("", response_model=ApiResponse[ServiceRead], status_code=status.HTTP_201_CREATED)
async def create_service(
    title: str = Form(..., min_length=1, max_length=200),
    description: str = Form(..., min_length=1, max_length=5000),
    price: Decimal = Form(..., ge=0),
    image: UploadFile = File(...),
    # Принимаем список ID тегов из формы:
    tag_ids: list[int] = Form([]), 
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # 1. Получаем объекты тегов из базы данных по переданным ID
    selected_tags = []
    if tag_ids:
        selected_tags = db.query(Tag).filter(Tag.id.in_(tag_ids)).all()

    # 2. Сохраняем картинку услуги
    image_url = await save_upload(image)
    
    # 3. Создаем услугу и передаем список объектов тегов в поле tags
    service = Service(
        owner_id=current_user.id,
        title=title,
        description=description,
        price=price,
        image_url=image_url,
        tags=selected_tags  # SQLAlchemy автоматически заполнит таблицу связи!
    )
    db.add(service)
    db.commit()
    db.refresh(service)
    
    # 4. Загружаем услугу заново, подтягивая и автора (joinedload), и теги (selectinload)
    service = (
        db.query(Service)
        .options(
            joinedload(Service.owner),
            selectinload(Service.tags)
        )
        .filter(Service.id == service.id)
        .first()
    )
    
    return ApiResponse(message="Услуга создана", data=_to_service_read(service))


@router.put("/{service_id}", response_model=ApiResponse[ServiceRead])
async def update_service(
    service_id: int,
    title: str | None = Form(None),
    description: str | None = Form(None),
    price: Decimal | None = Form(None),
    image: UploadFile | None = File(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = db.query(Service).options(joinedload(Service.owner)).filter(Service.id == service_id).first()
    if not service:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Услуга не найдена")
    if service.owner_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Можно редактировать только свои услуги")

    if title is not None:
        service.title = title
    if description is not None:
        service.description = description
    if price is not None:
        service.price = price
    if image is not None:
        service.image_url = await save_upload(image)

    db.commit()
    db.refresh(service)
    service = db.query(Service).options(joinedload(Service.owner)).filter(Service.id == service.id).first()
    return ApiResponse(message="Услуга обновлена", data=_to_service_read(service))


@router.delete("/{service_id}", response_model=ApiResponse[None])
def delete_service(
    service_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = db.query(Service).filter(Service.id == service_id).first()
    if not service:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Услуга не найдена")
    if service.owner_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Можно удалять только свои услуги")

    db.delete(service)
    db.commit()
    return ApiResponse(message="Услуга удалена")


