import { useMemo, useState } from "react";

export const PAGE_SIZE_OPTIONS = [15, 30, 50] as const;

/** Client-side search + page-size pagination over an already-fetched list. */
export function useListControls<T>(items: T[], matches: (item: T, query: string) => boolean) {
  const [search, setSearchState] = useState("");
  const [pageSize, setPageSizeState] = useState<number>(PAGE_SIZE_OPTIONS[0]);
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return items;
    return items.filter((item) => matches(item, query));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageItems = useMemo(
    () => filtered.slice((safePage - 1) * pageSize, safePage * pageSize),
    [filtered, safePage, pageSize],
  );

  function setSearch(value: string) {
    setSearchState(value);
    setPage(1);
  }

  function setPageSize(size: number) {
    setPageSizeState(size);
    setPage(1);
  }

  return {
    search,
    setSearch,
    pageSize,
    setPageSize,
    page: safePage,
    setPage,
    totalPages,
    total: filtered.length,
    pageItems,
  };
}
