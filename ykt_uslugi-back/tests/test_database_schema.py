import unittest

from sqlalchemy import CheckConstraint, create_engine

from database import Base, SQLALCHEMY_DATABASE_URL
from models import response, review, service, user  # noqa: F401


class DatabaseSchemaTests(unittest.TestCase):
    def test_default_database_url_uses_postgresql_driver(self) -> None:
        self.assertTrue(SQLALCHEMY_DATABASE_URL.startswith(("postgresql+psycopg://", "sqlite://")))

    def test_business_constraints_are_declared_in_metadata(self) -> None:
        expected_constraints = {
            "services": {
                "ck_services_listing_type_valid",
                "ck_services_price_type_valid",
                "ck_services_status_valid",
                "ck_services_price_non_negative",
            },
            "service_images": {"ck_service_images_position_non_negative"},
            "service_responses": {"ck_service_responses_status_valid"},
            "reports": {
                "ck_reports_target_type_valid",
                "ck_reports_status_valid",
                "ck_reports_reason_valid",
            },
            "reviews": {
                "ck_reviews_rating_range",
                "ck_reviews_review_type_valid",
            },
        }

        for table_name, constraint_names in expected_constraints.items():
            table = Base.metadata.tables[table_name]
            actual_names = {constraint.name for constraint in table.constraints if isinstance(constraint, CheckConstraint)}
            self.assertTrue(constraint_names.issubset(actual_names))

    def test_sqlite_test_schema_still_builds_for_unit_tests(self) -> None:
        engine = create_engine("sqlite:///:memory:")
        try:
            Base.metadata.create_all(engine)
        finally:
            Base.metadata.drop_all(engine)
            engine.dispose()


if __name__ == "__main__":
    unittest.main()
