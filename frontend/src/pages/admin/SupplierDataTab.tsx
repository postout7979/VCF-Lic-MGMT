import { useEffect, useState, type ChangeEvent } from "react";

import { fetchSupplierData, uploadSupplierData } from "../../api/client";
import LicenseTypeBadge from "../../components/LicenseTypeBadge";
import type { LicenseItem, UploadResult } from "../../types";

function SupplierDataTab() {
  const [items, setItems] = useState<LicenseItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  function loadItems() {
    fetchSupplierData().then(setItems).catch(() => undefined);
  }

  useEffect(() => {
    loadItems();
  }, []);

  async function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    setResult(null);
    try {
      const res = await uploadSupplierData(file);
      setResult(res);
      loadItems();
    } catch (err) {
      setError(err instanceof Error ? err.message : "업로드에 실패했습니다.");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  return (
    <div>
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="form-row">
          <input type="file" accept=".xlsx,.xlsm" onChange={handleFileChange} disabled={uploading} />
          {uploading && <span className="text-muted">업로드 중...</span>}
        </div>
        {error && <p className="error-text">{error}</p>}
        {result && (
          <p className="success-text">
            업로드 완료 — 신규 {result.inserted}건, 갱신 {result.updated}건, 건너뜀 {result.skipped}건
            {result.errors.length > 0 && ` (경고 ${result.errors.length}건)`}
          </p>
        )}
      </div>

      <div className="card">
        <p className="text-muted" style={{ marginTop: 0 }}>
          총 {items.length}건의 공급자 데이터
        </p>
        <div style={{ overflowX: "auto" }}>
          <table>
            <thead>
              <tr>
                <th>Serial Number</th>
                <th>Parent Customer</th>
                <th>Customer Name</th>
                <th>Product Name</th>
                <th>License Type</th>
                <th>Quantity - ENT</th>
                <th>ERP Site ID</th>
                <th>Contract Status</th>
                <th>Start Date</th>
                <th>End Date</th>
                <th>프로젝트 할당</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>{item.serial_number}</td>
                  <td>{item.parent_customer}</td>
                  <td>{item.customer_name}</td>
                  <td>{item.product_name}</td>
                  <td>
                    <LicenseTypeBadge licenseType={item.license_type} />
                  </td>
                  <td>{item.quantity_ent}</td>
                  <td>{item.erp_site_id}</td>
                  <td>{item.contract_status}</td>
                  <td>{item.start_date}</td>
                  <td>{item.end_date}</td>
                  <td>{item.project_id ? `#${item.project_id}` : "미할당"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default SupplierDataTab;
