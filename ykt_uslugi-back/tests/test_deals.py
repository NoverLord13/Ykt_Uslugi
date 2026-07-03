import unittest
from datetime import timedelta

from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from database import Base
from models import Service, ServiceResponse, User
from services.deals import DealTransitionError, apply_transition, auto_complete_overdue, utc_now_naive


class DealServiceTests(unittest.TestCase):
    def setUp(self) -> None:
        self.engine = create_engine("sqlite:///:memory:")
        Base.metadata.create_all(self.engine)
        self.db = Session(self.engine)
        self.owner = User(username="owner", phone_number="+79990000001", hashed_password="x")
        self.respondent = User(username="worker", phone_number="+79990000002", hashed_password="x")
        self.db.add_all([self.owner, self.respondent])
        self.db.flush()
        self.service = Service(
            owner_id=self.owner.id,
            title="Test service",
            description="Test description",
            listing_type="request",
            price_type="negotiable",
        )
        self.db.add(self.service)
        self.db.flush()

    def tearDown(self) -> None:
        self.db.close()
        self.engine.dispose()

    def add_response(self, status: str = "new") -> ServiceResponse:
        response = ServiceResponse(
            service_id=self.service.id,
            respondent_id=self.respondent.id,
            status=status,
        )
        self.db.add(response)
        self.db.flush()
        return response

    def test_owner_can_accept_request_response(self) -> None:
        response = self.add_response()

        apply_transition(self.db, response, user_id=self.owner.id, next_status="accepted", note=None)

        self.assertEqual(response.status, "accepted")

    def test_non_participant_cannot_change_deal(self) -> None:
        response = self.add_response("accepted")

        with self.assertRaises(DealTransitionError) as context:
            apply_transition(self.db, response, user_id=999, next_status="cancelled", note=None)

        self.assertEqual(context.exception.status_code, 403)

    def test_revision_requires_customer_note(self) -> None:
        response = self.add_response("work_submitted")

        with self.assertRaises(DealTransitionError) as context:
            apply_transition(self.db, response, user_id=self.owner.id, next_status="revision_requested", note="")

        self.assertEqual(context.exception.status_code, 400)

    def test_overdue_work_is_completed(self) -> None:
        response = self.add_response("work_submitted")
        response.work_submitted_at = utc_now_naive() - timedelta(hours=73)
        self.db.commit()

        changed = auto_complete_overdue(self.db)
        self.db.commit()
        self.db.refresh(response)

        self.assertEqual(changed, 1)
        self.assertEqual(response.status, "completed")
        self.assertIsNotNone(response.completed_at)


if __name__ == "__main__":
    unittest.main()
