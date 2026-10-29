import { useEffect, useState } from "react";

import { fetchCspData, fetchSupplierData, fetchVCenterItems, fetchVcfOpsItems } from "../api/client";
import LicenseStatusCharts from "../components/LicenseStatusCharts";
import type { CspLicenseItem, LicenseItem, VCenterInventoryItem, VcfOpsCoreLicenseItem } from "../types";

function LicenseOverviewAllPage() {
  const [loading, setLoading] = useState(true);
  const [supplierItems, setSupplierItems] = useState<LicenseItem[]>([]);
  const [cspItems, setCspItems] = useState<CspLicenseItem[]>([]);
  const [vcenterItems, setVcenterItems] = useState<VCenterInventoryItem[]>([]);
  const [vcfItems, setVcfItems] = useState<VcfOpsCoreLicenseItem[]>([]);

  useEffect(() => {
    Promise.all([fetchSupplierData(), fetchCspData(), fetchVCenterItems(), fetchVcfOpsItems()])
      .then(([supplier, csp, vcenter, vcf]) => {
        setSupplierItems(supplier);
        setCspItems(csp);
        setVcenterItems(vcenter);
        setVcfItems(vcf);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h1 className="page-title" style={{ marginBottom: 2 }}>
        라이센스 전체 현황
      </h1>
      <p className="text-muted" style={{ marginTop: 0, marginBottom: 18 }}>
        프로젝트 할당 여부와 무관하게 시스템에 업로드/수집된 전체 데이터를 기준으로 집계합니다.
      </p>

      {loading ? (
        <p className="text-muted">불러오는 중...</p>
      ) : (
        <div className="dashboard-grid">
          <LicenseStatusCharts
            supplierItems={supplierItems}
            cspItems={cspItems}
            vcenterItems={vcenterItems}
            vcfItems={vcfItems}
          />
        </div>
      )}
    </div>
  );
}

export default LicenseOverviewAllPage;
