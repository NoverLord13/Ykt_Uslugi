from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from database import get_db
from dependencies import get_current_user
from models.response import ServiceResponse
from models.review import Review
from models.service import Category, Service
from models.user import User
from schemas.common import ApiResponse, CurrentUserProfileRead, ReviewRead, ServiceRead, UserProfileRead
from schemas.user import ReviewCreate, UserProfileUpdate
from services.files import delete_upload, save_upload

router = APIRouter(prefix="/users", tags=["users"])


async def _profile_response(
    user: User,
    db: AsyncSession,
    *,
    private: bool = False,
) -> UserProfileRead | CurrentUserProfileRead:
    performer_avg, performer_count = (
        await db.execute(
            select(func.avg(Review.rating), func.count(Review.id)).where(
                Review.target_user_id == user.id,
                Review.review_type == "performer",
            )
        )
    ).one()
    customer_avg, customer_count = (
        await db.execute(
            select(func.avg(Review.rating), func.count(Review.id)).where(
                Review.target_user_id == user.id,
                Review.review_type == "customer",
            )
        )
    ).one()
    schema = CurrentUserProfileRead if private else UserProfileRead
    data = schema.model_validate(user)
    data.performer_rating_avg = float(performer_avg) if performer_avg is not None else None
    data.performer_reviews_count = performer_count or 0
    data.customer_rating_avg = float(customer_avg) if customer_avg is not None else None
    data.customer_reviews_count = customer_count or 0
    data.rating_avg = data.performer_rating_avg
    data.reviews_count = data.performer_reviews_count + data.customer_reviews_count
    return data


@router.get("/me", response_model=ApiResponse[CurrentUserProfileRead])
async def get_me(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    return ApiResponse(message="Профиль пользователя", data=await _profile_response(current_user, db, private=True))


@router.patch("/me", response_model=ApiResponse[CurrentUserProfileRead])
async def update_me(
    body: UserProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    update_data = body.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(current_user, field, value)

    await db.commit()
    await db.refresh(current_user)
    return ApiResponse(message="Профиль обновлен", data=await _profile_response(current_user, db, private=True))


@router.post("/me/avatar", response_model=ApiResponse[CurrentUserProfileRead])
async def upload_avatar(
    avatar: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    old_avatar_url = current_user.avatar_url
    new_avatar_url = await save_upload(avatar)
    current_user.avatar_url = new_avatar_url
    try:
        await db.commit()
    except Exception:
        await db.rollback()
        delete_upload(new_avatar_url)
        raise
    await db.refresh(current_user)
    delete_upload(old_avatar_url)
    return ApiResponse(message="Аватар обновлен", data=await _profile_response(current_user, db, private=True))


@router.get("/{user_id}", response_model=ApiResponse[UserProfileRead])
async def get_user_profile(user_id: int, db: AsyncSession = Depends(get_db)):
    user = await db.scalar(select(User).where(User.id == user_id, User.is_active.is_(True)))
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Пользователь не найден")
    return ApiResponse(message="Профиль пользователя", data=await _profile_response(user, db))


@router.get("/{user_id}/services", response_model=ApiResponse[list[ServiceRead]])
async def get_user_services(user_id: int, db: AsyncSession = Depends(get_db)):
    if not await db.scalar(select(User.id).where(User.id == user_id, User.is_active.is_(True))):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Пользователь не найден")

    result = await db.execute(
        select(Service)
        .options(
            joinedload(Service.owner),
            joinedload(Service.category).selectinload(Category.subcategories),
            joinedload(Service.subcategory),
            joinedload(Service.images),
        )
        .where(Service.owner_id == user_id, Service.is_active.is_(True), Service.status == "active")
        .order_by(Service.created_at.desc())
    )
    services = result.unique().scalars().all()
    return ApiResponse(message="Объявления пользователя", data=[ServiceRead.model_validate(s) for s in services])


@router.get("/{user_id}/reviews", response_model=ApiResponse[list[ReviewRead]])
async def get_user_reviews(user_id: int, db: AsyncSession = Depends(get_db)):
    if not await db.scalar(select(User.id).where(User.id == user_id)):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Пользователь не найден")

    result = await db.execute(
        select(Review)
        .options(joinedload(Review.author), joinedload(Review.target_user))
        .where(Review.target_user_id == user_id)
        .order_by(Review.created_at.desc())
    )
    reviews = result.unique().scalars().all()
    return ApiResponse(message="Отзывы пользователя", data=[ReviewRead.model_validate(r) for r in reviews])


@router.post("/{user_id}/reviews", response_model=ApiResponse[ReviewRead], status_code=status.HTTP_201_CREATED)
async def create_user_review(
    user_id: int,
    body: ReviewCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    target_user = await db.scalar(select(User).where(User.id == user_id, User.is_active.is_(True)))
    if not target_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Пользователь не найден")
    if target_user.id == current_user.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Нельзя оставить отзыв самому себе")

    response = await db.scalar(
        select(ServiceResponse)
        .options(joinedload(ServiceResponse.service))
        .where(ServiceResponse.id == body.response_id, ServiceResponse.status == "completed")
    )
    if not response:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Отзыв доступен только после завершённой сделки")

    if response.service.listing_type == "request":
        customer_id, performer_id = response.service.owner_id, response.respondent_id
    else:
        customer_id, performer_id = response.respondent_id, response.service.owner_id
    if current_user.id == customer_id and target_user.id == performer_id:
        review_type = "performer"
    elif current_user.id == performer_id and target_user.id == customer_id:
        review_type = "customer"
    else:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Оценить друг друга могут только участники завершённой сделки",
        )

    existing = await db.scalar(
        select(Review.id).where(Review.author_id == current_user.id, Review.response_id == response.id)
    )
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Вы уже оставили отзыв по этой сделке")

    review = Review(
        author_id=current_user.id,
        target_user_id=target_user.id,
        service_id=response.service_id,
        response_id=response.id,
        rating=body.rating,
        review_type=review_type,
        text=body.text.strip() if body.text else None,
    )
    db.add(review)
    try:
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        raise HTTPException(status_code=409, detail="Вы уже оставили отзыв по этой сделке") from exc

    review = await db.scalar(
        select(Review)
        .options(joinedload(Review.author), joinedload(Review.target_user))
        .where(Review.id == review.id)
    )
    return ApiResponse(message="Отзыв создан", data=ReviewRead.model_validate(review))


@router.delete("/reviews/{review_id}", response_model=ApiResponse[None])
async def delete_review(
    review_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    review = await db.scalar(select(Review).where(Review.id == review_id))
    if not review:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Отзыв не найден")
    if not current_user.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Опубликованный отзыв нельзя удалить — это сохраняет историю сделки")

    await db.delete(review)
    await db.commit()
    return ApiResponse(message="Отзыв удален")
