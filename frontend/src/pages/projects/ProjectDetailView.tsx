import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { fetchProjectDetail } from "../../api/client";
import LicenseTypeBadge from "../../components/LicenseTypeBadge";
import type { ProjectDetail } from "../../types";

function ProjectDetailView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetchProjectDetail(Number(id))
      .then(setProject)
      .catch(() => setError("프로젝트 정보를 불러오지 못했습니다."))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return <p className="text-muted">불러오는 중...</p>;
  }

  if (error || !project) {
    return <p className="error-text">{error ?? "프로젝트를 찾을 수 없습니다."}</p>;
  }

  return (
    <div>
      <button className="btn btn-secondary" style={{ marginBottom: 16 }} onClick={() => navigate("/projects")}>
        ← 프로젝트 목록
      </button>

      <div className="card" style={{ marginBottom: 20 }}>
        <h2 style={{ marginTop: 0, color: "var(--color-primary-dark)" }}>{project.name}</h2>
        <div className="sum-row" style={{ fontSize: 14 }}>
          <span>Perpetual 합계</span>
          <span className="sum-value">{project.perpetual_quantity.toLocaleString()}</span>
        </div>
        <div className="sum-row" style={{ fontSize: 14 }}>
          <span>Subscription 합계</span>
          <span className="sum-value">{project.subscription_quantity.toLocaleString()}</span>
        </div>
      </div>

      <div className="card">
        <p className="text-muted" style={{ marginTop: 0 }}>
          할당된 항목 {project.license_items.length}건
        </p>
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
              {project.license_items.map((item) => (
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
      </div>
    </div>
  );
}

export default ProjectDetailView;
