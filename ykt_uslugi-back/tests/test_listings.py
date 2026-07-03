import unittest
from decimal import Decimal

from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from database import Base
from models import Category, Service, Subcategory, User
from services.listings import ListingValidationError, apply_service_update, normalize_price, validate_category_pair


class ListingServiceTests(unittest.TestCase):
    def setUp(self) -> None:
        self.engine = create_engine("sqlite:///:memory:")
        Base.metadata.create_all(self.engine)
        self.db = Session(self.engine)
        self.owner = User(username="owner", phone_number="+79990000001", hashed_password="x")
        self.category = Category(name="Category", slug="category")
        self.other_category = Category(name="Other", slug="other")
        self.db.add_all([self.owner, self.category, self.other_category])
        self.db.flush()
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
        self.db.flush()

    def tearDown(self) -> None:
        self.db.close()
        self.engine.dispose()

    def test_negotiable_price_is_cleared(self) -> None:
        self.assertIsNone(normalize_price("negotiable", Decimal("100")))

    def test_positive_price_is_required(self) -> None:
        with self.assertRaises(ListingValidationError):
            normalize_price("fixed", Decimal("0"))

    def test_subcategory_must_belong_to_category(self) -> None:
        with self.assertRaises(ListingValidationError):
            validate_category_pair(self.db, self.other_category.id, self.subcategory.id)

    def test_moderation_status_cannot_be_selected_by_owner(self) -> None:
        with self.assertRaises(ListingValidationError) as context:
            apply_service_update(
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
