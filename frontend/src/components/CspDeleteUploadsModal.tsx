import { useEffect, useState } from "react";

import { deleteCspUploadBatches, fetchCspUploadBatches } from "../api/client";
import type { UploadBatch } from "../types";

interface Props {
  onClose: () => void;
  onDeleted: () => void;
}

function CspDeleteUploadsModal({ onClose, onDeleted }: Props) {
  const [batches, setBatches] = useState<UploadBatch[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCspUploadBatches()
      .then(setBatches)
      .catch(() => setError("업로드 목록을 불러오지 못했습니다."))
      .finally(() => setLoading(false));
  }, []);

  function toggle(name: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  async function handleDelete() {
    if (selected.size === 0) return;
    if (!window.confirm(`선택한 ${selected.size}개 업로드를 삭제할까요? 되돌릴 수 없습니다.`)) {
      return;
    }
    setDeleting(true);
    setError(null);
    try {
      await deleteCspUploadBatches(Array.from(selected));
      onDeleted();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "삭제에 실패했습니다.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box narrow" onClick={(e) => e.stopPropagation()}>
        <h2>CSP 업로드 개별 삭제</h2>
        <p className="text-muted">삭제할 업로드를 선택하세요.</p>
        {error && <p className="error-text">{error}</p>}
        <div className="modal-scroll">
          {loading ? (
            <p style={{ padding: 16 }}>불러오는 중...</p>
          ) : batches.length === 0 ? (
            <p style={{ padding: 16 }} className="text-muted">
              업로드된 데이터가 없습니다.
            </p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th></th>
                  <th>업로드 이름</th>
                  <th>업로드 날짜</th>
                  <th>건수</th>
                </tr>
              </thead>
              <tbody>
                {batches.map((batch) => (
                  <tr key={batch.upload_name}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selected.has(batch.upload_name)}
                        onChange={() => toggle(batch.upload_name)}
                      />
                    </td>
                    <td>{batch.upload_name}</td>
                    <td>{new Date(batch.uploaded_at).toLocaleString()}</td>
                    <td>{batch.item_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={onClose} disabled={deleting}>
            닫기
          </button>
          <button className="btn btn-danger" onClick={handleDelete} disabled={deleting || selected.size === 0}>
            선택 삭제 ({selected.size})
          </button>
        </div>
      </div>
    </div>
  );
}

export default CspDeleteUploadsModal;
