import json

from fastapi import HTTPException
from sqlalchemy.orm import Query


def apply_filters(query: Query, filters_json: str | None, searchable_fields: dict) -> Query:
    """Applies a JSON-encoded list of `{"field": ..., "value": ...}` filter
    conditions as AND'd ILIKE substring matches - the server-side
    equivalent of the ListControls multi-filter UI, for endpoints whose
    list is too large to filter client-side."""
    if not filters_json:
        return query

    try:
        conditions = json.loads(filters_json)
    except (ValueError, TypeError) as exc:
        raise HTTPException(status_code=400, detail="필터 형식이 올바르지 않습니다.") from exc
    if not isinstance(conditions, list):
        raise HTTPException(status_code=400, detail="필터 형식이 올바르지 않습니다.")

    for condition in conditions:
        if not isinstance(condition, dict):
            continue
        field = condition.get("field")
        value = (condition.get("value") or "").strip()
        if not field or not value:
            continue
        column = searchable_fields.get(field)
        if column is None:
            raise HTTPException(status_code=400, detail=f"검색할 수 없는 항목입니다: {field}")
        query = query.filter(column.ilike(f"%{value}%"))

    return query
