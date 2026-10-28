import { useEffect, useMemo, useState } from "react";

import { assignUserProject, fetchProjects } from "../api/client";
import type { ProjectSummary, User } from "../types";

interface Props {
  user: User;
  onClose: () => void;
  onAssigned: () => void;
}

function UserAssignProjectModal({ user, onClose, onAssigned }: Props) {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set(user.project_ids));
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchProjects()
      .then(setProjects)
      .catch(() => setError("프로젝트 목록을 불러오지 못했습니다."))
      .finally(() => setLoading(false));
  }, []);

  const filteredProjects = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return projects;
    return projects.filter((project) => project.name.toLowerCase().includes(query));
  }, [projects, search]);

  const allSelected = useMemo(
    () => filteredProjects.length > 0 && filteredProjects.every((project) => selected.has(project.id)),
    [filteredProjects, selected],
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
        for (const project of filteredProjects) next.delete(project.id);
        return next;
      }
      return new Set([...prev, ...filteredProjects.map((project) => project.id)]);
    });
  }

  async function handleAssign() {
    setSubmitting(true);
    setError(null);
    try {
      await assignUserProject(user.id, Array.from(selected));
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
      <div className="modal-box narrow">
        <h2>{user.username} — 프로젝트 할당</h2>
        <p className="text-muted">
          체크박스로 이 사용자가 볼 수 있는 프로젝트를 선택/해제한 뒤 저장을 눌러주세요. 여러 개를
          선택할 수 있습니다.
        </p>
        {error && <p className="error-text">{error}</p>}
        {!loading && projects.length > 0 && (
          <div className="search-bar">
            <input
              type="text"
              placeholder="프로젝트명 검색"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        )}
        <div className="modal-scroll">
          {loading ? (
            <p style={{ padding: 16 }}>불러오는 중...</p>
          ) : projects.length === 0 ? (
            <p style={{ padding: 16 }} className="text-muted">
              생성된 프로젝트가 없습니다. 설정 &gt; 프로젝트 탭에서 먼저 생성해주세요.
            </p>
          ) : filteredProjects.length === 0 ? (
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
                  <th>프로젝트명</th>
                </tr>
              </thead>
              <tbody>
                {filteredProjects.map((project) => (
                  <tr key={project.id}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selected.has(project.id)}
                        onChange={() => toggle(project.id)}
                      />
                    </td>
                    <td>{project.name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={onClose} disabled={submitting}>
            취소
          </button>
          <button className="btn" onClick={handleAssign} disabled={submitting || loading}>
            {submitting ? "저장 중..." : `저장 (${selected.size})`}
          </button>
        </div>
      </div>
    </div>
  );
}

export default UserAssignProjectModal;
