import { useEffect, useRef, useState } from "react";

import type { FilterCondition } from "../hooks/useListControls";
import { PAGE_SIZE_OPTIONS } from "../hooks/useListControls";

interface DraftFilter {
  id: number;
  field: string;
  value: string;
}

interface Props {
  fields: { value: string; label: string }[];
  filters: FilterCondition[];
  onFiltersChange: (filters: FilterCondition[]) => void;
  pageSize: number;
  onPageSizeChange: (size: number) => void;
  total: number;
  placeholder?: string;
}

function ListControls({
  fields,
  filters,
  onFiltersChange,
  pageSize,
  onPageSizeChange,
  total,
  placeholder,
}: Props) {
  const nextId = useRef(0);
  const [draft, setDraft] = useState<DraftFilter[]>(() => [
    { id: nextId.current++, field: fields[0]?.value ?? "", value: "" },
  ]);

  // Only resync the draft from committed filters when they're cleared out
  // from outside (e.g. the 초기화 button) - otherwise typing would be
  // clobbered by this effect on every keystroke's re-render.
  useEffect(() => {
    if (filters.length === 0) {
      setDraft([{ id: nextId.current++, field: fields[0]?.value ?? "", value: "" }]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.length === 0]);

  function handleSearch() {
    onFiltersChange(draft.map(({ field, value }) => ({ field, value })));
  }

  function handleClear() {
    setDraft([{ id: nextId.current++, field: fields[0]?.value ?? "", value: "" }]);
    onFiltersChange([]);
  }

  function addFilterRow() {
    setDraft((prev) => [...prev, { id: nextId.current++, field: fields[0]?.value ?? "", value: "" }]);
  }

  function removeFilterRow(id: number) {
    setDraft((prev) => (prev.length > 1 ? prev.filter((row) => row.id !== id) : prev));
  }

  function updateFilterRow(id: number, patch: Partial<Pick<DraftFilter, "field" | "value">>) {
    setDraft((prev) => prev.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  }

  const hasActiveFilters = filters.some((f) => f.value.trim() !== "");

  return (
    <div className="search-bar-group">
      {draft.map((row, i) => (
        <div className="search-bar" key={row.id}>
          {fields.length > 1 && (
            <select
              value={row.field}
              onChange={(e) => updateFilterRow(row.id, { field: e.target.value })}
            >
              {fields.map((field) => (
                <option key={field.value} value={field.value}>
                  {field.label}
                </option>
              ))}
            </select>
          )}
          <input
            type="text"
            placeholder={placeholder ?? "검색어를 입력하세요"}
            value={row.value}
            onChange={(e) => updateFilterRow(row.id, { value: e.target.value })}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
          {draft.length > 1 && (
            <button
              className="btn btn-secondary"
              title="필터 제거"
              onClick={() => removeFilterRow(row.id)}
            >
              ✕
            </button>
          )}
          {i === draft.length - 1 && (
            <>
              <button className="btn btn-secondary" onClick={addFilterRow}>
                + 필터 추가
              </button>
              <button className="btn" onClick={handleSearch}>
                검색
              </button>
              {hasActiveFilters && (
                <button className="btn btn-secondary" onClick={handleClear}>
                  초기화
                </button>
              )}
            </>
          )}
        </div>
      ))}
      <div className="search-bar" style={{ justifyContent: "flex-end" }}>
        <select
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
          style={{ flex: "0 0 130px" }}
        >
          {PAGE_SIZE_OPTIONS.map((size) => (
            <option key={size} value={size}>
              {size}줄씩 보기
            </option>
          ))}
        </select>
        <span className="text-muted" style={{ alignSelf: "center", whiteSpace: "nowrap" }}>
          총 {total.toLocaleString()}건
        </span>
      </div>
    </div>
  );
}

export default ListControls;
