import { useEffect, useMemo, useState } from "react";

import { fetchProjects, fetchVCenterItems } from "../api/client";
import LicenseTypeBadge from "../components/LicenseTypeBadge";
import type { ProjectSummary, VCenterInventoryItem } from "../types";

function RealtimeUsagePage() {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [items, setItems] = useState<VCenterInventoryItem[]>([]);
  const [selectedVCenter, setSelectedVCenter] = useState<string | null>(null);
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
    fetchVCenterItems({ assignedToProject: selectedProjectId })
      .then((data) => {
        setItems(data);
        setSelectedVCenter(null);
      })
      .finally(() => setLoading(false));
  }, [selectedProjectId]);

  const vcenterNames = useMemo(
    () => Array.from(new Set(items.map((item) => item.vcenter_name ?? "(알 수 없음)"))),
    [items],
  );

  const stats = useMemo(() => {
    const clusterKeys = new Set(items.map((item) => `${item.vcenter_name}::${item.cluster_name}`));
    const licenseKeys = new Set(items.map((item) => item.license_key).filter(Boolean));
    return {
      vcenterCount: vcenterNames.length,
      clusterCount: clusterKeys.size,
      hostCount: items.length,
      licenseKeyCount: licenseKeys.size,
    };
  }, [items, vcenterNames]);

  const detailRows = useMemo(() => {
    if (!selectedVCenter) return [];
    return items.filter((item) => (item.vcenter_name ?? "(알 수 없음)") === selectedVCenter);
  }, [items, selectedVCenter]);

  return (
    <div>
      <h1 className="page-title">Legacy Infra</h1>

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
          <div className="stat-banner">
            <div className="stat-card">
              <div className="stat-label">vCenter 수</div>
              <div className="stat-value">{stats.vcenterCount}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Cluster 수</div>
              <div className="stat-value">{stats.clusterCount}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Host 수</div>
              <div className="stat-value">{stats.hostCount}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">License Key 수량</div>
              <div className="stat-value">{stats.licenseKeyCount}</div>
            </div>
          </div>

          {items.length === 0 ? (
            <div className="card placeholder-card">
              이 프로젝트에 vCenter 할당 정보가 없습니다. 관리자 &gt; 프로젝트 탭에서 "vCenter
              할당"으로 추가해주세요.
            </div>
          ) : (
            <div className="card split-pane">
              <div className="vc-name-list">
                {vcenterNames.map((name) => (
                  <button
                    key={name}
                    className={`vc-name-item${selectedVCenter === name ? " active" : ""}`}
                    onClick={() => setSelectedVCenter(name)}
                  >
                    {name}
                  </button>
                ))}
              </div>
              <div>
                {selectedVCenter === null ? (
                  <p className="text-muted">좌측에서 vCenter를 선택하세요.</p>
                ) : (
                  <table>
                    <thead>
                      <tr>
                        <th>Cluster Name</th>
                        <th>Host Name</th>
                        <th>License Key</th>
                        <th>라이센스 구분</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detailRows.map((item) => (
                        <tr key={item.id}>
                          <td>{item.cluster_name}</td>
                          <td>{item.host_name}</td>
                          <td>{item.license_key}</td>
                          <td>
                            {item.license_category ? (
                              <LicenseTypeBadge licenseType={item.license_category} />
                            ) : (
                              <span className="text-muted">확인 불가</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default RealtimeUsagePage;
