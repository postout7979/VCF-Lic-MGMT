import { useEffect, useMemo, useState } from "react";

import { fetchProjects, fetchVCenterItems, fetchVcfOpsItems } from "../api/client";
import LicenseTypeBadge from "../components/LicenseTypeBadge";
import type { ProjectSummary, VCenterInventoryItem, VcfOpsCoreLicenseItem } from "../types";

function RealtimeUsagePage() {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [items, setItems] = useState<VCenterInventoryItem[]>([]);
  const [selectedVCenter, setSelectedVCenter] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [vcfItems, setVcfItems] = useState<VcfOpsCoreLicenseItem[]>([]);
  const [vcfLoading, setVcfLoading] = useState(false);

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

  useEffect(() => {
    if (selectedProjectId === null) {
      setVcfItems([]);
      return;
    }
    setVcfLoading(true);
    fetchVcfOpsItems({ assignedToProject: selectedProjectId })
      .then(setVcfItems)
      .finally(() => setVcfLoading(false));
  }, [selectedProjectId]);

  const vcfStats = useMemo(() => {
    const connectionCount = new Set(vcfItems.map((item) => item.connection_name ?? "(알 수 없음)")).size;
    // core_capacity is the entitlement's total pool, repeated on every
    // vCenter-domain row of that license - dedupe by license_key before
    // summing so it isn't counted once per domain.
    const capacityByLicense = new Map<string, number>();
    for (const item of vcfItems) {
      if (item.license_key) capacityByLicense.set(item.license_key, item.core_capacity ?? 0);
    }
    const coreCapacity = Array.from(capacityByLicense.values()).reduce((sum, v) => sum + v, 0);
    const coreUsed = vcfItems.reduce((sum, item) => sum + (item.core_used ?? 0), 0);
    return { connectionCount, licenseCount: vcfItems.length, coreCapacity, coreUsed };
  }, [vcfItems]);

  const vcenterNames = useMemo(
    () => Array.from(new Set(items.map((item) => item.vcenter_name ?? "(알 수 없음)"))),
    [items],
  );

  const stats = useMemo(() => {
    const clusterKeys = new Set(items.map((item) => `${item.vcenter_name}::${item.cluster_name}`));
    // Perpetual licensing is per-socket; term (subscription) licensing is
    // per-core actually consumed - same convention as the project summary.
    const perpetualQuantity = items
      .filter((item) => item.license_category === "PERPETUAL")
      .reduce((sum, item) => sum + (item.cpu_sockets ?? 0), 0);
    const termQuantity = items
      .filter((item) => item.license_category === "SUBSCRIPTION")
      .reduce((sum, item) => sum + (item.total_cores ?? 0), 0);
    return {
      vcenterCount: vcenterNames.length,
      clusterCount: clusterKeys.size,
      hostCount: items.length,
      perpetualQuantity,
      termQuantity,
    };
  }, [items, vcenterNames]);

  const detailRows = useMemo(() => {
    if (!selectedVCenter) return [];
    return items.filter((item) => (item.vcenter_name ?? "(알 수 없음)") === selectedVCenter);
  }, [items, selectedVCenter]);

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

      <h1 className="page-title">Legacy Infra</h1>

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
                  <th>vCenter 수</th>
                  <th>Cluster 수</th>
                  <th>Host 수</th>
                  <th>Perpetual 수량</th>
                  <th>Term 수량</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>{stats.vcenterCount}</td>
                  <td>{stats.clusterCount}</td>
                  <td>{stats.hostCount}</td>
                  <td>{stats.perpetualQuantity.toLocaleString()}</td>
                  <td>{stats.termQuantity.toLocaleString()}</td>
                </tr>
              </tbody>
            </table>
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
                    onClick={() => setSelectedVCenter((prev) => (prev === name ? null : name))}
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

          <h1 className="page-title" style={{ marginTop: 32 }}>
            VCF Infra
          </h1>

          {vcfLoading ? (
            <p className="text-muted">불러오는 중...</p>
          ) : (
            <>
              <div className="card summary-card">
                <table className="summary-table">
                  <thead>
                    <tr>
                      <th>VCF 연결 수</th>
                      <th>라이센스 항목 수</th>
                      <th>할당 코어 합계</th>
                      <th>사용 중 코어 합계</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>{vcfStats.connectionCount}</td>
                      <td>{vcfStats.licenseCount}</td>
                      <td>{vcfStats.coreCapacity.toLocaleString()}</td>
                      <td>{vcfStats.coreUsed.toLocaleString()}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {vcfItems.length === 0 ? (
                <div className="card placeholder-card">
                  이 프로젝트에 VCF 할당 정보가 없습니다. 설정 &gt; 프로젝트 탭에서 "VCF 할당"으로
                  추가해주세요.
                </div>
              ) : (
                <div className="card">
                  <table>
                    <thead>
                      <tr>
                        <th>VCF 연결</th>
                        <th>Domain</th>
                        <th>License Key</th>
                        <th>License Type</th>
                        <th>상태</th>
                        <th>할당 코어 수</th>
                        <th>사용 중 코어 수</th>
                        <th>검증된 사용량</th>
                      </tr>
                    </thead>
                    <tbody>
                      {vcfItems.map((item) => {
                        const mismatch =
                          item.verified_core_used !== null &&
                          item.verified_core_used !== item.core_used;
                        return (
                          <tr key={item.id}>
                            <td>{item.connection_name ?? "-"}</td>
                            <td>{item.domain_name ?? "-"}</td>
                            <td>{item.license_key ?? "-"}</td>
                            <td>{item.license_type ?? "-"}</td>
                            <td>{item.license_status ?? "-"}</td>
                            <td>{item.core_capacity ?? "-"}</td>
                            <td>{item.core_used ?? "-"}</td>
                            <td className={mismatch ? "error-text" : undefined}>
                              {item.verified_core_used ?? "-"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}

export default RealtimeUsagePage;
