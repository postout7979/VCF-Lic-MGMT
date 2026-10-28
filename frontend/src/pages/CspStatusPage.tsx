import { useEffect, useState } from "react";

import { fetchCspData, fetchProjects } from "../api/client";
import type { CspLicenseItem, ProjectSummary } from "../types";

function isExpired(endDate: string | null): boolean {
  if (!endDate) return false;
  return new Date(endDate) < new Date(new Date().toDateString());
}

function CspStatusPage() {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [items, setItems] = useState<CspLicenseItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchProjects().then((data) => {
      setProjects(data);
      if (data.length > 0) setSelectedProjectId(data[0].id);
    });
  }, []);

  useEffect(() => {
    if (selectedProjectId === null) {
      setItems([]);
      return;
    }
    setLoading(true);
    fetchCspData({ assignedToProject: selectedProjectId })
      .then(setItems)
      .finally(() => setLoading(false));
  }, [selectedProjectId]);

  const folderCount = new Set(items.map((item) => item.folder_name ?? "(알 수 없음)")).size;

  return (
    <div>
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="form-field" style={{ maxWidth: 320 }}>
          <label>프로젝트 선택</label>
          <select
            value={selectedProjectId ?? ""}
            onChange={(e) => setSelectedProjectId(e.target.value ? Number(e.target.value) : null)}
          >
            {projects.length === 0 && <option value="">생성된 프로젝트가 없습니다</option>}
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <p className="text-muted">불러오는 중...</p>
      ) : selectedProjectId === null ? (
        <div className="card placeholder-card">프로젝트를 먼저 생성해주세요.</div>
      ) : (
        <>
          <div className="card summary-card">
            <table className="summary-table">
              <thead>
                <tr>
                  <th>Folder 수</th>
                  <th>라이센스 항목 수</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>{folderCount}</td>
                  <td>{items.length}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {items.length === 0 ? (
            <div className="card placeholder-card">
              이 프로젝트에 CSP 할당 정보가 없습니다. 설정 &gt; 프로젝트 탭에서 "CSP 할당"으로
              추가해주세요.
            </div>
          ) : (
            <div className="card">
              <table>
                <thead>
                  <tr>
                    <th>Folder Name</th>
                    <th>Product Name</th>
                    <th>License Key</th>
                    <th>Quantity</th>
                    <th>Unit</th>
                    <th>Contract End Date</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id}>
                      <td>{item.folder_name ?? "-"}</td>
                      <td>{item.product_name ?? "-"}</td>
                      <td>{item.license_key ?? "-"}</td>
                      <td>{item.quantity.toLocaleString()}</td>
                      <td>{item.unit ?? "-"}</td>
                      <td>
                        {item.contract_end_date ?? "-"}{" "}
                        {isExpired(item.contract_end_date) && (
                          <span className="badge badge-error">만료</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default CspStatusPage;
