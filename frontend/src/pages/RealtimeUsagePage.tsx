import { useEffect, useMemo, useState } from "react";

import { fetchProjects, fetchVCenterItems, fetchVcfOpsItems } from "../api/client";
import ListControls from "../components/ListControls";
import LicenseTypeBadge from "../components/LicenseTypeBadge";
import Pagination from "../components/Pagination";
import SummaryBar from "../components/SummaryBar";
import { useListControls } from "../hooks/useListControls";
import type { ProjectSummary, VCenterInventoryItem, VcfOpsCoreLicenseItem } from "../types";

type InfraType = "legacy" | "vcf";

const INFRA_OPTIONS: { value: InfraType; label: string }[] = [
  { value: "legacy", label: "Legacy Infra" },
  { value: "vcf", label: "VCF Infra" },
];

function RealtimeUsagePage() {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [infraType, setInfraType] = useState<InfraType>("legacy");
  const [items, setItems] = useState<VCenterInventoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [vcfItems, setVcfItems] = useState<VcfOpsCoreLicenseItem[]>([]);
  const [vcfLoading, setVcfLoading] = useState(false);

  useEffect(() => {
    fetchProjects().then((data) =>
      setProjects([...data].sort((a, b) => a.name.localeCompare(b.name))),
    );
  }, []);

  useEffect(() => {
    if (selectedProjectId === null) {
      setItems([]);
      return;
    }
    setLoading(true);
    fetchVCenterItems({ assignedToProject: selectedProjectId })
      .then(setItems)
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

  const stats = useMemo(() => {
    const vcenterNames = new Set(items.map((item) => item.vcenter_name ?? "(알 수 없음)"));
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
      vcenterCount: vcenterNames.size,
      clusterCount: clusterKeys.size,
      hostCount: items.length,
      perpetualQuantity,
      termQuantity,
    };
  }, [items]);

  const legacyList = useListControls(items, (item, query) =>
    [item.vcenter_name, item.cluster_name, item.host_name, item.license_key]
      .filter(Boolean)
      .some((field) => field!.toLowerCase().includes(query)),
  );

  const vcfList = useListControls(vcfItems, (item, query) =>
    [item.connection_name, item.domain_name, item.license_key, item.license_type, item.license_status]
      .filter(Boolean)
      .some((field) => field!.toLowerCase().includes(query)),
  );

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <div className="form-row" style={{ marginBottom: 0 }}>
          <div className="form-field" style={{ maxWidth: 320 }}>
            <label>프로젝트 선택</label>
            <select
              value={selectedProjectId ?? ""}
              onChange={(e) => setSelectedProjectId(e.target.value ? Number(e.target.value) : null)}
            >
              <option value="">{projects.length === 0 ? "생성된 프로젝트가 없습니다" : "선택 없음"}</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>
          <div className="form-field" style={{ maxWidth: 220 }}>
            <label>인프라 유형</label>
            <select
              value={infraType}
              onChange={(e) => setInfraType(e.target.value as InfraType)}
            >
              {INFRA_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <h1 className="page-title">
        {INFRA_OPTIONS.find((option) => option.value === infraType)?.label}
      </h1>

      {projects.length === 0 ? (
        <div className="card placeholder-card">프로젝트를 먼저 생성해주세요.</div>
      ) : selectedProjectId === null ? (
        <div className="card placeholder-card">프로젝트를 선택해주세요.</div>
      ) : infraType === "legacy" ? (
        loading ? (
          <p className="text-muted">불러오는 중...</p>
        ) : (
          <>
            {items.length === 0 ? (
              <div className="card placeholder-card">
                이 프로젝트에 vCenter 할당 정보가 없습니다. 설정 &gt; 프로젝트 탭에서 "vCenter
                할당"으로 추가해주세요.
              </div>
            ) : (
              <div className="card">
                <SummaryBar
                  items={[
                    { label: "vCenter 수", value: stats.vcenterCount },
                    { label: "Cluster 수", value: stats.clusterCount },
                    { label: "Host 수", value: stats.hostCount },
                    { label: "Perpetual 수량", value: stats.perpetualQuantity },
                    { label: "Term 수량", value: stats.termQuantity },
                  ]}
                />
                <ListControls
                  search={legacyList.search}
                  onSearchChange={legacyList.setSearch}
                  pageSize={legacyList.pageSize}
                  onPageSizeChange={legacyList.setPageSize}
                  total={legacyList.total}
                  placeholder="vCenter / Cluster / Host / License Key 검색"
                />
                <div style={{ overflowX: "auto" }}>
                  <table>
                    <thead>
                      <tr>
                        <th>vCenter</th>
                        <th>Cluster Name</th>
                        <th>Host Name</th>
                        <th>License Key</th>
                        <th>라이센스 구분</th>
                      </tr>
                    </thead>
                    <tbody>
                      {legacyList.pageItems.map((item) => (
                        <tr key={item.id}>
                          <td>{item.vcenter_name ?? "-"}</td>
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
                </div>
                <Pagination
                  currentPage={legacyList.page}
                  totalPages={legacyList.totalPages}
                  onPageChange={legacyList.setPage}
                />
              </div>
            )}
          </>
        )
      ) : vcfLoading ? (
        <p className="text-muted">불러오는 중...</p>
      ) : (
        <>
          {vcfItems.length === 0 ? (
            <div className="card placeholder-card">
              이 프로젝트에 VCF 할당 정보가 없습니다. 설정 &gt; 프로젝트 탭에서 "VCF 할당"으로
              추가해주세요.
            </div>
          ) : (
            <div className="card">
              <SummaryBar
                items={[
                  { label: "VCF 연결 수", value: vcfStats.connectionCount },
                  { label: "라이센스 항목 수", value: vcfStats.licenseCount },
                  { label: "할당 코어 합계", value: vcfStats.coreCapacity },
                  { label: "사용 중 코어 합계", value: vcfStats.coreUsed },
                ]}
              />
              <ListControls
                search={vcfList.search}
                onSearchChange={vcfList.setSearch}
                pageSize={vcfList.pageSize}
                onPageSizeChange={vcfList.setPageSize}
                total={vcfList.total}
                placeholder="연결 / Domain / License Key / License Type 검색"
              />
              <div style={{ overflowX: "auto" }}>
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
                    {vcfList.pageItems.map((item) => {
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
              <Pagination
                currentPage={vcfList.page}
                totalPages={vcfList.totalPages}
                onPageChange={vcfList.setPage}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default RealtimeUsagePage;
