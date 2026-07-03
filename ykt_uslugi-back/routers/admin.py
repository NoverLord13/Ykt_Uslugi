from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload, load_only, selectinload

from database import get_db
from dependencies import require_admin
from models.review import Review
from models.service import Category, Service, Subcategory
from models.user import User
from schemas.common import ApiResponse, CategoryRead, ReviewRead, ServiceRead, ServiceSummaryRead, SubcategoryRead, UserRead
from schemas.service import AdminServiceUpdate, AdminUserUpdate, CategoryCreate, CategoryUpdate, SubcategoryCreate, SubcategoryUpdate
from services.reports import delete_target_reports

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/users", response_model=ApiResponse[list[UserRead]])
def list_users(skip: int = Query(0, ge=0), limit: int = Query(50, ge=1, le=100), _: User = Depends(require_admin), db: Session = Depends(get_db)):
    users = db.query(User).order_by(User.created_at.desc()).offset(skip).limit(limit).all()
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


@router.get("/services", response_model=ApiResponse[list[ServiceSummaryRead]])
def list_all_services(skip: int = Query(0, ge=0), limit: int = Query(50, ge=1, le=100), _: User = Depends(require_admin), db: Session = Depends(get_db)):
    services = (
        db.query(Service)
        .options(
            load_only(Service.id, Service.owner_id, Service.title, Service.price, Service.listing_type, Service.category_id, Service.subcategory_id, Service.location, Service.price_type, Service.status, Service.image_url, Service.is_active, Service.created_at, Service.updated_at),
            joinedload(Service.owner),
            joinedload(Service.category),
            joinedload(Service.subcategory),
            selectinload(Service.images),
        )
        .order_by(Service.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    return ApiResponse(
        message="Список всех услуг",
        data=[ServiceSummaryRead.model_validate(s) for s in services],
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
    if body.status is not None:
        service.status = body.status
        service.is_active = body.status == "active"

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

    delete_target_reports(db, "service", service.id)
    db.delete(service)
    db.commit()
    return ApiResponse(message="Услуга удалена")


@router.get("/categories", response_model=ApiResponse[list[CategoryRead]])
def admin_list_categories(_: User = Depends(require_admin), db: Session = Depends(get_db)):
    categories = db.query(Category).options(selectinload(Category.subcategories)).order_by(Category.name.asc()).all()
    return ApiResponse(message="Список категорий", data=[CategoryRead.model_validate(c) for c in categories])


@router.post("/categories", response_model=ApiResponse[CategoryRead], status_code=status.HTTP_201_CREATED)
def admin_create_category(body: CategoryCreate, _: User = Depends(require_admin), db: Session = Depends(get_db)):
    if db.query(Category).filter(Category.slug == body.slug).first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Категория с таким slug уже существует")
    category = Category(name=body.name, slug=body.slug)
    db.add(category)
    db.commit()
    db.refresh(category)
    return ApiResponse(message="Категория создана", data=CategoryRead.model_validate(category))


@router.patch("/categories/{category_id}", response_model=ApiResponse[CategoryRead])
def admin_update_category(
    category_id: int,
    body: CategoryUpdate,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    category = db.query(Category).filter(Category.id == category_id).first()
    if not category:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Категория не найдена")
    if body.slug and db.query(Category).filter(Category.slug == body.slug, Category.id != category_id).first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Категория с таким slug уже существует")

    if body.name is not None:
        category.name = body.name
    if body.slug is not None:
        category.slug = body.slug
    db.commit()
    db.refresh(category)
    return ApiResponse(message="Категория обновлена", data=CategoryRead.model_validate(category))


@router.delete("/categories/{category_id}", response_model=ApiResponse[None])
def admin_delete_category(category_id: int, _: User = Depends(require_admin), db: Session = Depends(get_db)):
    category = db.query(Category).filter(Category.id == category_id).first()
    if not category:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Категория не найдена")
    if db.query(Service).filter(Service.category_id == category_id).first():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Категория используется в объявлениях")
    db.delete(category)
    db.commit()
    return ApiResponse(message="Категория удалена")


@router.post("/subcategories", response_model=ApiResponse[SubcategoryRead], status_code=status.HTTP_201_CREATED)
def admin_create_subcategory(body: SubcategoryCreate, _: User = Depends(require_admin), db: Session = Depends(get_db)):
    if not db.query(Category).filter(Category.id == body.category_id).first():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Категория не найдена")
    exists = db.query(Subcategory).filter(Subcategory.category_id == body.category_id, Subcategory.slug == body.slug).first()
    if exists:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Подкатегория с таким slug уже существует")
    subcategory = Subcategory(category_id=body.category_id, name=body.name, slug=body.slug)
    db.add(subcategory)
    db.commit()
    db.refresh(subcategory)
    return ApiResponse(message="Подкатегория создана", data=SubcategoryRead.model_validate(subcategory))


@router.patch("/subcategories/{subcategory_id}", response_model=ApiResponse[SubcategoryRead])
def admin_update_subcategory(
    subcategory_id: int,
    body: SubcategoryUpdate,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    subcategory = db.query(Subcategory).filter(Subcategory.id == subcategory_id).first()
    if not subcategory:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Подкатегория не найдена")
    next_category_id = body.category_id if body.category_id is not None else subcategory.category_id
    next_slug = body.slug if body.slug is not None else subcategory.slug
    if not db.query(Category).filter(Category.id == next_category_id).first():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Категория не найдена")
    exists = (
        db.query(Subcategory)
        .filter(Subcategory.category_id == next_category_id, Subcategory.slug == next_slug, Subcategory.id != subcategory_id)
        .first()
    )
    if exists:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Подкатегория с таким slug уже существует")

    subcategory.category_id = next_category_id
    if body.name is not None:
        subcategory.name = body.name
    if body.slug is not None:
        subcategory.slug = body.slug
    db.commit()
    db.refresh(subcategory)
    return ApiResponse(message="Подкатегория обновлена", data=SubcategoryRead.model_validate(subcategory))


@router.delete("/subcategories/{subcategory_id}", response_model=ApiResponse[None])
def admin_delete_subcategory(subcategory_id: int, _: User = Depends(require_admin), db: Session = Depends(get_db)):
    subcategory = db.query(Subcategory).filter(Subcategory.id == subcategory_id).first()
    if not subcategory:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Подкатегория не найдена")
    if db.query(Service).filter(Service.subcategory_id == subcategory_id).first():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Подкатегория используется в объявлениях")
    db.delete(subcategory)
    db.commit()
    return ApiResponse(message="Подкатегория удалена")


@router.get("/reviews", response_model=ApiResponse[list[ReviewRead]])
def admin_list_reviews(skip: int = Query(0, ge=0), limit: int = Query(50, ge=1, le=100), _: User = Depends(require_admin), db: Session = Depends(get_db)):
    reviews = db.query(Review).options(joinedload(Review.author), joinedload(Review.target_user)).order_by(Review.created_at.desc()).offset(skip).limit(limit).all()
    return ApiResponse(message="Список отзывов", data=[ReviewRead.model_validate(r) for r in reviews])


@router.delete("/reviews/{review_id}", response_model=ApiResponse[None])
def admin_delete_review(review_id: int, _: User = Depends(require_admin), db: Session = Depends(get_db)):
    review = db.query(Review).filter(Review.id == review_id).first()
    if not review:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Отзыв не найден")
    delete_target_reports(db, "review", review.id)
    db.delete(review)
    db.commit()
    return ApiResponse(message="Отзыв удален")
