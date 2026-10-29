import { useEffect, useMemo, useState } from "react";

import { fetchProjectDetail, fetchProjects } from "../../api/client";
import ListControls from "../../components/ListControls";
import LicenseTypeBadge from "../../components/LicenseTypeBadge";
import Pagination from "../../components/Pagination";
import SummaryBar from "../../components/SummaryBar";
import { useListControls } from "../../hooks/useListControls";
import type { ProjectDetail, ProjectSummary } from "../../types";

function ProjectsListView() {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [detail, setDetail] = useState<ProjectDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const licenseItems = useMemo(() => {
    const items = detail?.license_items ?? [];
    return [...items].sort((a, b) =>
      (a.parent_customer ?? "").localeCompare(b.parent_customer ?? "") ||
      (a.customer_name ?? "").localeCompare(b.customer_name ?? "") ||
      (a.enduser_account_name ?? "").localeCompare(b.enduser_account_name ?? ""),
    );
  }, [detail]);
  const list = useListControls(licenseItems, [
    { value: "serial_number", label: "Serial Number", getValue: (item) => item.serial_number },
    { value: "parent_customer", label: "Parent Customer", getValue: (item) => item.parent_customer },
    { value: "customer_name", label: "Customer Name", getValue: (item) => item.customer_name },
    {
      value: "enduser_account_name",
      label: "Enduser Account Name",
      getValue: (item) => item.enduser_account_name,
    },
    { value: "product_name", label: "Product Name", getValue: (item) => item.product_name },
    { value: "erp_site_id", label: "ERP Site ID", getValue: (item) => item.erp_site_id },
  ]);

  useEffect(() => {
    fetchProjects().then((data) =>
      setProjects([...data].sort((a, b) => a.name.localeCompare(b.name))),
    );
  }, []);

  useEffect(() => {
    if (selectedProjectId === null) {
      setDetail(null);
      return;
    }
    setLoading(true);
    setError(null);
    fetchProjectDetail(selectedProjectId)
      .then(setDetail)
      .catch(() => setError("프로젝트 정보를 불러오지 못했습니다."))
      .finally(() => setLoading(false));
  }, [selectedProjectId]);

  return (
    <div>
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

      {loading ? (
        <p className="text-muted">불러오는 중...</p>
      ) : error ? (
        <p className="error-text">{error}</p>
      ) : projects.length === 0 ? (
        <div className="card placeholder-card">
          아직 생성된 프로젝트가 없습니다. 설정 &gt; 프로젝트 탭에서 먼저 생성해주세요.
        </div>
      ) : selectedProjectId === null || detail === null ? (
        <div className="card placeholder-card">프로젝트를 선택해주세요.</div>
      ) : (
        <>
          <div className="card">
            <SummaryBar
              items={[
                { label: "Perpetual 합계", value: detail.perpetual_quantity },
                { label: "Subscription 합계", value: detail.subscription_quantity },
              ]}
            />
            <ListControls
              fields={list.fields}
              filters={list.filters}
              onFiltersChange={list.setFilters}
              pageSize={list.pageSize}
              onPageSizeChange={list.setPageSize}
              total={list.total}
              placeholder="검색어를 입력하세요"
            />
            <div style={{ overflowX: "auto" }}>
              <table>
                <thead>
                  <tr>
                    <th>Serial Number</th>
                    <th>Parent Customer</th>
                    <th>Customer Name</th>
                    <th>Enduser Account Name</th>
                    <th>Product Name</th>
                    <th>License Type</th>
                    <th>Quantity - ENT</th>
                    <th>Part Number</th>
                    <th>Division</th>
                    <th>ERP Site ID</th>
                    <th>Contract Status</th>
                    <th>Start Date</th>
                    <th>End Date</th>
                  </tr>
                </thead>
                <tbody>
                  {list.pageItems.map((item) => (
                    <tr key={item.id}>
                      <td>{item.serial_number}</td>
                      <td>{item.parent_customer}</td>
                      <td>{item.customer_name}</td>
                      <td>{item.enduser_account_name}</td>
                      <td>{item.product_name}</td>
                      <td>
                        <LicenseTypeBadge licenseType={item.license_type} />
                      </td>
                      <td>{item.quantity_ent}</td>
                      <td>{item.part_number}</td>
                      <td>{item.division}</td>
                      <td>{item.erp_site_id}</td>
                      <td>{item.contract_status}</td>
                      <td>{item.start_date}</td>
                      <td>{item.end_date}</td>
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

export default ProjectsListView;
