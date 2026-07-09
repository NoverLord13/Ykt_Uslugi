from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from core.domain_types import DealUpdateStatus
from models.response import ServiceResponse

AUTO_COMPLETE_HOURS = 72
ACTIVE_STATUSES = ("new", "accepted", "work_submitted", "revision_requested", "disputed")
FINAL_STATUSES = {"completed", "cancelled", "declined"}


class DealTransitionError(Exception):
    def __init__(self, status_code: int, detail: str):
        super().__init__(detail)
        self.status_code = status_code
        self.detail = detail


def utc_now_naive() -> datetime:
    """Return UTC in the representation currently used by the database schema."""
    return datetime.now(timezone.utc).replace(tzinfo=None)


def utc_from_storage(value: datetime) -> datetime:
    """Interpret database datetimes consistently as UTC."""
    return value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value.astimezone(timezone.utc)


def auto_complete_overdue(db: Session) -> int:
    """Complete overdue deals in the caller's transaction and return the count."""
    now = utc_now_naive()
    cutoff = now - timedelta(hours=AUTO_COMPLETE_HOURS)
    return db.query(ServiceResponse).filter(
        ServiceResponse.status == "work_submitted",
        ServiceResponse.work_submitted_at.is_not(None),
        ServiceResponse.work_submitted_at <= cutoff,
    ).update(
        {
            ServiceResponse.status: "completed",
            ServiceResponse.completed_at: now,
            ServiceResponse.status_note: "Завершено автоматически: заказчик не открыл спор в течение 72 часов",
        },
        synchronize_session=False,
    )


def deal_roles(item: ServiceResponse) -> tuple[int, int]:
    if item.service.listing_type == "request":
        return item.service.owner_id, item.respondent_id
    return item.respondent_id, item.service.owner_id


def apply_transition(db: Session, item: ServiceResponse, *, user_id: int, next_status: DealUpdateStatus, note: str | None) -> None:
    customer_id, performer_id = deal_roles(item)
    is_customer = user_id == customer_id
    is_performer = user_id == performer_id
    if not is_customer and not is_performer:
        raise DealTransitionError(403, "Недостаточно прав")
    if item.status in FINAL_STATUSES:
        raise DealTransitionError(409, "Финальный статус нельзя изменить")
    if item.status == "disputed":
        raise DealTransitionError(409, "Спорную сделку может изменить только администратор")

    now = utc_now_naive()
    if next_status == "accepted":
        if item.service.owner_id != user_id or item.status != "new":
            raise DealTransitionError(403, "Принять новый отклик может только автор объявления")
        if item.service.listing_type == "request":
            active_deal = db.query(ServiceResponse.id).filter(
                ServiceResponse.service_id == item.service_id,
                ServiceResponse.status.in_(("accepted", "work_submitted", "revision_requested", "disputed")),
                ServiceResponse.id != item.id,
            ).first()
            if active_deal:
                raise DealTransitionError(409, "Для этого задания уже выбран исполнитель")
            db.query(ServiceResponse).filter(
                ServiceResponse.service_id == item.service_id,
                ServiceResponse.status == "new",
                ServiceResponse.id != item.id,
            ).update({ServiceResponse.status: "declined"}, synchronize_session=False)
        item.status_note = None
    elif next_status == "work_submitted":
        if not is_performer or item.status not in {"accepted", "revision_requested"}:
            raise DealTransitionError(403, "Сообщить о выполнении может только исполнитель активной сделки")
        item.work_submitted_at = now
        item.status_note = note
    elif next_status == "completed":
        if not is_customer or item.status != "work_submitted":
            raise DealTransitionError(403, "Принять выполненную работу может только заказчик")
        item.completed_at = now
        item.status_note = note
    elif next_status == "revision_requested":
        if not is_customer or item.status != "work_submitted":
            raise DealTransitionError(403, "Вернуть работу на доработку может только заказчик")
        if not note or len(note) < 3:
            raise DealTransitionError(400, "Опишите, что необходимо исправить")
        item.work_submitted_at = None
        item.status_note = note
    elif next_status == "disputed":
        if item.status not in {"accepted", "work_submitted", "revision_requested"}:
            raise DealTransitionError(409, "Для этой сделки нельзя открыть спор")
        if not note or len(note) < 10:
            raise DealTransitionError(400, "Опишите причину спора минимум в 10 символов")
        item.status_note = note
    elif next_status == "declined":
        if item.service.owner_id != user_id or item.status != "new":
            raise DealTransitionError(403, "Отклонить новый отклик может только автор объявления")
        item.status_note = note
    elif next_status == "cancelled":
        if item.status not in {"new", "accepted"}:
            raise DealTransitionError(409, "После отправки результата используйте спор")
        item.status_note = note

    item.status = next_status
