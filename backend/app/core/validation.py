def is_valid_email_format(value: str) -> bool:
    """Minimal format check: exactly one "@", with at least one character
    before and after it."""
    at = value.find("@")
    if at <= 0:
        return False
    if value.find("@", at + 1) != -1:
        return False
    return at < len(value) - 1
