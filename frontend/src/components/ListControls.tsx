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
  return (
    <div className="search-bar">
      <input
        type="text"
        placeholder={placeholder ?? "검색어를 입력하세요"}
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
      />
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
