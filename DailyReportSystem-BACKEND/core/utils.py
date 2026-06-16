import datetime
import uuid

def luhn_checksum(number: str) -> str:
    digits = [int(d) for d in number]
    checksum = 0
    parity = len(digits) % 2

    for i, digit in enumerate(digits):
        if i % 2 == parity:
            digit *= 2
            if digit > 9:
                digit -= 9
        checksum += digit

    return str((10 - (checksum % 10)) % 10)


def uuid_to_numeric_entropy(u: uuid.UUID, length: int = 8) -> str:
    numeric = "".join(str(int(c, 16)) for c in u.hex)
    return numeric[:length]


def generate_reference(
    *,
    prefix: str,
    entity_uuid: uuid.UUID,
    entropy_length: int = 8,
    include_year: bool = True,
) -> str:
    """
    Generic reference generator.

    Example:
        generate_reference(
            prefix="ORG",
            entity_uuid=uuid.uuid4()
        )

    Output:
        ORG2026943815273
    """

    year = str(datetime.datetime.now().year) if include_year else ""

    entropy = uuid_to_numeric_entropy(entity_uuid, entropy_length)

    base_numeric = f"{year}{entropy}"
    checksum = luhn_checksum(base_numeric)

    return f"{prefix}{base_numeric}{checksum}"
