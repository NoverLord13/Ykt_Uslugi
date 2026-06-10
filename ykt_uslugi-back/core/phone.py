import phonenumbers


def _to_e164(value: str) -> str:
    normalized = value.removeprefix("tel:")
    parsed = phonenumbers.parse(normalized, None)
    return phonenumbers.format_number(parsed, phonenumbers.PhoneNumberFormat.E164)


def phone_to_str(phone) -> str:
    if isinstance(phone, str):
        if phone.startswith("+") and not phone.startswith("tel:"):
            return phone
        return _to_e164(phone)
    return phonenumbers.format_number(phone, phonenumbers.PhoneNumberFormat.E164)


def try_parse_phone(value: str) -> str | None:
    try:
        if value.startswith("tel:") or value.startswith("+"):
            parsed = phonenumbers.parse(value.removeprefix("tel:"), None)
        else:
            parsed = phonenumbers.parse(value, "RU")
        if phonenumbers.is_valid_number(parsed):
            return phonenumbers.format_number(parsed, phonenumbers.PhoneNumberFormat.E164)
    except phonenumbers.NumberParseException:
        return None
    return None
