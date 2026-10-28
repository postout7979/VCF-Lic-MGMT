import { useState } from "react";

interface Props {
  connectionName: string;
  currentMinutes: number;
  onClose: () => void;
  onSave: (minutes: number) => Promise<void>;
}

function SyncIntervalModal({ connectionName, currentMinutes, onClose, onSave }: Props) {
  const [minutes, setMinutes] = useState(currentMinutes);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = minutes >= 1;

  async function handleSubmit() {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      await onSave(minutes);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "저장에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="modal-overlay">
      <div className="modal-box narrow">
        <h2>동기화 주기 설정</h2>
        <p className="text-muted">{connectionName}이(가) 자동으로 다시 동기화되는 주기입니다.</p>

        <div className="form-field" style={{ marginTop: 16 }}>
          <label>동기화 주기 (분)</label>
          <input
            type="text"
            inputMode="numeric"
            value={minutes}
            onChange={(e) => setMinutes(Number(e.target.value.replace(/\D/g, "")) || 0)}
          />
        </div>

        {error && <p className="error-text">{error}</p>}

        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={onClose} disabled={submitting}>
            취소
          </button>
          <button className="btn" onClick={handleSubmit} disabled={submitting || !canSubmit}>
            {submitting ? "저장 중..." : "저장"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default SyncIntervalModal;
