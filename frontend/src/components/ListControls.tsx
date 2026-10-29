import { useEffect, useState } from "react";

import { PAGE_SIZE_OPTIONS } from "../hooks/useListControls";

interface Props {
  search: string;
  onSearchChange: (value: string) => void;
  pageSize: number;
  onPageSizeChange: (size: number) => void;
  total: number;
  placeholder?: string;
}

function ListControls({ search, onSearchChange, pageSize, onPageSizeChange, total, placeholder }: Props) {
  const [draft, setDraft] = useState(search);

  useEffect(() => {
    setDraft(search);
  }, [search]);

  function handleSearch() {
    onSearchChange(draft.trim());
  }

  function handleClear() {
    setDraft("");
    onSearchChange("");
  }

  return (
    <div className="search-bar">
      <input
        type="text"
        placeholder={placeholder ?? "검색어를 입력하세요"}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleSearch()}
      />
      <button className="btn" onClick={handleSearch}>
        검색
      </button>
      {search && (
        <button className="btn btn-secondary" onClick={handleClear}>
          초기화
        </button>
      )}
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
  );
}

export default ListControls;
