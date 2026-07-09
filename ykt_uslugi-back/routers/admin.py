from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload, selectinload

from database import get_db
from dependencies import require_admin
from models.review import Review
from models.service import Category, Service, Subcategory
from models.user import User
from schemas.common import ApiResponse, CategoryRead, ReviewRead, ServiceRead, SubcategoryRead, UserRead
from schemas.service import AdminServiceUpdate, AdminUserUpdate, CategoryCreate, CategoryUpdate, SubcategoryCreate, SubcategoryUpdate

router = APIRouter(prefix="/admin", tags=["admin"])


def _service_options():
    return (
        joinedload(Service.owner),
        joinedload(Service.category).selectinload(Category.subcategories),
        joinedload(Service.subcategory),
        selectinload(Service.images),
    )


@router.get("/users", response_model=ApiResponse[list[UserRead]])
async def list_users(_: User = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).order_by(User.created_at.desc()))
    users = result.scalars().all()
    return ApiResponse(
        message="Список пользователей",
        data=[UserRead.model_validate(u) for u in users],
    )


@router.patch("/users/{user_id}", response_model=ApiResponse[UserRead])
async def update_user(
    user_id: int,
    body: AdminUserUpdate,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    user = await db.scalar(select(User).where(User.id == user_id))
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Пользователь не найден")
    if user.id == admin.id and body.is_admin is False:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Нельзя снять права admin с себя")

    if body.is_active is not None:
        user.is_active = body.is_active
    if body.is_admin is not None:
        user.is_admin = body.is_admin

    await db.commit()
    await db.refresh(user)
    return ApiResponse(message="Пользователь обновлён", data=UserRead.model_validate(user))


@router.get("/services", response_model=ApiResponse[list[ServiceRead]])
async def list_all_services(_: User = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Service).options(*_service_options()).order_by(Service.created_at.desc()))
    services = result.unique().scalars().all()
    return ApiResponse(
        message="Список всех услуг",
        data=[ServiceRead.model_validate(s) for s in services],
    )


@router.patch("/services/{service_id}", response_model=ApiResponse[ServiceRead])
async def moderate_service(
    service_id: int,
    body: AdminServiceUpdate,
    _: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    service = await db.scalar(select(Service).where(Service.id == service_id).with_for_update())
    if not service:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Услуга не найдена")

    if body.is_active is not None:
        service.is_active = body.is_active
    if body.status is not None:
        service.status = body.status
        service.is_active = body.status == "active"

    await db.commit()
    result = await db.execute(select(Service).options(*_service_options()).where(Service.id == service.id))
    service = result.unique().scalar_one()
    return ApiResponse(message="Услуга обновлена", data=ServiceRead.model_validate(service))


@router.delete("/services/{service_id}", response_model=ApiResponse[None])
async def admin_delete_service(
    service_id: int,
    _: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    service = await db.scalar(select(Service).where(Service.id == service_id))
    if not service:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Услуга не найдена")

    await db.delete(service)
    await db.commit()
    return ApiResponse(message="Услуга удалена")


@router.get("/categories", response_model=ApiResponse[list[CategoryRead]])
async def admin_list_categories(_: User = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Category)
        .options(selectinload(Category.subcategories))
        .order_by(Category.name.asc())
    )
    categories = result.scalars().all()
    return ApiResponse(message="Список категорий", data=[CategoryRead.model_validate(c) for c in categories])


@router.post("/categories", response_model=ApiResponse[CategoryRead], status_code=status.HTTP_201_CREATED)
async def admin_create_category(body: CategoryCreate, _: User = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    if await db.scalar(select(Category.id).where(Category.slug == body.slug)):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Категория с таким slug уже существует")
    category = Category(name=body.name, slug=body.slug)
    db.add(category)
    await db.commit()
    result = await db.execute(
        select(Category).options(selectinload(Category.subcategories)).where(Category.id == category.id)
    )
    category = result.scalar_one()
    return ApiResponse(message="Категория создана", data=CategoryRead.model_validate(category))


@router.patch("/categories/{category_id}", response_model=ApiResponse[CategoryRead])
async def admin_update_category(
    category_id: int,
    body: CategoryUpdate,
    _: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    category = await db.scalar(select(Category).where(Category.id == category_id))
    if not category:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Категория не найдена")
    if body.slug and await db.scalar(select(Category.id).where(Category.slug == body.slug, Category.id != category_id)):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Категория с таким slug уже существует")

    if body.name is not None:
        category.name = body.name
    if body.slug is not None:
        category.slug = body.slug
    await db.commit()
    result = await db.execute(
        select(Category).options(selectinload(Category.subcategories)).where(Category.id == category.id)
    )
    category = result.scalar_one()
    return ApiResponse(message="Категория обновлена", data=CategoryRead.model_validate(category))


@router.delete("/categories/{category_id}", response_model=ApiResponse[None])
async def admin_delete_category(category_id: int, _: User = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    category = await db.scalar(select(Category).where(Category.id == category_id))
    if not category:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Категория не найдена")
    if await db.scalar(select(Service.id).where(Service.category_id == category_id)):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Категория используется в объявлениях")
    await db.delete(category)
    await db.commit()
    return ApiResponse(message="Категория удалена")


@router.post("/subcategories", response_model=ApiResponse[SubcategoryRead], status_code=status.HTTP_201_CREATED)
async def admin_create_subcategory(body: SubcategoryCreate, _: User = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    if not await db.scalar(select(Category.id).where(Category.id == body.category_id)):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Категория не найдена")
    exists = await db.scalar(
        select(Subcategory.id).where(Subcategory.category_id == body.category_id, Subcategory.slug == body.slug)
    )
    if exists:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Подкатегория с таким slug уже существует")
    subcategory = Subcategory(category_id=body.category_id, name=body.name, slug=body.slug)
    db.add(subcategory)
    await db.commit()
    await db.refresh(subcategory)
    return ApiResponse(message="Подкатегория создана", data=SubcategoryRead.model_validate(subcategory))


@router.patch("/subcategories/{subcategory_id}", response_model=ApiResponse[SubcategoryRead])
async def admin_update_subcategory(
    subcategory_id: int,
    body: SubcategoryUpdate,
    _: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    subcategory = await db.scalar(select(Subcategory).where(Subcategory.id == subcategory_id))
    if not subcategory:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Подкатегория не найдена")
    next_category_id = body.category_id if body.category_id is not None else subcategory.category_id
    next_slug = body.slug if body.slug is not None else subcategory.slug
    if not await db.scalar(select(Category.id).where(Category.id == next_category_id)):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Категория не найдена")
    exists = await db.scalar(
        select(Subcategory.id).where(
            Subcategory.category_id == next_category_id,
            Subcategory.slug == next_slug,
            Subcategory.id != subcategory_id,
        )
    )
    if exists:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Подкатегория с таким slug уже существует")

    subcategory.category_id = next_category_id
    if body.name is not None:
        subcategory.name = body.name
    if body.slug is not None:
        subcategory.slug = body.slug
    await db.commit()
    await db.refresh(subcategory)
    return ApiResponse(message="Подкатегория обновлена", data=SubcategoryRead.model_validate(subcategory))


@router.delete("/subcategories/{subcategory_id}", response_model=ApiResponse[None])
async def admin_delete_subcategory(subcategory_id: int, _: User = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    subcategory = await db.scalar(select(Subcategory).where(Subcategory.id == subcategory_id))
    if not subcategory:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Подкатегория не найдена")
    if await db.scalar(select(Service.id).where(Service.subcategory_id == subcategory_id)):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Подкатегория используется в объявлениях")
    await db.delete(subcategory)
    await db.commit()
    return ApiResponse(message="Подкатегория удалена")


@router.get("/reviews", response_model=ApiResponse[list[ReviewRead]])
async def admin_list_reviews(_: User = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Review)
        .options(joinedload(Review.author), joinedload(Review.target_user))
        .order_by(Review.created_at.desc())
    )
    reviews = result.unique().scalars().all()
    return ApiResponse(message="Список отзывов", data=[ReviewRead.model_validate(r) for r in reviews])


@router.delete("/reviews/{review_id}", response_model=ApiResponse[None])
async def admin_delete_review(review_id: int, _: User = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    review = await db.scalar(select(Review).where(Review.id == review_id))
    if not review:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Отзыв не найден")
    await db.delete(review)
    await db.commit()
    return ApiResponse(message="Отзыв удален")
