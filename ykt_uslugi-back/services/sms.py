import random
from datetime import datetime, timedelta, timezone

from core.config import SMS_CODE_TTL_SECONDS, SMS_RESEND_COOLDOWN_SECONDS
from core.security import normalize_phone

sms_storage: dict[str, dict] = {}


class SmsRateLimitError(Exception):
    pass


def _generate_sms_code() -> str:
    return str(random.randint(1000, 9999))


async def send_code(phone: str) -> None:
    normalized = normalize_phone(phone)
    now = datetime.now(timezone.utc)

    existing = sms_storage.get(normalized)
    if existing and existing.get("sent_at"):
        sent_at = existing["sent_at"]
        if now - sent_at < timedelta(seconds=SMS_RESEND_COOLDOWN_SECONDS):
            raise SmsRateLimitError("Повторная отправка кода возможна через 60 секунд")

    code = _generate_sms_code()
    sms_storage[normalized] = {
        "code": code,
        "expires_at": now + timedelta(seconds=SMS_CODE_TTL_SECONDS),
        "sent_at": now,
    }
    print(f"SMS был отправлен на номер {normalized}. Код: {code}")


def verify_code(phone: str, code: str) -> bool:
    normalized = normalize_phone(phone)
    entry = sms_storage.get(normalized)
    if not entry:
        return False

    now = datetime.now(timezone.utc)
    if now > entry["expires_at"]:
        sms_storage.pop(normalized, None)
        return False

    if entry["code"] != code:
        return False

    sms_storage.pop(normalized, None)
    return True
