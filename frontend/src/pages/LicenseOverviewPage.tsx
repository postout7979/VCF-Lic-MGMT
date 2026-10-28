import { useEffect, useMemo, useState } from "react";

import { fetchProjects } from "../api/client";
import DonutChart from "../components/DonutChart";
import ListControls from "../components/ListControls";
import Pagination from "../components/Pagination";
import { useListControls } from "../hooks/useListControls";
import type { ProjectSummary } from "../types";

const COLOR_PRIMARY = "#2563eb";
const COLOR_ORANGE = "#eb6834";
const COLOR_TRACK = "#e1e0d9";
const COLOR_RED = "#dc2626";

function LicenseOverviewPage() {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProjects()
      .then((data) => setProjects([...data].sort((a, b) => a.name.localeCompare(b.name))))
      .finally(() => setLoading(false));
  }, []);

  const totals = useMemo(
    () =>
      projects.reduce(
        (acc, p) => ({
          perpetual: acc.perpetual + p.perpetual_quantity,
          subscription: acc.subscription + p.subscription_quantity,
          vcenterPerpetual: acc.vcenterPerpetual + p.vcenter_perpetual_quantity,
          vcenterTerm: acc.vcenterTerm + p.vcenter_term_quantity,
          vcfCapacity: acc.vcfCapacity + p.vcf_core_capacity,
          vcfUsed: acc.vcfUsed + p.vcf_core_used,
          cspCoreQuantity: acc.cspCoreQuantity + p.csp_core_quantity,
          cspCoreQuantityExpired: acc.cspCoreQuantityExpired + p.csp_core_quantity_expired,
        }),
        {
          perpetual: 0,
          subscription: 0,
          vcenterPerpetual: 0,
          vcenterTerm: 0,
          vcfCapacity: 0,
          vcfUsed: 0,
          cspCoreQuantity: 0,
          cspCoreQuantityExpired: 0,
        },
      ),
    [projects],
  );

  const list = useListControls(projects, (project, query) =>
    project.name.toLowerCase().includes(query),
  );

  const vcfRemaining = Math.max(totals.vcfCapacity - totals.vcfUsed, 0);
  const vcfUsageRate =
    totals.vcfCapacity > 0 ? Math.round((totals.vcfUsed / totals.vcfCapacity) * 100) : 0;

  return (
    <div>
      <h1 className="page-title">라이센스 종합 현황</h1>

      {loading ? (
        <p className="text-muted">불러오는 중...</p>
      ) : projects.length === 0 ? (
        <div className="card placeholder-card">
          아직 생성된 프로젝트가 없습니다. 설정 &gt; 프로젝트 탭에서 먼저 생성해주세요.
        </div>
      ) : (
        <>
          <div className="dashboard-grid">
            <div className="donut-grid">
              <DonutChart
                title="공급자 라이센스 현황"
                segments={[
                  { label: "Perpetual", value: totals.perpetual, color: COLOR_PRIMARY },
                  { label: "Subscription", value: totals.subscription, color: COLOR_ORANGE },
                ]}
                centerValue={(totals.perpetual + totals.subscription).toLocaleString()}
                centerLabel="합계 수량"
              />
              <DonutChart
                title="CSP 현황"
                segments={[
                  {
                    label: "유효",
                    value: totals.cspCoreQuantity - totals.cspCoreQuantityExpired,
                    color: COLOR_PRIMARY,
                  },
                  { label: "만료", value: totals.cspCoreQuantityExpired, color: COLOR_RED },
                ]}
                centerValue={totals.cspCoreQuantity.toLocaleString()}
                centerLabel="코어 수 합계"
              />
              <DonutChart
                title="Legacy 사용 현황"
                segments={[
                  { label: "Perpetual", value: totals.vcenterPerpetual, color: COLOR_PRIMARY },
                  { label: "Term", value: totals.vcenterTerm, color: COLOR_ORANGE },
                ]}
                centerValue={(totals.vcenterPerpetual + totals.vcenterTerm).toLocaleString()}
                centerLabel="합계 수량"
              />
              <DonutChart
                title="VCF 코어 사용 현황"
                segments={[
                  { label: "사용 코어", value: totals.vcfUsed, color: COLOR_PRIMARY },
                  { label: "여유 코어", value: vcfRemaining, color: COLOR_TRACK },
                ]}
                centerValue={`${vcfUsageRate}%`}
                centerLabel={`${totals.vcfUsed.toLocaleString()} / ${totals.vcfCapacity.toLocaleString()}`}
              />
            </div>
          </div>

          <div className="card">
            <ListControls
              search={list.search}
              onSearchChange={list.setSearch}
              pageSize={list.pageSize}
              onPageSizeChange={list.setPageSize}
              total={list.total}
              placeholder="프로젝트명 검색"
            />
            <div style={{ overflowX: "auto" }}>
              <table>
                <thead>
                  <tr>
                    <th rowSpan={2}>프로젝트명</th>
                    <th colSpan={3} style={{ textAlign: "center" }}>
                      공급자 데이터
                    </th>
                    <th colSpan={3} style={{ textAlign: "center" }}>
                      vCenter 데이터
                    </th>
                    <th colSpan={3} style={{ textAlign: "center" }}>
                      VCF 데이터
                    </th>
                    <th style={{ textAlign: "center" }}>CSP 데이터</th>
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
                    <th>코어 수 합</th>
                  </tr>
                </thead>
                <tbody>
                  {list.pageItems.map((project) => (
                    <tr key={project.id}>
                      <td>{project.name}</td>
                      <td>{project.item_count}</td>
                      <td>{project.perpetual_quantity.toLocaleString()}</td>
                      <td>{project.subscription_quantity.toLocaleString()}</td>
                      <td>{project.vcenter_count}</td>
                      <td>{project.vcenter_perpetual_quantity.toLocaleString()}</td>
                      <td>{project.vcenter_term_quantity.toLocaleString()}</td>
                      <td>{project.vcf_license_count}</td>
                      <td>{project.vcf_core_capacity.toLocaleString()}</td>
                      <td>{project.vcf_core_used.toLocaleString()}</td>
                      <td>{project.csp_core_quantity.toLocaleString()}</td>
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

export default LicenseOverviewPage;
