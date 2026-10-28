import { useEffect, useMemo, useState } from "react";

import { assignCspItemsToProject, fetchCspData } from "../api/client";
import type { CspLicenseItem, ProjectSummary } from "../types";

interface Props {
  project: ProjectSummary;
  onClose: () => void;
  onAssigned: () => void;
}

function CspAssignModal({ project, onClose, onAssigned }: Props) {
  const [items, setItems] = useState<CspLicenseItem[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCspData({ assignableForProject: project.id })
      .then((data) => {
        setItems(data);
        setSelected(new Set(data.filter((item) => item.project_id === project.id).map((item) => item.id)));
      })
      .catch(() => setError("할당 가능한 CSP 항목을 불러오지 못했습니다."))
      .finally(() => setLoading(false));
  }, [project.id]);

  const allSelected = useMemo(
    () => items.length > 0 && selected.size === items.length,
    [items, selected],
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
    setSelected(allSelected ? new Set() : new Set(items.map((item) => item.id)));
  }

  async function handleAssign() {
    setSubmitting(true);
    setError(null);
    try {
      await assignCspItemsToProject(project.id, Array.from(selected));
      onAssigned();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "할당에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <h2>{project.name} — CSP 할당</h2>
        <p className="text-muted">
          체크박스로 항목을 선택/해제한 뒤 저장을 눌러주세요. 이미 이 프로젝트에 할당된 항목은
          체크된 상태로 표시됩니다.
        </p>
        {error && <p className="error-text">{error}</p>}
        <div className="modal-scroll">
          {loading ? (
            <p style={{ padding: 16 }}>불러오는 중...</p>
          ) : items.length === 0 ? (
            <p style={{ padding: 16 }} className="text-muted">
              할당 가능한 CSP 항목이 없습니다. CSP 현황 탭에서 먼저 엑셀을 업로드해주세요.
            </p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>
                    <input type="checkbox" checked={allSelected} onChange={toggleAll} />
                  </th>
                  <th>Folder Name</th>
                  <th>Product Name</th>
                  <th>Quantity</th>
                  <th>Contract End Date</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selected.has(item.id)}
                        onChange={() => toggle(item.id)}
                      />
                    </td>
                    <td>{item.folder_name ?? "-"}</td>
                    <td>{item.product_name ?? "-"}</td>
                    <td>
                      {item.quantity.toLocaleString()} {item.unit ?? ""}
                    </td>
                    <td>{item.contract_end_date ?? "-"}</td>
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

export default CspAssignModal;
