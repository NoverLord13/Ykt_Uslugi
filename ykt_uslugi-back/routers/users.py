from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from database import get_db
from dependencies import get_current_user
from models.review import Review
from models.service import Service
from models.user import User
from schemas.common import ApiResponse, ReviewRead, ServiceRead, UserProfileRead
from schemas.user import ReviewCreate, UserProfileUpdate
from services.files import save_upload

router = APIRouter(prefix="/users", tags=["users"])


def _profile_response(user: User, db: Session) -> UserProfileRead:
    rating_avg, reviews_count = (
        db.query(func.avg(Review.rating), func.count(Review.id))
        .filter(Review.target_user_id == user.id)
        .one()
    )
    data = UserProfileRead.model_validate(user)
    data.rating_avg = float(rating_avg) if rating_avg is not None else None
    data.reviews_count = reviews_count or 0
    return data


@router.get("/me", response_model=ApiResponse[UserProfileRead])
def get_me(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return ApiResponse(message="Профиль пользователя", data=_profile_response(current_user, db))


@router.patch("/me", response_model=ApiResponse[UserProfileRead])
def update_me(
    body: UserProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    update_data = body.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(current_user, field, value)

    db.commit()
    db.refresh(current_user)
    return ApiResponse(message="Профиль обновлен", data=_profile_response(current_user, db))


@router.post("/me/avatar", response_model=ApiResponse[UserProfileRead])
async def upload_avatar(
    avatar: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    current_user.avatar_url = await save_upload(avatar)
    db.commit()
    db.refresh(current_user)
    return ApiResponse(message="Аватар обновлен", data=_profile_response(current_user, db))


@router.get("/{user_id}", response_model=ApiResponse[UserProfileRead])
def get_user_profile(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id, User.is_active.is_(True)).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Пользователь не найден")
    return ApiResponse(message="Профиль пользователя", data=_profile_response(user, db))


@router.get("/{user_id}/services", response_model=ApiResponse[list[ServiceRead]])
def get_user_services(user_id: int, db: Session = Depends(get_db)):
    if not db.query(User).filter(User.id == user_id, User.is_active.is_(True)).first():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Пользователь не найден")

    services = (
        db.query(Service)
        .filter(Service.owner_id == user_id, Service.is_active.is_(True), Service.status == "active")
        .order_by(Service.created_at.desc())
        .all()
    )
    return ApiResponse(message="Объявления пользователя", data=[ServiceRead.model_validate(s) for s in services])


@router.get("/{user_id}/reviews", response_model=ApiResponse[list[ReviewRead]])
def get_user_reviews(user_id: int, db: Session = Depends(get_db)):
    if not db.query(User).filter(User.id == user_id).first():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Пользователь не найден")

    reviews = (
        db.query(Review)
        .filter(Review.target_user_id == user_id)
        .order_by(Review.created_at.desc())
        .all()
    )
    return ApiResponse(message="Отзывы пользователя", data=[ReviewRead.model_validate(r) for r in reviews])


@router.post("/{user_id}/reviews", response_model=ApiResponse[ReviewRead], status_code=status.HTTP_201_CREATED)
def create_user_review(
    user_id: int,
    body: ReviewCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    target_user = db.query(User).filter(User.id == user_id, User.is_active.is_(True)).first()
    if not target_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Пользователь не найден")
    if target_user.id == current_user.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Нельзя оставить отзыв самому себе")

    if body.service_id is not None:
        service = db.query(Service).filter(Service.id == body.service_id, Service.owner_id == target_user.id).first()
        if not service:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Объявление не принадлежит пользователю")

    existing = (
        db.query(Review)
        .filter(Review.author_id == current_user.id, Review.target_user_id == target_user.id)
        .first()
    )
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Вы уже оставили отзыв этому пользователю")

    review = Review(
        author_id=current_user.id,
        target_user_id=target_user.id,
        service_id=body.service_id,
        rating=body.rating,
        text=body.text,
    )
    db.add(review)
    db.commit()
    db.refresh(review)
    return ApiResponse(message="Отзыв создан", data=ReviewRead.model_validate(review))


@router.delete("/reviews/{review_id}", response_model=ApiResponse[None])
def delete_review(
    review_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    review = db.query(Review).filter(Review.id == review_id).first()
    if not review:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Отзыв не найден")
    if review.author_id != current_user.id and not current_user.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Недостаточно прав")

    db.delete(review)
    db.commit()
    return ApiResponse(message="Отзыв удален")
