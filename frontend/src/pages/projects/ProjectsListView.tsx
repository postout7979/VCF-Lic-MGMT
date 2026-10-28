import { useEffect, useState } from "react";

import { fetchProjectDetail, fetchProjects } from "../../api/client";
import ListControls from "../../components/ListControls";
import LicenseTypeBadge from "../../components/LicenseTypeBadge";
import Pagination from "../../components/Pagination";
import { useListControls } from "../../hooks/useListControls";
import type { ProjectDetail, ProjectSummary } from "../../types";

function ProjectsListView() {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [detail, setDetail] = useState<ProjectDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const licenseItems = detail?.license_items ?? [];
  const list = useListControls(licenseItems, (item, query) =>
    [
      item.serial_number,
      item.parent_customer,
      item.customer_name,
      item.enduser_account_name,
      item.product_name,
      item.erp_site_id,
    ]
      .filter(Boolean)
      .some((field) => field!.toLowerCase().includes(query)),
  );

  useEffect(() => {
    fetchProjects().then((data) => {
      setProjects(data);
      if (data.length > 0) setSelectedProjectId(data[0].id);
    });
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
      ) : error ? (
        <p className="error-text">{error}</p>
      ) : selectedProjectId === null || detail === null ? (
        <div className="card placeholder-card">
          아직 생성된 프로젝트가 없습니다. 설정 &gt; 프로젝트 탭에서 먼저 생성해주세요.
        </div>
      ) : (
        <>
          <div className="card" style={{ marginBottom: 20 }}>
            <h2 style={{ marginTop: 0, color: "var(--color-primary-dark)" }}>{detail.name}</h2>
            <div className="sum-row" style={{ fontSize: 14 }}>
              <span>Perpetual 합계</span>
              <span className="sum-value">{detail.perpetual_quantity.toLocaleString()}</span>
            </div>
            <div className="sum-row" style={{ fontSize: 14 }}>
              <span>Subscription 합계</span>
              <span className="sum-value">{detail.subscription_quantity.toLocaleString()}</span>
            </div>
          </div>

          <div className="card">
            <ListControls
              search={list.search}
              onSearchChange={list.setSearch}
              pageSize={list.pageSize}
              onPageSizeChange={list.setPageSize}
              total={list.total}
              placeholder="Serial Number / Customer / Product Name / ERP Site ID 검색"
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
