import unittest
from decimal import Decimal

from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine

from database import Base
from models import Category, Service, Subcategory, User
from services.listings import ListingValidationError, apply_service_update, normalize_price, validate_category_pair


class ListingServiceTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self) -> None:
        self.engine = create_async_engine("sqlite+aiosqlite:///:memory:")
        async with self.engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        self.db = AsyncSession(self.engine, expire_on_commit=False)
        self.owner = User(username="owner", phone_number="+79990000001", hashed_password="x")
        self.category = Category(name="Category", slug="category")
        self.other_category = Category(name="Other", slug="other")
        self.db.add_all([self.owner, self.category, self.other_category])
        await self.db.flush()
        self.subcategory = Subcategory(category_id=self.category.id, name="Subcategory", slug="subcategory")
        self.service = Service(
            owner_id=self.owner.id,
            title="Service",
            description="Description",
            listing_type="offer",
            price_type="fixed",
            price=Decimal("100"),
        )
        self.db.add_all([self.subcategory, self.service])
        await self.db.flush()

    async def asyncTearDown(self) -> None:
        await self.db.close()
        await self.engine.dispose()

    def test_negotiable_price_is_cleared(self) -> None:
        self.assertIsNone(normalize_price("negotiable", Decimal("100")))

    def test_positive_price_is_required(self) -> None:
        with self.assertRaises(ListingValidationError):
            normalize_price("fixed", Decimal("0"))

    async def test_subcategory_must_belong_to_category(self) -> None:
        with self.assertRaises(ListingValidationError):
            await validate_category_pair(self.db, self.other_category.id, self.subcategory.id)

    async def test_moderation_status_cannot_be_selected_by_owner(self) -> None:
        with self.assertRaises(ListingValidationError) as context:
            await apply_service_update(
                self.db,
                self.service,
                owner_phone=self.owner.phone_number,
                title=None,
                description=None,
                price=None,
                listing_type=None,
                category_id=None,
                subcategory_id=None,
                clear_category=False,
                clear_subcategory=False,
                location=None,
                price_type=None,
                status_value="moderation",
                contact_phone=None,
            )
        self.assertEqual(context.exception.status_code, 400)


if __name__ == "__main__":
    unittest.main()
