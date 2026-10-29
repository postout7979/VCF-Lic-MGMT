import { useState } from "react";

import { updateProject } from "../api/client";
import type { ProjectSummary } from "../types";

interface Props {
  project: ProjectSummary;
  onClose: () => void;
  onUpdated: () => void;
}

function ProjectEditModal({ project, onClose, onUpdated }: Props) {
  const [name, setName] = useState(project.name);
  const [location, setLocation] = useState(project.location ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!name.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      await updateProject(project.id, { name: name.trim(), location: location.trim() });
      onUpdated();
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
        <h2>프로젝트 수정</h2>

        <div className="form-grid" style={{ marginTop: 16 }}>
          <div className="form-field" style={{ gridColumn: "1 / -1" }}>
            <label>프로젝트명</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="form-field" style={{ gridColumn: "1 / -1" }}>
            <label>위치</label>
            <input
              type="text"
              placeholder="예: 서울 본사 데이터센터"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>
        </div>

        {error && <p className="error-text">{error}</p>}

        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={onClose} disabled={submitting}>
            취소
          </button>
          <button className="btn" onClick={handleSubmit} disabled={submitting || !name.trim()}>
            {submitting ? "저장 중..." : "저장"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ProjectEditModal;
