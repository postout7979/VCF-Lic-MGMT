import { useEffect, useMemo, useState } from "react";

import { assignVcfOpsItemsToProject, fetchVcfOpsItems } from "../api/client";
import type { ProjectSummary, VcfOpsCoreLicenseItem } from "../types";
import { isVcfAssignableLicense } from "../utils/vsphere";

interface Props {
  project: ProjectSummary;
  onClose: () => void;
  onAssigned: () => void;
}

const SEARCH_FIELDS: { value: string; label: string; getValue: (item: VcfOpsCoreLicenseItem) => string | null }[] = [
  { value: "connection_name", label: "연결 이름", getValue: (item) => item.connection_name },
  { value: "connection_host", label: "VCF Ops 이름", getValue: (item) => item.connection_host },
  { value: "domain_name", label: "vCenter 이름", getValue: (item) => item.domain_name },
  { value: "license_key", label: "License Name", getValue: (item) => item.license_key },
];

function VcfOpsAssignModal({ project, onClose, onAssigned }: Props) {
  const [items, setItems] = useState<VcfOpsCoreLicenseItem[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchField, setSearchField] = useState(SEARCH_FIELDS[0].value);
  const [searchInput, setSearchInput] = useState("");
  const [activeSearch, setActiveSearch] = useState("");

  useEffect(() => {
    fetchVcfOpsItems({ assignableForProject: project.id })
      .then((data) => {
        setItems(data);
        setSelected(new Set(data.filter((item) => item.project_id === project.id).map((item) => item.id)));
      })
      .catch(() => setError("할당 가능한 VCF 항목을 불러오지 못했습니다."))
      .finally(() => setLoading(false));
  }, [project.id]);

  // Only Cloud Foundation / vSphere Foundation licenses are offered for new
  // picks here; items already assigned to this project under another
  // license stay selected (so saving doesn't silently unassign them) even
  // though they're filtered out of view.
  const visibleItems = useMemo(() => items.filter((item) => isVcfAssignableLicense(item.license_key)), [items]);

  const filteredItems = useMemo(() => {
    const query = activeSearch.trim().toLowerCase();
    if (!query) return visibleItems;
    const field = SEARCH_FIELDS.find((f) => f.value === searchField) ?? SEARCH_FIELDS[0];
    return visibleItems.filter((item) => (field.getValue(item) ?? "").toLowerCase().includes(query));
  }, [visibleItems, activeSearch, searchField]);

  function handleSearch() {
    setActiveSearch(searchInput.trim());
  }

  function handleClearSearch() {
    setSearchInput("");
    setActiveSearch("");
  }

  const allSelected = useMemo(
    () => filteredItems.length > 0 && filteredItems.every((item) => selected.has(item.id)),
    [filteredItems, selected],
  );

  function toggle(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
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
      await assignVcfOpsItemsToProject(project.id, Array.from(selected));
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
        <h2>{project.name} — VCF 할당</h2>
        <p className="text-muted">
          "VMware Cloud Foundation", "VMware vSphere Foundation" 항목만 표시됩니다. 체크박스로
          항목을 선택/해제한 뒤 저장을 눌러주세요.
        </p>
        {error && <p className="error-text">{error}</p>}
        {!loading && visibleItems.length > 0 && (
          <div className="search-bar">
            <select value={searchField} onChange={(e) => setSearchField(e.target.value)}>
              {SEARCH_FIELDS.map((field) => (
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
        )}
        <div className="modal-scroll">
          {loading ? (
            <p style={{ padding: 16 }}>불러오는 중...</p>
          ) : items.length === 0 ? (
            <p style={{ padding: 16 }} className="text-muted">
              할당 가능한 VCF 항목이 없습니다. 설정 &gt; VCF 탭에서 먼저 VCF Operations 연결을
              추가해주세요.
            </p>
          ) : visibleItems.length === 0 ? (
            <p style={{ padding: 16 }} className="text-muted">
              "VMware Cloud Foundation" 또는 "VMware vSphere Foundation" 라이센스 항목이 없습니다.
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
                  <th>연결 이름</th>
                  <th>VCF Ops 이름</th>
                  <th>vCenter 이름</th>
                  <th>License Name</th>
                  <th>사용 코어 수</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selected.has(item.id)}
                        onChange={() => toggle(item.id)}
                      />
                    </td>
                    <td>{item.connection_name ?? "-"}</td>
                    <td>{item.connection_host ?? "-"}</td>
                    <td>{item.domain_name ?? "-"}</td>
                    <td>{item.license_key ?? "-"}</td>
                    <td>{item.core_used ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
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

export default VcfOpsAssignModal;
