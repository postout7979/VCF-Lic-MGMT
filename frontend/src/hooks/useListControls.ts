import { useMemo, useState } from "react";

export const PAGE_SIZE_OPTIONS = [10, 25, 50] as const;

export interface SearchFieldDef<T> {
  value: string;
  label: string;
  getValue: (item: T) => string | null | undefined;
}

export interface FilterCondition {
  field: string;
  value: string;
}

/** Client-side multi-filter search + page-size pagination over an
 * already-fetched list. Each active filter is a (field, value) pair; an
 * item must match every active filter's substring (AND) to stay in the
 * result - so adding a filter always narrows whatever is already showing. */
export function useListControls<T>(items: T[], fields: SearchFieldDef<T>[]) {
  const [filters, setFiltersState] = useState<FilterCondition[]>([]);
  const [pageSize, setPageSizeState] = useState<number>(PAGE_SIZE_OPTIONS[0]);
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    if (filters.length === 0) return items;
    return items.filter((item) =>
      filters.every(({ field, value }) => {
        const query = value.trim().toLowerCase();
        if (!query) return true;
        const fieldDef = fields.find((f) => f.value === field) ?? fields[0];
        if (!fieldDef) return true;
        return (fieldDef.getValue(item) ?? "").toLowerCase().includes(query);
      }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, filters]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageItems = useMemo(
    () => filtered.slice((safePage - 1) * pageSize, safePage * pageSize),
    [filtered, safePage, pageSize],
  );

  function setFilters(next: FilterCondition[]) {
    setFiltersState(next.filter((f) => f.value.trim() !== ""));
    setPage(1);
  }

  function setPageSize(size: number) {
    setPageSizeState(size);
    setPage(1);
  }

  return {
    fields,
    filters,
    setFilters,
    pageSize,
    setPageSize,
    page: safePage,
    setPage,
    totalPages,
    total: filtered.length,
    pageItems,
  };
}
