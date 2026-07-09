import unittest
from datetime import timedelta

from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine

from database import Base
from models import Service, ServiceResponse, User
from services.deals import DealTransitionError, apply_transition, auto_complete_overdue, utc_now_naive


class DealServiceTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self) -> None:
        self.engine = create_async_engine("sqlite+aiosqlite:///:memory:")
        async with self.engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        self.db = AsyncSession(self.engine, expire_on_commit=False)
        self.owner = User(username="owner", phone_number="+79990000001", hashed_password="x")
        self.respondent = User(username="worker", phone_number="+79990000002", hashed_password="x")
        self.db.add_all([self.owner, self.respondent])
        await self.db.flush()
        self.service = Service(
            owner_id=self.owner.id,
            title="Test service",
            description="Test description",
            listing_type="request",
            price_type="negotiable",
        )
        self.db.add(self.service)
        await self.db.flush()

    async def asyncTearDown(self) -> None:
        await self.db.close()
        await self.engine.dispose()

    async def add_response(self, status: str = "new") -> ServiceResponse:
        response = ServiceResponse(service_id=self.service.id, respondent_id=self.respondent.id, status=status)
        response.service = self.service
        response.respondent = self.respondent
        self.db.add(response)
        await self.db.flush()
        return response

    async def test_owner_can_accept_request_response(self) -> None:
        response = await self.add_response()
        await apply_transition(self.db, response, user_id=self.owner.id, next_status="accepted", note=None)
        self.assertEqual(response.status, "accepted")

    async def test_non_participant_cannot_change_deal(self) -> None:
        response = await self.add_response("accepted")
        with self.assertRaises(DealTransitionError) as context:
            await apply_transition(self.db, response, user_id=999, next_status="cancelled", note=None)
        self.assertEqual(context.exception.status_code, 403)

    async def test_revision_requires_customer_note(self) -> None:
        response = await self.add_response("work_submitted")
        with self.assertRaises(DealTransitionError) as context:
            await apply_transition(self.db, response, user_id=self.owner.id, next_status="revision_requested", note="")
        self.assertEqual(context.exception.status_code, 400)

    async def test_performer_can_submit_and_customer_can_complete_work(self) -> None:
        response = await self.add_response("accepted")
        await apply_transition(self.db, response, user_id=self.respondent.id, next_status="work_submitted", note="Ready")
        self.assertEqual(response.status, "work_submitted")
        self.assertIsNotNone(response.work_submitted_at)
        await apply_transition(self.db, response, user_id=self.owner.id, next_status="completed", note=None)
        self.assertEqual(response.status, "completed")
        self.assertIsNotNone(response.completed_at)

    async def test_final_status_cannot_be_changed(self) -> None:
        response = await self.add_response("completed")
        with self.assertRaises(DealTransitionError) as context:
            await apply_transition(self.db, response, user_id=self.owner.id, next_status="cancelled", note=None)
        self.assertEqual(context.exception.status_code, 409)

    async def test_dispute_requires_detailed_note(self) -> None:
        response = await self.add_response("accepted")
        with self.assertRaises(DealTransitionError) as context:
            await apply_transition(self.db, response, user_id=self.owner.id, next_status="disputed", note="short")
        self.assertEqual(context.exception.status_code, 400)

    async def test_overdue_work_is_completed(self) -> None:
        response = await self.add_response("work_submitted")
        response.work_submitted_at = utc_now_naive() - timedelta(hours=73)
        await self.db.commit()
        changed = await auto_complete_overdue(self.db)
        await self.db.commit()
        await self.db.refresh(response)
        self.assertEqual(changed, 1)
        self.assertEqual(response.status, "completed")
        self.assertIsNotNone(response.completed_at)


if __name__ == "__main__":
    unittest.main()
