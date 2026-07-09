from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from database import get_db
from models.service import Category, Subcategory
from schemas.common import ApiResponse, CategoryRead, SubcategoryRead

router = APIRouter(prefix="/categories", tags=["categories"])


@router.get("", response_model=ApiResponse[list[CategoryRead]])
async def list_categories(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Category)
        .options(selectinload(Category.subcategories))
        .order_by(Category.name.asc())
    )
    categories = result.scalars().all()
    return ApiResponse(message="Список категорий", data=[CategoryRead.model_validate(c) for c in categories])


@router.get("/{category_id}/subcategories", response_model=ApiResponse[list[SubcategoryRead]])
async def list_subcategories(category_id: int, db: AsyncSession = Depends(get_db)):
    if not await db.scalar(select(Category.id).where(Category.id == category_id)):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Категория не найдена")

    result = await db.execute(
        select(Subcategory)
        .where(Subcategory.category_id == category_id)
        .order_by(Subcategory.name.asc())
    )
    subcategories = result.scalars().all()
    return ApiResponse(
        message="Список подкатегорий",
        data=[SubcategoryRead.model_validate(s) for s in subcategories],
    )
