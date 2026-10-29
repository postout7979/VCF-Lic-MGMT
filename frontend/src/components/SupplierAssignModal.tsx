import { useEffect, useMemo, useState } from "react";

import { assignItemsToProject, fetchSupplierData } from "../api/client";
import type { LicenseItem, ProjectSummary } from "../types";
import LicenseTypeBadge from "./LicenseTypeBadge";
import Pagination from "./Pagination";

interface Props {
  project: ProjectSummary;
  onClose: () => void;
  onAssigned: () => void;
}

const PAGE_SIZE = 20;

function SupplierAssignModal({ project, onClose, onAssigned }: Props) {
  const [items, setItems] = useState<LicenseItem[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [activeSearch, setActiveSearch] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    fetchSupplierData({ assignableForProject: project.id })
      .then((data) => {
        setItems(data);
        setSelected(new Set(data.filter((item) => item.project_id === project.id).map((item) => item.id)));
      })
      .catch(() => setError("할당 가능한 항목을 불러오지 못했습니다."))
      .finally(() => setLoading(false));
  }, [project.id]);

  const filteredItems = useMemo(() => {
    const query = activeSearch.trim().toLowerCase();
    if (!query) return items;
    return items.filter((item) =>
      [item.enduser_account_name, item.product_name, item.erp_site_id, item.license_key]
        .filter(Boolean)
        .some((field) => field!.toLowerCase().includes(query)),
    );
  }, [items, activeSearch]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE));

  const pagedItems = useMemo(
    () => filteredItems.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filteredItems, page],
  );

  const allSelected = useMemo(
    () => filteredItems.length > 0 && filteredItems.every((item) => selected.has(item.id)),
    [filteredItems, selected],
  );

  function handleSearch() {
    setActiveSearch(searchInput.trim());
    setPage(1);
  }

  function handleClearSearch() {
    setSearchInput("");
    setActiveSearch("");
    setPage(1);
  }

  function toggle(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function toggleAll() {
    setSelected((prev) => {
      if (allSelected) {
        const next = new Set(prev);
        for (const item of filteredItems) next.delete(item.id);
        return next;
      }
      return new Set([...prev, ...filteredItems.map((item) => item.id)]);
    });
  }

  async function handleAssign() {
    setSubmitting(true);
    setError(null);
    try {
      await assignItemsToProject(project.id, Array.from(selected));
      onAssigned();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "할당에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="modal-overlay">
      <div className="modal-box">
        <h2>{project.name} — 공급자 할당</h2>
        <p className="text-muted">
          체크박스로 항목을 선택/해제한 뒤 저장을 눌러주세요. 이미 이 프로젝트에 할당된 항목은
          체크된 상태로 표시됩니다.
        </p>
        {error && <p className="error-text">{error}</p>}
        {!loading && items.length > 0 && (
          <div className="search-bar">
            <input
              type="text"
              placeholder="Enduser Customer Name / Product Name / ERP Site ID / License Key 검색"
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
        )}
        <div className="modal-scroll">
          {loading ? (
            <p style={{ padding: 16 }}>불러오는 중...</p>
          ) : items.length === 0 ? (
            <p style={{ padding: 16 }} className="text-muted">
              할당 가능한 항목이 없습니다. 공급자 데이터 탭에서 먼저 엑셀을 업로드해주세요.
            </p>
          ) : filteredItems.length === 0 ? (
            <p style={{ padding: 16 }} className="text-muted">
              검색 결과가 없습니다.
            </p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>
                    <input type="checkbox" checked={allSelected} onChange={toggleAll} />
                  </th>
                  <th>Enduser Customer Name</th>
                  <th>Product Name</th>
                  <th>ERP Site ID</th>
                  <th>License Type</th>
                  <th>Quantity - ENT</th>
                </tr>
              </thead>
              <tbody>
                {pagedItems.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selected.has(item.id)}
                        onChange={() => toggle(item.id)}
                      />
                    </td>
                    <td>{item.enduser_account_name}</td>
                    <td>{item.product_name}</td>
                    <td>{item.erp_site_id}</td>
                    <td>
                      <LicenseTypeBadge licenseType={item.license_type} />
                    </td>
                    <td>{item.quantity_ent}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={onClose} disabled={submitting}>
            닫기
          </button>
          <button className="btn" onClick={handleAssign} disabled={submitting}>
            저장 ({selected.size})
          </button>
        </div>
      </div>
    </div>
  );
}

export default SupplierAssignModal;
