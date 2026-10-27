import { useEffect, useState } from "react";

import { createProject, fetchProjects } from "../../api/client";
import AssignModal from "../../components/AssignModal";
import type { ProjectSummary } from "../../types";

function ProjectAdminTab() {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [assignTarget, setAssignTarget] = useState<ProjectSummary | null>(null);

  function loadProjects() {
    fetchProjects().then(setProjects).catch(() => undefined);
  }

  useEffect(() => {
    loadProjects();
  }, []);

  async function handleCreate() {
    if (!newName.trim()) return;
    setCreating(true);
    setError(null);
    try {
      await createProject(newName.trim());
      setNewName("");
      loadProjects();
    } catch (err) {
      setError(err instanceof Error ? err.message : "프로젝트 생성에 실패했습니다.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div>
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="form-row">
          <input
            type="text"
            placeholder="새 프로젝트 이름"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
          />
          <button className="btn" onClick={handleCreate} disabled={creating || !newName.trim()}>
            프로젝트 생성
          </button>
        </div>
        {error && <p className="error-text">{error}</p>}
      </div>

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>프로젝트명</th>
              <th>생성일</th>
              <th>할당된 항목 수</th>
              <th>Perpetual 합계</th>
              <th>Subscription 합계</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {projects.map((project) => (
              <tr key={project.id}>
                <td>{project.name}</td>
                <td>{new Date(project.created_at).toLocaleDateString()}</td>
                <td>{project.item_count}</td>
                <td>{project.perpetual_quantity.toLocaleString()}</td>
                <td>{project.subscription_quantity.toLocaleString()}</td>
                <td>
                  <button className="btn btn-secondary" onClick={() => setAssignTarget(project)}>
                    Assign
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {assignTarget && (
        <AssignModal
          project={assignTarget}
          onClose={() => setAssignTarget(null)}
          onAssigned={loadProjects}
        />
      )}
    </div>
  );
}

export default ProjectAdminTab;
