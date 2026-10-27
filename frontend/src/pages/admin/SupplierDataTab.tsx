import { useEffect, useState, type ChangeEvent } from "react";

import { deleteAllSupplierData, searchSupplierData, uploadSupplierData } from "../../api/client";
import Pagination from "../../components/Pagination";
import LicenseTypeBadge from "../../components/LicenseTypeBadge";
import { SEARCHABLE_FIELDS } from "../../types";
import type { LicenseItem, UploadResult } from "../../types";

const PAGE_SIZE = 20;

function isExpired(endDate: string | null): boolean {
  if (!endDate) return false;
  return new Date(endDate) < new Date(new Date().toDateString());
}

function SupplierDataTab() {
  const [items, setItems] = useState<LicenseItem[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [searchField, setSearchField] = useState(SEARCHABLE_FIELDS[0].value);
  const [searchInput, setSearchInput] = useState("");
  const [activeSearch, setActiveSearch] = useState("");
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  function loadItems(targetPage: number, query: string) {
    searchSupplierData({
      page: targetPage,
      pageSize: PAGE_SIZE,
      searchField,
      searchQuery: query,
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
    loadItems(page, activeSearch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, activeSearch, searchField]);

  function handleSearch() {
    setPage(1);
    setActiveSearch(searchInput.trim());
  }

  function handleClearSearch() {
    setSearchInput("");
    setActiveSearch("");
    setPage(1);
  }

  async function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    setResult(null);
    try {
      const res = await uploadSupplierData(file);
      setResult(res);
      loadItems(1, activeSearch);
      setPage(1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "업로드에 실패했습니다.");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function handleDeleteAll() {
    if (!window.confirm("업로드된 공급자 데이터를 모두 삭제할까요? 되돌릴 수 없습니다.")) return;
    setDeleting(true);
    setError(null);
    try {
      await deleteAllSupplierData();
      setActiveSearch("");
      setSearchInput("");
      setPage(1);
      loadItems(1, "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "삭제에 실패했습니다.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div>
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="form-row" style={{ justifyContent: "space-between" }}>
          <div className="form-row" style={{ marginBottom: 0 }}>
            <input type="file" accept=".xlsx,.xlsm" onChange={handleFileChange} disabled={uploading} />
            {uploading && <span className="text-muted">업로드 중...</span>}
          </div>
          <button className="btn btn-danger" onClick={handleDeleteAll} disabled={deleting}>
            {deleting ? "삭제 중..." : "업로드 데이터 전체 삭제"}
          </button>
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
        <div className="search-bar">
          <select value={searchField} onChange={(e) => setSearchField(e.target.value)}>
            {SEARCHABLE_FIELDS.map((field) => (
              <option key={field.value} value={field.value}>
                {field.label}
              </option>
            ))}
          </select>
          <input
            type="text"
            placeholder="검색어를 입력하세요"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
          <button className="btn" onClick={handleSearch}>
            검색
          </button>
          {activeSearch && (
            <button className="btn btn-secondary" onClick={handleClearSearch}>
              초기화
            </button>
          )}
        </div>

        <p className="text-muted" style={{ marginTop: 0 }}>
          총 {total.toLocaleString()}건 {activeSearch && `(검색 결과)`}
        </p>
        <div style={{ overflowX: "auto" }}>
          <table>
            <thead>
              <tr>
                <th>Serial Number</th>
                <th>Parent Customer</th>
                <th>Customer Name</th>
                <th>Product Name</th>
                <th>License Type</th>
                <th>Quantity - ENT</th>
                <th>ERP Site ID</th>
                <th>Contract Status</th>
                <th>Start Date</th>
                <th>End Date</th>
                <th>프로젝트 할당</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>{item.serial_number}</td>
                  <td>{item.parent_customer}</td>
                  <td>{item.customer_name}</td>
                  <td>{item.product_name}</td>
                  <td>
                    <LicenseTypeBadge licenseType={item.license_type} />
                  </td>
                  <td>{item.quantity_ent}</td>
                  <td>{item.erp_site_id}</td>
                  <td>{item.contract_status}</td>
                  <td>{item.start_date}</td>
                  <td>
                    {item.end_date}{" "}
                    {isExpired(item.end_date) && <span className="badge badge-error">만료</span>}
                  </td>
                  <td>{item.project_id ? `#${item.project_id}` : "미할당"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
      </div>
    </div>
  );
}

export default SupplierDataTab;
