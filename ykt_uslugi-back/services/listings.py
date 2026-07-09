from decimal import Decimal

from fastapi import UploadFile
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.domain_types import ListingType, PriceType, ServiceStatus
from models.service import Service, Category, Subcategory

MAX_SERVICE_IMAGES = 8


class ListingValidationError(Exception):
    def __init__(self, status_code: int, detail: str):
        super().__init__(detail)
        self.status_code = status_code
        self.detail = detail


async def validate_category_pair(db: AsyncSession, category_id: int | None, subcategory_id: int | None) -> None:
    if category_id is not None and not await db.scalar(select(Category.id).where(Category.id == category_id)):
        raise ListingValidationError(400, "Категория не найдена")
    if subcategory_id is None:
        return
    if category_id is None:
        raise ListingValidationError(400, "Сначала выберите категорию")
    subcategory_category_id = await db.scalar(
        select(Subcategory.category_id).where(Subcategory.id == subcategory_id)
    )
    if subcategory_category_id is None:
        raise ListingValidationError(400, "Подкатегория не найдена")
    if subcategory_category_id != category_id:
        raise ListingValidationError(400, "Подкатегория не принадлежит выбранной категории")


def normalize_price(price_type: PriceType, price: Decimal | None) -> Decimal | None:
    if price_type == "negotiable":
        return None
    if price is None or price <= 0:
        raise ListingValidationError(400, "Укажите цену больше нуля или выберите договорную цену")
    return price


def collect_uploads(image: UploadFile | None, images: list[UploadFile] | None) -> list[UploadFile]:
    upload_files = [file for file in (images or []) if file and file.filename]
    if image and image.filename:
        upload_files.insert(0, image)
    if len(upload_files) > MAX_SERVICE_IMAGES:
        raise ListingValidationError(400, "Можно загрузить максимум 8 фото")
    return upload_files


async def apply_service_update(
    db: AsyncSession,
    service: Service,
    *,
    owner_phone: str,
    title: str | None,
    description: str | None,
    price: Decimal | None,
    listing_type: ListingType | None,
    category_id: int | None,
    subcategory_id: int | None,
    clear_category: bool,
    clear_subcategory: bool,
    location: str | None,
    price_type: PriceType | None,
    status_value: ServiceStatus | None,
    contact_phone: str | None,
) -> None:
    if title is not None:
        service.title = title.strip()
        if not service.title:
            raise ListingValidationError(400, "Название не может состоять из пробелов")
    if description is not None:
        service.description = description.strip()
        if not service.description:
            raise ListingValidationError(400, "Описание не может состоять из пробелов")
    if price is not None:
        service.price = price
    if listing_type is not None:
        service.listing_type = listing_type
    if category_id is not None or subcategory_id is not None or clear_category or clear_subcategory:
        next_category_id = None if clear_category else category_id if category_id is not None else service.category_id
        next_subcategory_id = None if clear_category or clear_subcategory else subcategory_id if subcategory_id is not None else service.subcategory_id
        await validate_category_pair(db, next_category_id, next_subcategory_id)
        service.category_id = next_category_id
        service.subcategory_id = next_subcategory_id
    if location is not None:
        service.location = location
    if price_type is not None:
        service.price_type = price_type
    service.price = normalize_price(service.price_type, service.price)
    if status_value is not None:
        if service.status == "moderation" and status_value != "moderation":
            raise ListingValidationError(403, "Объявление на модерации может опубликовать только администратор")
        if service.status != "moderation" and status_value == "moderation":
            raise ListingValidationError(400, "Отправить объявление на модерацию может только администратор")
        service.status = status_value
        service.is_active = status_value == "active"
    if contact_phone is not None:
        service.contact_phone = contact_phone or owner_phone
