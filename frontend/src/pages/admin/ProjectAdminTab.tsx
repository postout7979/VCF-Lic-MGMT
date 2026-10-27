import { useEffect, useState } from "react";

import { createProject, deleteProject, fetchProjects } from "../../api/client";
import SupplierAssignModal from "../../components/SupplierAssignModal";
import VCenterAssignModal from "../../components/VCenterAssignModal";
import type { ProjectSummary } from "../../types";

function ProjectAdminTab() {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [supplierAssignTarget, setSupplierAssignTarget] = useState<ProjectSummary | null>(null);
  const [vcenterAssignTarget, setVCenterAssignTarget] = useState<ProjectSummary | null>(null);

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

  async function handleDelete(project: ProjectSummary) {
    if (!window.confirm(`${project.name} 프로젝트를 삭제할까요? 할당된 항목은 할당 해제됩니다.`)) {
      return;
    }
    try {
      await deleteProject(project.id);
      loadProjects();
    } catch (err) {
      setError(err instanceof Error ? err.message : "프로젝트 삭제에 실패했습니다.");
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
              <th rowSpan={2}>프로젝트명</th>
              <th rowSpan={2}>생성일</th>
              <th colSpan={3} style={{ textAlign: "center" }}>
                공급자 데이터
              </th>
              <th colSpan={3} style={{ textAlign: "center" }}>
                vCenter 데이터
              </th>
              <th rowSpan={2}></th>
            </tr>
            <tr>
              <th>할당 항목 수</th>
              <th>Perpetual 합계</th>
              <th>Subscription 합계</th>
              <th>vCenter 수</th>
              <th>Perpetual 수량</th>
              <th>Term 수량</th>
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
                <td>{project.vcenter_count}</td>
                <td>{project.vcenter_perpetual_quantity.toLocaleString()}</td>
                <td>{project.vcenter_term_quantity.toLocaleString()}</td>
                <td style={{ display: "flex", gap: 6 }}>
                  <button
                    className="btn btn-secondary"
                    onClick={() => setSupplierAssignTarget(project)}
                  >
                    공급자 할당
                  </button>
                  <button
                    className="btn btn-secondary"
                    onClick={() => setVCenterAssignTarget(project)}
                  >
                    vCenter 할당
                  </button>
                  <button className="btn btn-danger" onClick={() => handleDelete(project)}>
                    삭제
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {supplierAssignTarget && (
        <SupplierAssignModal
          project={supplierAssignTarget}
          onClose={() => setSupplierAssignTarget(null)}
          onAssigned={loadProjects}
        />
      )}
      {vcenterAssignTarget && (
        <VCenterAssignModal
          project={vcenterAssignTarget}
          onClose={() => setVCenterAssignTarget(null)}
          onAssigned={loadProjects}
        />
      )}
    </div>
  );
}

export default ProjectAdminTab;
