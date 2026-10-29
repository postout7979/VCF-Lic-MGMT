import { useEffect, useState, type ChangeEvent } from "react";

import { deleteAllCspData, deleteExpiredCspData, searchCspData, uploadCspData } from "../../api/client";
import CspDeleteUploadsModal from "../../components/CspDeleteUploadsModal";
import ListControls from "../../components/ListControls";
import Pagination from "../../components/Pagination";
import { PAGE_SIZE_OPTIONS, type FilterCondition } from "../../hooks/useListControls";
import { CSP_SEARCHABLE_FIELDS } from "../../types";
import type { CspLicenseItem, UploadResult } from "../../types";

const COLUMNS: { field: string; label: string; sortable: boolean }[] = [
  { field: "upload_name", label: "업로드 이름", sortable: true },
  { field: "folder_name", label: "Folder Name", sortable: true },
  { field: "product_name", label: "Product Name", sortable: true },
  { field: "license_key", label: "License Key", sortable: true },
  { field: "quantity", label: "Quantity", sortable: true },
  { field: "unit", label: "Unit", sortable: true },
  { field: "contract_end_date", label: "Contract End Date", sortable: true },
  { field: "project_id", label: "프로젝트 할당", sortable: false },
];

function isExpired(endDate: string | null): boolean {
  if (!endDate) return false;
  return new Date(endDate) < new Date(new Date().toDateString());
}

function CspDataTab() {
  const [items, setItems] = useState<CspLicenseItem[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSizeState] = useState<number>(PAGE_SIZE_OPTIONS[0]);
  const [filters, setFiltersState] = useState<FilterCondition[]>([]);
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [uploadName, setUploadName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deletingExpired, setDeletingExpired] = useState(false);
  const [showDeleteUploads, setShowDeleteUploads] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  function loadItems(targetPage: number) {
    searchCspData({
      page: targetPage,
      pageSize,
      filters,
      sortField: sortField ?? undefined,
      sortOrder,
    })
      .then((data) => {
        setItems(data.items);
        setTotal(data.total);
        setTotalPages(data.total_pages);
        setPage(data.page);
      })
      .catch(() => undefined);
  }

  useEffect(() => {
    loadItems(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, filters, pageSize, sortField, sortOrder]);

  function handleFiltersChange(next: FilterCondition[]) {
    setFiltersState(next.filter((f) => f.value.trim() !== ""));
    setPage(1);
  }

  function handlePageSizeChange(size: number) {
    setPageSizeState(size);
    setPage(1);
  }

  function handleSort(field: string) {
    if (sortField === field) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  }

  async function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!uploadName.trim()) {
      setError("업로드 이름을 먼저 입력해주세요.");
      e.target.value = "";
      return;
    }
    setUploading(true);
    setError(null);
    setResult(null);
    try {
      const res = await uploadCspData(file, uploadName.trim());
      setResult(res);
      loadItems(1);
      setPage(1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "업로드에 실패했습니다.");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function handleDeleteAll() {
    if (!window.confirm("업로드된 CSP 데이터를 모두 삭제할까요? 되돌릴 수 없습니다.")) return;
    setDeleting(true);
    setError(null);
    try {
      await deleteAllCspData();
      setFiltersState([]);
      setPage(1);
      loadItems(1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "삭제에 실패했습니다.");
    } finally {
      setDeleting(false);
    }
  }

  async function handleDeleteExpired() {
    if (
      !window.confirm(
        "Contract End Date가 오늘 이전인 만료 항목을 모두 삭제할까요? 한번 삭제하면 복구할 수 없습니다.",
      )
    ) {
      return;
    }
    setDeletingExpired(true);
    setError(null);
    try {
      await deleteExpiredCspData();
      loadItems(1);
      setPage(1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "삭제에 실패했습니다.");
    } finally {
      setDeletingExpired(false);
    }
  }

  function sortIndicator(field: string) {
    if (sortField !== field) return "";
    return sortOrder === "asc" ? " ▲" : " ▼";
  }

  return (
    <div>
      <div className="card" style={{ marginBottom: 20 }}>
        <p className="text-muted" style={{ marginTop: 0 }}>
          Broadcom CSP 포털의 "AllLicenseKeys" 엑셀 내보내기를 업로드하세요. (License Key / Product
          Name / Quantity / Folder Name / Contract End Date)
        </p>
        <div className="form-row" style={{ justifyContent: "space-between" }}>
          <div className="form-row" style={{ marginBottom: 0 }}>
            <input
              type="text"
              placeholder="업로드 이름"
              value={uploadName}
              onChange={(e) => setUploadName(e.target.value)}
              style={{ width: 200 }}
            />
            <input type="file" accept=".xlsx,.xlsm" onChange={handleFileChange} disabled={uploading} />
            {uploading && <span className="text-muted">업로드 중...</span>}
          </div>
          <div className="form-row" style={{ marginBottom: 0 }}>
            <button className="btn btn-secondary" onClick={() => setShowDeleteUploads(true)}>
              개별 삭제
            </button>
            <button className="btn btn-danger" onClick={handleDeleteExpired} disabled={deletingExpired}>
              {deletingExpired ? "삭제 중..." : "만료 항목 삭제"}
            </button>
            <button className="btn btn-danger" onClick={handleDeleteAll} disabled={deleting}>
              {deleting ? "삭제 중..." : "전체 삭제"}
            </button>
          </div>
        </div>
        {error && <p className="error-text">{error}</p>}
        {result && (
          <p className="success-text">
            업로드 완료 — 신규 {result.inserted}건, 갱신 {result.updated}건, 건너뜀 {result.skipped}건
            {result.errors.length > 0 && ` (경고 ${result.errors.length}건)`}
          </p>
        )}
      </div>

      <div className="card">
        <p className="text-muted" style={{ marginTop: 0 }}>
          Product Name이 "vSphere" 또는 "VMware vSphere"로 시작하는 항목만 기본적으로 표시됩니다.
        </p>
        <ListControls
          fields={CSP_SEARCHABLE_FIELDS}
          filters={filters}
          onFiltersChange={handleFiltersChange}
          pageSize={pageSize}
          onPageSizeChange={handlePageSizeChange}
          total={total}
          placeholder="검색어를 입력하세요"
        />
        <div style={{ overflowX: "auto" }}>
          <table>
            <thead>
              <tr>
                {COLUMNS.map((col) => (
                  <th
                    key={col.field}
                    onClick={col.sortable ? () => handleSort(col.field) : undefined}
                    style={col.sortable ? { cursor: "pointer", userSelect: "none" } : undefined}
                  >
                    {col.label}
                    {col.sortable && sortIndicator(col.field)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>{item.upload_name}</td>
                  <td>{item.folder_name}</td>
                  <td>{item.product_name}</td>
                  <td>{item.license_key}</td>
                  <td>{item.quantity.toLocaleString()}</td>
                  <td>{item.unit}</td>
                  <td>
                    {item.contract_end_date}{" "}
                    {isExpired(item.contract_end_date) && <span className="badge badge-error">만료</span>}
                  </td>
                  <td>{item.project_id ? `#${item.project_id}` : "미할당"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
      </div>

      {showDeleteUploads && (
        <CspDeleteUploadsModal
          onClose={() => setShowDeleteUploads(false)}
          onDeleted={() => loadItems(1)}
        />
      )}
    </div>
  );
}

export default CspDataTab;
