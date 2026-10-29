import { useEffect, useState } from "react";

import {
  fetchCspData,
  fetchProjectDetail,
  fetchProjects,
  fetchVCenterItems,
  fetchVcfOpsItems,
} from "../api/client";
import ListControls from "../components/ListControls";
import LicenseStatusCharts from "../components/LicenseStatusCharts";
import Pagination from "../components/Pagination";
import { useListControls } from "../hooks/useListControls";
import type { CspLicenseItem, LicenseItem, ProjectSummary, VCenterInventoryItem, VcfOpsCoreLicenseItem } from "../types";

// Non-admin users get all of their accessible projects' items back from a
// single call regardless of the assignedToProject filter (server-side
// shortcut), so looping per project can hand back the same row more than
// once - dedupe by id before counting.
function dedupeById<T extends { id: number }>(items: T[]): T[] {
  return Array.from(new Map(items.map((item) => [item.id, item])).values());
}

function LicenseOverviewPage() {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [supplierItems, setSupplierItems] = useState<LicenseItem[]>([]);
  const [cspItems, setCspItems] = useState<CspLicenseItem[]>([]);
  const [vcenterItems, setVcenterItems] = useState<VCenterInventoryItem[]>([]);
  const [vcfItems, setVcfItems] = useState<VcfOpsCoreLicenseItem[]>([]);

  useEffect(() => {
    fetchProjects()
      .then((data) => setProjects([...data].sort((a, b) => a.name.localeCompare(b.name))))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (projects.length === 0) {
      setSupplierItems([]);
      setCspItems([]);
      setVcenterItems([]);
      setVcfItems([]);
      return;
    }
    Promise.all(
      projects.map((project) =>
        Promise.all([
          fetchProjectDetail(project.id),
          fetchCspData({ assignedToProject: project.id }),
          fetchVCenterItems({ assignedToProject: project.id }),
          fetchVcfOpsItems({ assignedToProject: project.id }),
        ]),
      ),
    ).then((results) => {
      setSupplierItems(results.flatMap(([detail]) => detail.license_items));
      setCspItems(dedupeById(results.flatMap(([, csp]) => csp)));
      setVcenterItems(dedupeById(results.flatMap(([, , vcenter]) => vcenter)));
      setVcfItems(dedupeById(results.flatMap(([, , , vcf]) => vcf)));
    });
  }, [projects]);

  const list = useListControls(projects, [
    { value: "name", label: "프로젝트명", getValue: (project) => project.name },
  ]);

  return (
    <div>
      <h1 className="page-title">프로젝트 현황</h1>

      {loading ? (
        <p className="text-muted">불러오는 중...</p>
      ) : projects.length === 0 ? (
        <div className="card placeholder-card">
          아직 생성된 프로젝트가 없습니다. 설정 &gt; 프로젝트 탭에서 먼저 생성해주세요.
        </div>
      ) : (
        <>
          <div className="dashboard-grid">
            <LicenseStatusCharts
              supplierItems={supplierItems}
              cspItems={cspItems}
              vcenterItems={vcenterItems}
              vcfItems={vcfItems}
            />
          </div>

          <div className="card">
            <ListControls
              fields={list.fields}
              filters={list.filters}
              onFiltersChange={list.setFilters}
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
