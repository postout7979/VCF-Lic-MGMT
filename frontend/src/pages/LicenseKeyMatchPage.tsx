import { useEffect, useMemo, useState } from "react";

import { fetchCspData, fetchProjects, fetchVCenterItems } from "../api/client";
import DonutChart from "../components/DonutChart";
import ListControls from "../components/ListControls";
import Pagination from "../components/Pagination";
import SummaryBar from "../components/SummaryBar";
import { useListControls } from "../hooks/useListControls";
import type { CspLicenseItem, ProjectSummary, VCenterInventoryItem } from "../types";

const COLOR_MATCHED = "#16a34a";
const COLOR_LEGACY_ONLY = "#2563eb";
const COLOR_CSP_ONLY = "#eb6834";

type MatchStatus = "matched" | "legacy_only" | "csp_only";

interface KeyRow {
  licenseKey: string;
  status: MatchStatus;
  legacyQuantity: number;
  legacyHostCount: number;
  cspQuantity: number;
  cspUnit: string | null;
}

function StatusBadge({ status }: { status: MatchStatus }) {
  if (status === "matched") return <span className="badge badge-success">매칭</span>;
  if (status === "legacy_only") return <span className="badge badge-subscription">Legacy 전용</span>;
  return <span className="badge badge-other">CSP 전용</span>;
}

function LicenseKeyMatchPage() {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [legacyItems, setLegacyItems] = useState<VCenterInventoryItem[]>([]);
  const [cspItems, setCspItems] = useState<CspLicenseItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchProjects().then((data) =>
      setProjects([...data].sort((a, b) => a.name.localeCompare(b.name))),
    );
  }, []);

  useEffect(() => {
    if (selectedProjectId === null) {
      setLegacyItems([]);
      setCspItems([]);
      return;
    }
    setLoading(true);
    Promise.all([
      fetchVCenterItems({ assignedToProject: selectedProjectId }),
      fetchCspData({ assignedToProject: selectedProjectId }),
    ])
      .then(([legacy, csp]) => {
        setLegacyItems(legacy);
        setCspItems(csp);
      })
      .finally(() => setLoading(false));
  }, [selectedProjectId]);

  const rows = useMemo<KeyRow[]>(() => {
    const legacyMap = new Map<string, { quantity: number; hostCount: number }>();
    for (const item of legacyItems) {
      if (!item.license_key) continue;
      const entry = legacyMap.get(item.license_key) ?? { quantity: 0, hostCount: 0 };
      entry.quantity += (item.license_category === "SUBSCRIPTION" ? item.total_cores : item.cpu_sockets) ?? 0;
      entry.hostCount += 1;
      legacyMap.set(item.license_key, entry);
    }

    const cspMap = new Map<string, { quantity: number; units: Set<string> }>();
    for (const item of cspItems) {
      if (!item.license_key) continue;
      const entry = cspMap.get(item.license_key) ?? { quantity: 0, units: new Set<string>() };
      entry.quantity += item.quantity;
      entry.units.add(item.unit ?? "-");
      cspMap.set(item.license_key, entry);
    }

    const allKeys = new Set([...legacyMap.keys(), ...cspMap.keys()]);
    return Array.from(allKeys)
      .sort((a, b) => a.localeCompare(b))
      .map((key) => {
        const legacy = legacyMap.get(key);
        const csp = cspMap.get(key);
        const status: MatchStatus = legacy && csp ? "matched" : legacy ? "legacy_only" : "csp_only";
        return {
          licenseKey: key,
          status,
          legacyQuantity: legacy?.quantity ?? 0,
          legacyHostCount: legacy?.hostCount ?? 0,
          cspQuantity: csp?.quantity ?? 0,
          cspUnit: csp ? (csp.units.size === 1 ? Array.from(csp.units)[0] : "혼합") : null,
        };
      });
  }, [legacyItems, cspItems]);

  const stats = useMemo(() => {
    const matched = rows.filter((r) => r.status === "matched").length;
    const legacyOnly = rows.filter((r) => r.status === "legacy_only").length;
    const cspOnly = rows.filter((r) => r.status === "csp_only").length;
    const total = rows.length;
    const matchRate = total > 0 ? Math.round((matched / total) * 100) : 0;
    return { matched, legacyOnly, cspOnly, total, matchRate };
  }, [rows]);

  const list = useListControls(rows, [
    { value: "licenseKey", label: "License Key", getValue: (row) => row.licenseKey },
  ]);

  return (
    <div>
      <h1 className="page-title">라이센스 키 매칭 현황</h1>
      <p className="text-muted" style={{ marginTop: -14, marginBottom: 18 }}>
        Legacy Infra(vCenter)에서 수집된 라이센스 키와 CSP 현황에서 수집된 라이센스 키를 비교합니다.
      </p>

      <div style={{ marginBottom: 20 }}>
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
      </div>

      {projects.length === 0 ? (
        <div className="card placeholder-card">프로젝트를 먼저 생성해주세요.</div>
      ) : selectedProjectId === null ? (
        <div className="card placeholder-card">프로젝트를 선택해주세요.</div>
      ) : loading ? (
        <p className="text-muted">불러오는 중...</p>
      ) : rows.length === 0 ? (
        <div className="card placeholder-card">
          이 프로젝트에 Legacy Infra 또는 CSP 라이센스 키 데이터가 없습니다.
        </div>
      ) : (
        <>
          <div style={{ maxWidth: 420, marginBottom: 20 }}>
            <DonutChart
              title="라이센스 키 매칭 비율"
              segments={[
                { label: "매칭", value: stats.matched, color: COLOR_MATCHED },
                { label: "Legacy 전용", value: stats.legacyOnly, color: COLOR_LEGACY_ONLY },
                { label: "CSP 전용", value: stats.cspOnly, color: COLOR_CSP_ONLY },
              ]}
              centerValue={`${stats.matchRate}%`}
              centerLabel={`${stats.matched} / ${stats.total}개 매칭`}
            />
          </div>

          <div className="card">
            <SummaryBar
              items={[
                { label: "전체 키 수", value: stats.total },
                { label: "매칭된 키 수", value: stats.matched },
                { label: "Legacy 전용 키 수", value: stats.legacyOnly },
                { label: "CSP 전용 키 수", value: stats.cspOnly },
                { label: "매칭 비율", value: `${stats.matchRate}%` },
              ]}
            />
            <ListControls
              fields={list.fields}
              filters={list.filters}
              onFiltersChange={list.setFilters}
              pageSize={list.pageSize}
              onPageSizeChange={list.setPageSize}
              total={list.total}
              placeholder="License Key 검색"
            />
            <div style={{ overflowX: "auto" }}>
              <table>
                <thead>
                  <tr>
                    <th>License Key</th>
                    <th>상태</th>
                    <th>Legacy 수량</th>
                    <th>Legacy Host 수</th>
                    <th>CSP 수량</th>
                    <th>CSP Unit</th>
                  </tr>
                </thead>
                <tbody>
                  {list.pageItems.map((row) => (
                    <tr key={row.licenseKey}>
                      <td>{row.licenseKey}</td>
                      <td>
                        <StatusBadge status={row.status} />
                      </td>
                      <td>{row.status === "csp_only" ? "-" : row.legacyQuantity.toLocaleString()}</td>
                      <td>{row.status === "csp_only" ? "-" : row.legacyHostCount}</td>
                      <td>{row.status === "legacy_only" ? "-" : row.cspQuantity.toLocaleString()}</td>
                      <td>{row.cspUnit ?? "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination
              currentPage={list.page}
              totalPages={list.totalPages}
              onPageChange={list.setPage}
            />
          </div>
        </>
      )}
    </div>
  );
}

export default LicenseKeyMatchPage;
