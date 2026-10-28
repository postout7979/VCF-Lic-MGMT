import { useEffect, useMemo, useState } from "react";

import { fetchProjects } from "../api/client";
import ListControls from "../components/ListControls";
import Pagination from "../components/Pagination";
import { useListControls } from "../hooks/useListControls";
import type { ProjectSummary } from "../types";

function LicenseOverviewPage() {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProjects()
      .then(setProjects)
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
          cspCount: acc.cspCount + p.csp_license_count,
          userCount: acc.userCount + p.user_count,
        }),
        {
          perpetual: 0,
          subscription: 0,
          vcenterPerpetual: 0,
          vcenterTerm: 0,
          vcfCapacity: 0,
          vcfUsed: 0,
          cspCount: 0,
          userCount: 0,
        },
      ),
    [projects],
  );

  const list = useListControls(projects, (project, query) =>
    project.name.toLowerCase().includes(query),
  );

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
          <div className="card summary-card">
            <div style={{ overflowX: "auto" }}>
              <table className="summary-table">
                <thead>
                  <tr>
                    <th>총 프로젝트 수</th>
                    <th>총 사용자 수</th>
                    <th>공급자 Perpetual 합계</th>
                    <th>공급자 Subscription 합계</th>
                    <th>vCenter Perpetual 수량</th>
                    <th>vCenter Term 수량</th>
                    <th>VCF 할당 코어 합계</th>
                    <th>VCF 사용 코어 합계</th>
                    <th>CSP 라이센스 항목 수</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>{projects.length}</td>
                    <td>{totals.userCount}</td>
                    <td>{totals.perpetual.toLocaleString()}</td>
                    <td>{totals.subscription.toLocaleString()}</td>
                    <td>{totals.vcenterPerpetual.toLocaleString()}</td>
                    <td>{totals.vcenterTerm.toLocaleString()}</td>
                    <td>{totals.vcfCapacity.toLocaleString()}</td>
                    <td>{totals.vcfUsed.toLocaleString()}</td>
                    <td>{totals.cspCount.toLocaleString()}</td>
                  </tr>
                </tbody>
              </table>
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
                    <th style={{ textAlign: "center" }}>CSP 데이터</th>
                    <th rowSpan={2}>사용자 수</th>
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
                    <th>항목 수</th>
                  </tr>
                </thead>
                <tbody>
                  {list.pageItems.map((project) => (
                    <tr key={project.id}>
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
                      <td>{project.user_count}</td>
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
