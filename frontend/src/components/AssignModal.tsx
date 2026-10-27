import { useEffect, useMemo, useState } from "react";

import { assignItemsToProject, fetchSupplierData } from "../api/client";
import type { LicenseItem, ProjectSummary } from "../types";
import LicenseTypeBadge from "./LicenseTypeBadge";

interface Props {
  project: ProjectSummary;
  onClose: () => void;
  onAssigned: () => void;
}

function AssignModal({ project, onClose, onAssigned }: Props) {
  const [items, setItems] = useState<LicenseItem[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSupplierData(true)
      .then(setItems)
      .catch(() => setError("할당 가능한 항목을 불러오지 못했습니다."))
      .finally(() => setLoading(false));
  }, []);

  const allSelected = useMemo(
    () => items.length > 0 && selected.size === items.length,
    [items, selected],
  );

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
    setSelected(allSelected ? new Set() : new Set(items.map((item) => item.id)));
  }

  async function handleAssign() {
    if (selected.size === 0) return;
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
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <h2>{project.name}</h2>
        <p className="text-muted">
          아직 프로젝트에 할당되지 않은 항목입니다. 체크박스로 선택한 뒤 Assign을 눌러주세요.
        </p>
        {error && <p className="error-text">{error}</p>}
        <div className="modal-scroll">
          {loading ? (
            <p style={{ padding: 16 }}>불러오는 중...</p>
          ) : items.length === 0 ? (
            <p style={{ padding: 16 }} className="text-muted">
              할당 가능한 항목이 없습니다. 공급자 데이터 탭에서 먼저 엑셀을 업로드해주세요.
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
                {items.map((item) => (
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
        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={onClose} disabled={submitting}>
            닫기
          </button>
          <button className="btn" onClick={handleAssign} disabled={submitting || selected.size === 0}>
            Assign ({selected.size})
          </button>
        </div>
      </div>
    </div>
  );
}

export default AssignModal;
