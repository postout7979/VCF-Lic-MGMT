from datetime import date, datetime
from typing import BinaryIO

from openpyxl import load_workbook
from sqlalchemy.orm import Session

from app.models.csp_data import CspLicenseItem
from app.schemas.csp_data import CspUploadResult

# Maps the exact column header text in the Broadcom CSP portal's
# "AllLicenseKeys" export to the CspLicenseItem attribute it feeds.
COLUMN_MAP: dict[str, str] = {
    "License Key": "license_key",
    "Product Name": "product_name",
    "Quantity": "quantity",
    "Folder Name": "folder_name",
    "Contract End Date": "contract_end_date",
}

REQUIRED_HEADERS = set(COLUMN_MAP.keys())

DATE_FORMATS = (
    "%m/%d/%y %I:%M:%S %p",
    "%m/%d/%Y %I:%M:%S %p",
    "%m/%d/%y",
    "%m/%d/%Y",
    "%Y-%m-%d",
)


def _parse_date(value) -> date | None:
    if value is None or value == "":
        return None
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date):
        return value
    text = str(value).strip()
    for fmt in DATE_FORMATS:
        try:
            return datetime.strptime(text, fmt).date()
        except ValueError:
            continue
    return None


def _parse_quantity(value) -> tuple[int, str | None]:
    """Quantity arrives as a single "<number> <unit>" cell (eg. "1432 Core",
    "48 Instance", "32 TiB") - split it into the numeric amount and unit."""
    if value is None or value == "":
        return 0, None
    text = str(value).strip()
    parts = text.split(" ", 1)
    try:
        quantity = int(float(parts[0].replace(",", "")))
    except ValueError:
        quantity = 0
    unit = parts[1].strip() if len(parts) > 1 and parts[1].strip() else None
    return quantity, unit


def _clean_str(value) -> str | None:
    if value is None:
        return None
    text = str(value).strip()
    return text or None


def import_csp_excel(db: Session, file_obj: BinaryIO, upload_name: str) -> CspUploadResult:
    workbook = load_workbook(file_obj, data_only=True, read_only=True)
    sheet = workbook.active

    rows = sheet.iter_rows(values_only=True)
    header_row = next(rows, None)
    if header_row is None:
        return CspUploadResult(inserted=0, updated=0, skipped=0, errors=["빈 파일입니다."])

    headers = [str(h).strip() if h is not None else "" for h in header_row]
    col_index = {name: idx for idx, name in enumerate(headers)}

    missing = REQUIRED_HEADERS - set(col_index.keys())
    if missing:
        raise ValueError(f"필수 컬럼이 없습니다: {', '.join(sorted(missing))}")

    inserted = 0
    updated = 0
    skipped = 0
    errors: list[str] = []

    def cell(row: tuple, header: str):
        idx = col_index[header]
        return row[idx] if idx < len(row) else None

    for row_number, row in enumerate(rows, start=2):
        if row is None or all(c is None for c in row):
            continue

        license_key = _clean_str(cell(row, "License Key"))
        if not license_key:
            skipped += 1
            errors.append(f"{row_number}행: License Key가 없어 건너뜀")
            continue

        quantity, unit = _parse_quantity(cell(row, "Quantity"))
        product_name = _clean_str(cell(row, "Product Name"))
        folder_name = _clean_str(cell(row, "Folder Name"))

        # No stable per-row identity exists in this export (the same
        # product can legitimately appear more than once under the same
        # folder, as separate license grants) - every row becomes its own
        # entry rather than being merged/overwritten by a guessed key.
        # Re-importing the same export deletes its old upload batch first
        # (see the Settings > CSP 현황 tab's 개별 삭제).
        db.add(
            CspLicenseItem(
                upload_name=upload_name,
                license_key=license_key,
                product_name=product_name,
                quantity=quantity,
                unit=unit,
                folder_name=folder_name,
                contract_end_date=_parse_date(cell(row, "Contract End Date")),
            )
        )
        inserted += 1

    db.commit()
    return CspUploadResult(inserted=inserted, updated=updated, skipped=skipped, errors=errors)
