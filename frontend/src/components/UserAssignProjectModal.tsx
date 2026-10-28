import { useEffect, useState } from "react";

import { assignUserProject, fetchProjects } from "../api/client";
import type { ProjectSummary, User } from "../types";

interface Props {
  user: User;
  onClose: () => void;
  onAssigned: () => void;
}

function UserAssignProjectModal({ user, onClose, onAssigned }: Props) {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [projectId, setProjectId] = useState<number | null>(user.project_id);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchProjects()
      .then(setProjects)
      .catch(() => setError("프로젝트 목록을 불러오지 못했습니다."))
      .finally(() => setLoading(false));
  }, []);

  async function handleAssign() {
    setSubmitting(true);
    setError(null);
    try {
      await assignUserProject(user.id, projectId);
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
      <div className="modal-box narrow" onClick={(e) => e.stopPropagation()}>
        <h2>{user.username} — 프로젝트 할당</h2>
        <p className="text-muted">이 사용자를 할당할 프로젝트를 선택하세요.</p>
        {error && <p className="error-text">{error}</p>}
        {loading ? (
          <p>불러오는 중...</p>
        ) : (
          <div className="form-field" style={{ marginTop: 16 }}>
            <label>프로젝트</label>
            <select
              value={projectId ?? ""}
              onChange={(e) => setProjectId(e.target.value ? Number(e.target.value) : null)}
            >
              <option value="">할당 안 함</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>
        )}
        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={onClose} disabled={submitting}>
            취소
          </button>
          <button className="btn" onClick={handleAssign} disabled={submitting || loading}>
            {submitting ? "저장 중..." : "저장"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default UserAssignProjectModal;
