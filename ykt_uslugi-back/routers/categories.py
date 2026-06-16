from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, selectinload

from database import get_db
from models.service import Category, Subcategory
from schemas.common import ApiResponse, CategoryRead, SubcategoryRead

router = APIRouter(prefix="/categories", tags=["categories"])


@router.get("", response_model=ApiResponse[list[CategoryRead]])
def list_categories(db: Session = Depends(get_db)):
    categories = (
        db.query(Category)
        .options(selectinload(Category.subcategories))
        .order_by(Category.name.asc())
        .all()
    )
    return ApiResponse(message="Список категорий", data=[CategoryRead.model_validate(c) for c in categories])


@router.get("/{category_id}/subcategories", response_model=ApiResponse[list[SubcategoryRead]])
def list_subcategories(category_id: int, db: Session = Depends(get_db)):
    if not db.query(Category).filter(Category.id == category_id).first():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Категория не найдена")

    subcategories = (
        db.query(Subcategory)
        .filter(Subcategory.category_id == category_id)
        .order_by(Subcategory.name.asc())
        .all()
    )
    return ApiResponse(
        message="Список подкатегорий",
        data=[SubcategoryRead.model_validate(s) for s in subcategories],
    )
