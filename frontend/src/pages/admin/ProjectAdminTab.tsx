import { useEffect, useState } from "react";

import { createProject, deleteProject, fetchProjects } from "../../api/client";
import CspAssignModal from "../../components/CspAssignModal";
import SupplierAssignModal from "../../components/SupplierAssignModal";
import VCenterAssignModal from "../../components/VCenterAssignModal";
import VcfOpsAssignModal from "../../components/VcfOpsAssignModal";
import type { ProjectSummary } from "../../types";

function ProjectAdminTab() {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [supplierAssignTarget, setSupplierAssignTarget] = useState<ProjectSummary | null>(null);
  const [vcenterAssignTarget, setVCenterAssignTarget] = useState<ProjectSummary | null>(null);
  const [vcfAssignTarget, setVcfAssignTarget] = useState<ProjectSummary | null>(null);
  const [cspAssignTarget, setCspAssignTarget] = useState<ProjectSummary | null>(null);

  const selectedProject = projects.find((p) => p.id === selectedProjectId) ?? null;

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

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="form-row" style={{ marginBottom: 0, alignItems: "center" }}>
          <span className="text-muted">
            {selectedProject ? `선택됨: ${selectedProject.name}` : "할당할 프로젝트를 아래 목록에서 선택하세요."}
          </span>
          <button
            className="btn btn-secondary"
            onClick={() => selectedProject && setSupplierAssignTarget(selectedProject)}
            disabled={!selectedProject}
          >
            공급자 할당
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => selectedProject && setVCenterAssignTarget(selectedProject)}
            disabled={!selectedProject}
          >
            vCenter 할당
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => selectedProject && setVcfAssignTarget(selectedProject)}
            disabled={!selectedProject}
          >
            VCF 할당
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => selectedProject && setCspAssignTarget(selectedProject)}
            disabled={!selectedProject}
          >
            CSP 할당
          </button>
        </div>
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
              <th colSpan={3} style={{ textAlign: "center" }}>
                VCF 데이터
              </th>
              <th rowSpan={2} style={{ textAlign: "center" }}>
                CSP 데이터
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
              <th>라이센스 항목 수</th>
              <th>할당 코어 수</th>
              <th>사용 중 코어 수</th>
              <th>할당 항목 수</th>
            </tr>
          </thead>
          <tbody>
            {projects.map((project) => (
              <tr
                key={project.id}
                className={`clickable${project.id === selectedProjectId ? " selected-row" : ""}`}
                onClick={() =>
                  setSelectedProjectId((prev) => (prev === project.id ? null : project.id))
                }
              >
                <td>{project.name}</td>
                <td>{new Date(project.created_at).toLocaleDateString()}</td>
                <td>{project.item_count}</td>
                <td>{project.perpetual_quantity.toLocaleString()}</td>
                <td>{project.subscription_quantity.toLocaleString()}</td>
                <td>{project.vcenter_count}</td>
                <td>{project.vcenter_perpetual_quantity.toLocaleString()}</td>
                <td>{project.vcenter_term_quantity.toLocaleString()}</td>
                <td>{project.vcf_license_count}</td>
                <td>{project.vcf_core_capacity.toLocaleString()}</td>
                <td>{project.vcf_core_used.toLocaleString()}</td>
                <td>{project.csp_license_count}</td>
                <td>
                  <button
                    className="btn btn-danger"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(project);
                    }}
                  >
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
      {vcfAssignTarget && (
        <VcfOpsAssignModal
          project={vcfAssignTarget}
          onClose={() => setVcfAssignTarget(null)}
          onAssigned={loadProjects}
        />
      )}
      {cspAssignTarget && (
        <CspAssignModal
          project={cspAssignTarget}
          onClose={() => setCspAssignTarget(null)}
          onAssigned={loadProjects}
        />
      )}
    </div>
  );
}

export default ProjectAdminTab;
