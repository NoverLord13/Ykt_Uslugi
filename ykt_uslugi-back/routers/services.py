from decimal import Decimal

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
from sqlalchemy import or_
from sqlalchemy.orm import Session, joinedload, selectinload

from core.domain_types import ListingType, PriceType, ServiceSort, ServiceStatus
from database import get_db
from dependencies import get_current_user, get_optional_user
from models.response import ServiceResponse
from models.service import Category, Service, ServiceImage
from models.user import User
from schemas.common import ApiResponse, ServiceRead
from services.files import delete_upload, save_uploads
from services.listings import ListingValidationError, apply_service_update, collect_uploads, normalize_price, validate_category_pair
from services.reports import delete_target_reports

router = APIRouter(prefix="/services", tags=["services"])


def _to_service_read(service: Service) -> ServiceRead:
    return ServiceRead.model_validate(service)


def _service_load_options():
    return (
        joinedload(Service.owner),
        joinedload(Service.category).selectinload(Category.subcategories),
        joinedload(Service.subcategory),
        selectinload(Service.images),
    )


@router.get("", response_model=ApiResponse[list[ServiceRead]])
def list_services(
    q: str | None = Query(None, min_length=1, max_length=200),
    listing_type: ListingType | None = None,
    category_id: int | None = None,
    subcategory_id: int | None = None,
    min_price: Decimal | None = Query(None, ge=0),
    max_price: Decimal | None = Query(None, ge=0),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    sort: ServiceSort = "newest",
    db: Session = Depends(get_db),
):
    if min_price is not None and max_price is not None and min_price > max_price:
        raise HTTPException(status_code=400, detail="Минимальная цена не может быть больше максимальной")
    query = (
        db.query(Service)
        .options(*_service_load_options())
        .filter(Service.is_active.is_(True), Service.status == "active")
    )

    if q:
        search = f"%{q}%"
        query = query.filter(or_(Service.title.ilike(search), Service.description.ilike(search)))
    if listing_type:
        query = query.filter(Service.listing_type == listing_type)
    if category_id is not None:
        query = query.filter(Service.category_id == category_id)
    if subcategory_id is not None:
        query = query.filter(Service.subcategory_id == subcategory_id)
    if min_price is not None:
        query = query.filter(Service.price >= min_price)
    if max_price is not None:
        query = query.filter(Service.price <= max_price)

    if sort == "oldest":
        query = query.order_by(Service.created_at.asc())
    elif sort == "price_asc":
        query = query.order_by(Service.price.asc())
    elif sort == "price_desc":
        query = query.order_by(Service.price.desc())
    else:
        query = query.order_by(Service.created_at.desc())

    services = query.offset(skip).limit(limit).all()
    return ApiResponse(
        message="Список услуг",
        data=[_to_service_read(s) for s in services],
    )


@router.get("/mine", response_model=ApiResponse[list[ServiceRead]])
def list_my_services(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    services = (
        db.query(Service)
        .options(*_service_load_options())
        .filter(Service.owner_id == current_user.id)
        .order_by(Service.created_at.desc())
        .all()
    )
    return ApiResponse(
        message="Ваши услуги",
        data=[_to_service_read(s) for s in services],
    )


@router.get("/manage/{service_id}", response_model=ApiResponse[ServiceRead])
def get_my_service(service_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    service = db.query(Service).options(*_service_load_options()).filter(
        Service.id == service_id, Service.owner_id == current_user.id
    ).first()
    if not service:
        raise HTTPException(status_code=404, detail="Объявление не найдено или принадлежит другому пользователю")
    return ApiResponse(message="Объявление владельца", data=_to_service_read(service))

@router.get("/{service_id}", response_model=ApiResponse[ServiceRead])
def get_service(service_id: int, current_user: User | None = Depends(get_optional_user), db: Session = Depends(get_db)):
    service = (
        db.query(Service)
        .options(*_service_load_options())
        .filter(Service.id == service_id)
        .first()
    )
    if not service:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Услуга не найдена")
    has_access = service.is_active and service.status == "active"
    if current_user and service.owner_id == current_user.id:
        has_access = True
    if current_user and db.query(ServiceResponse.id).filter(
        ServiceResponse.service_id == service.id,
        ServiceResponse.respondent_id == current_user.id,
    ).first():
        has_access = True
    if not has_access:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Объявление больше не опубликовано")
    return ApiResponse(message="Услуга найдена", data=_to_service_read(service))


@router.post("", response_model=ApiResponse[ServiceRead], status_code=status.HTTP_201_CREATED)
async def create_service(
    title: str = Form(..., min_length=1, max_length=200),
    description: str = Form(..., min_length=1, max_length=5000),
    price: Decimal | None = Form(None, ge=0),
    listing_type: ListingType = Form("offer"),
    category_id: int | None = Form(None),
    subcategory_id: int | None = Form(None),
    location: str | None = Form(None, max_length=200),
    price_type: PriceType = Form("fixed"),
    contact_phone: str | None = Form(None, max_length=20),
    image: UploadFile | None = File(None),
    images: list[UploadFile] | None = File(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    title = title.strip()
    description = description.strip()
    if not title or not description:
        raise HTTPException(status_code=400, detail="Название и описание не могут состоять из пробелов")
    try:
        validate_category_pair(db, category_id, subcategory_id)
        price = normalize_price(price_type, price)
        upload_files = collect_uploads(image, images)
    except ListingValidationError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc

    image_urls = await save_uploads(upload_files)
    image_url = image_urls[0] if image_urls else None

    service = Service(
        owner_id=current_user.id,
        title=title,
        description=description,
        price=price,
        listing_type=listing_type,
        category_id=category_id,
        subcategory_id=subcategory_id,
        location=location,
        price_type=price_type,
        contact_phone=contact_phone or current_user.phone_number,
        image_url=image_url,
        images=[ServiceImage(url=url, position=index) for index, url in enumerate(image_urls)],
    )
    db.add(service)
    try:
        db.commit()
    except Exception:
        db.rollback()
        for url in image_urls:
            delete_upload(url)
        raise
    db.refresh(service)
    
    service = (
        db.query(Service)
        .options(*_service_load_options())
        .filter(Service.id == service.id)
        .first()
    )
    
    return ApiResponse(message="Услуга создана", data=_to_service_read(service))


@router.put("/{service_id}", response_model=ApiResponse[ServiceRead])
async def update_service(
    service_id: int,
    title: str | None = Form(None, min_length=1, max_length=200),
    description: str | None = Form(None, min_length=1, max_length=5000),
    price: Decimal | None = Form(None, ge=0),
    listing_type: ListingType | None = Form(None),
    category_id: int | None = Form(None),
    subcategory_id: int | None = Form(None),
    clear_category: bool = Form(False),
    clear_subcategory: bool = Form(False),
    location: str | None = Form(None, max_length=200),
    price_type: PriceType | None = Form(None),
    status_value: ServiceStatus | None = Form(None, alias="status"),
    contact_phone: str | None = Form(None, max_length=20),
    clear_images: bool = Form(False),
    image: UploadFile | None = File(None),
    images: list[UploadFile] | None = File(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = db.query(Service).options(*_service_load_options()).filter(Service.id == service_id).first()
    if not service:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Услуга не найдена")
    if service.owner_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Можно редактировать только свои услуги")

    try:
        apply_service_update(
            db,
            service,
            owner_phone=current_user.phone_number,
            title=title,
            description=description,
            price=price,
            listing_type=listing_type,
            category_id=category_id,
            subcategory_id=subcategory_id,
            clear_category=clear_category,
            clear_subcategory=clear_subcategory,
            location=location,
            price_type=price_type,
            status_value=status_value,
            contact_phone=contact_phone,
        )
        upload_files = collect_uploads(image, images)
    except ListingValidationError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc
    old_image_urls: set[str] = set()
    if upload_files or clear_images:
        old_image_urls = {stored_image.url for stored_image in service.images}
        if service.image_url:
            old_image_urls.add(service.image_url)
    if upload_files:
        image_urls = await save_uploads(upload_files)
        service.images = [ServiceImage(url=url, position=index) for index, url in enumerate(image_urls)]
        service.image_url = image_urls[0]
    elif clear_images:
        service.images = []
        service.image_url = None

    try:
        db.commit()
    except Exception:
        db.rollback()
        if upload_files:
            for url in image_urls:
                delete_upload(url)
        raise
    if upload_files or clear_images:
        for url in old_image_urls:
            if not upload_files or url not in image_urls:
                delete_upload(url)
    db.refresh(service)
    service = db.query(Service).options(*_service_load_options()).filter(Service.id == service.id).first()
    return ApiResponse(message="Услуга обновлена", data=_to_service_read(service))


@router.get("/{service_id}/similar", response_model=ApiResponse[list[ServiceRead]])
def get_similar_services(service_id: int, limit: int = Query(8, ge=1, le=20), db: Session = Depends(get_db)):
    service = db.query(Service).filter(Service.id == service_id, Service.is_active.is_(True)).first()
    if not service:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Услуга не найдена")

    base_query = (
        db.query(Service)
        .options(*_service_load_options())
        .filter(
            Service.id != service_id,
            Service.is_active.is_(True),
            Service.status == "active",
            Service.listing_type == service.listing_type,
        )
    )

    results = []
    if service.subcategory_id is not None:
        results = base_query.filter(Service.subcategory_id == service.subcategory_id).limit(limit).all()

    if len(results) < limit and service.category_id is not None:
        existing_ids = {item.id for item in results}
        category_results = (
            base_query
            .filter(Service.category_id == service.category_id, Service.id.notin_(existing_ids or {-1}))
            .limit(limit - len(results))
            .all()
        )
        results.extend(category_results)

    return ApiResponse(message="Похожие объявления", data=[_to_service_read(s) for s in results])


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

    active_deal = db.query(ServiceResponse.id).filter(
        ServiceResponse.service_id == service.id,
        ServiceResponse.status.in_(("accepted", "work_submitted", "revision_requested", "disputed")),
    ).first()
    if active_deal:
        raise HTTPException(status_code=409, detail="Нельзя удалить объявление с активной сделкой. Сначала завершите или отмените её")
    image_urls = {image.url for image in service.images}
    if service.image_url:
        image_urls.add(service.image_url)
    delete_target_reports(db, "service", service.id)
    db.delete(service)
    db.commit()
    for url in image_urls:
        delete_upload(url)
    return ApiResponse(message="Услуга удалена")
