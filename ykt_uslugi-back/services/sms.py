import random
from datetime import datetime, timedelta, timezone

from core.config import SMS_CODE_TTL_SECONDS, SMS_RESEND_COOLDOWN_SECONDS, VERIFICATION_TOKEN_EXPIRE_MINUTES

sms_storage: dict[str, dict] = {}
verified_phones: dict[str, datetime] = {}


class SmsRateLimitError(Exception):
    pass


def _generate_sms_code() -> str:
    return str(random.randint(1000, 9999))


async def send_code(phone: str) -> None:
    now = datetime.now(timezone.utc)

    existing = sms_storage.get(phone)
    if existing and existing.get("sent_at"):
        sent_at = existing["sent_at"]
        if now - sent_at < timedelta(seconds=SMS_RESEND_COOLDOWN_SECONDS):
            raise SmsRateLimitError("Повторная отправка кода возможна через 60 секунд")

    code = _generate_sms_code()
    sms_storage[phone] = {
        "code": code,
        "expires_at": now + timedelta(seconds=SMS_CODE_TTL_SECONDS),
        "sent_at": now,
    }
    verified_phones.pop(phone, None)
    print(f"SMS был отправлен на номер {phone}. Код: {code}")


def verify_code(phone: str, code: str) -> bool:
    entry = sms_storage.get(phone)
    if not entry:
        return False

    now = datetime.now(timezone.utc)
    if now > entry["expires_at"]:
        sms_storage.pop(phone, None)
        return False

    if entry["code"] != code:
        return False

    sms_storage.pop(phone, None)
    verified_phones[phone] = now + timedelta(minutes=VERIFICATION_TOKEN_EXPIRE_MINUTES)
    return True


def is_phone_verified(phone: str) -> bool:
    expires_at = verified_phones.get(phone)
    if not expires_at:
        return False
    if datetime.now(timezone.utc) > expires_at:
        verified_phones.pop(phone, None)
        return False
    return True


def consume_verified_phone(phone: str) -> None:
    verified_phones.pop(phone, None)
