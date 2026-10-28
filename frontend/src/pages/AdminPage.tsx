import { useState } from "react";

import { resetEnvironment } from "../api/client";
import BackupTab from "./admin/BackupTab";
import BrandTab from "./admin/BrandTab";
import CspDataTab from "./admin/CspDataTab";
import LegacyInfraTab from "./admin/LegacyInfraTab";
import NetworkTab from "./admin/NetworkTab";
import ProjectAdminTab from "./admin/ProjectAdminTab";
import SmtpTab from "./admin/SmtpTab";
import SupplierDataTab from "./admin/SupplierDataTab";
import UserApplicationsTab from "./admin/UserApplicationsTab";
import UsersTab from "./admin/UsersTab";
import VcfOpsTab from "./admin/VcfOpsTab";

const TABS = [
  { key: "project", label: "프로젝트" },
  { key: "supplier-data", label: "공급자 데이터" },
  { key: "csp-data", label: "CSP 현황" },
  { key: "legacy-infra", label: "Legacy Infra" },
  { key: "vcf-ops", label: "VCF Infra" },
  { key: "users", label: "사용자" },
  { key: "user-applications", label: "사용자 승인" },
  { key: "smtp", label: "SMTP" },
  { key: "network", label: "Network" },
  { key: "brand", label: "브랜드" },
  { key: "backup", label: "백업" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

function AdminPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("project");
  const [resetting, setResetting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleResetEnvironment() {
    const warning =
      "환경 설정을 초기화하면 admin 계정을 제외한 모든 데이터가 영구적으로 삭제됩니다.\n\n" +
      "- 업로드한 공급자/CSP 데이터\n" +
      "- 연동된 vCenter 및 VCF Operations 계정과 수집된 데이터\n" +
      "- 모든 프로젝트\n" +
      "- admin 외 모든 사용자 계정, 신청/승인 기록\n" +
      "- SMTP, Network, 브랜드 설정\n\n" +
      "이 작업은 되돌릴 수 없습니다. 계속하시겠습니까?";
    if (!window.confirm(warning)) return;
    if (!window.confirm("정말로 진행하시겠습니까? 모든 데이터가 영구적으로 삭제됩니다.")) return;

    setResetting(true);
    setError(null);
    try {
      await resetEnvironment();
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "초기화에 실패했습니다.");
      setResetting(false);
    }
  }

  return (
    <div>
      <div
        className="form-row"
        style={{ marginBottom: 18, justifyContent: "space-between", alignItems: "center" }}
      >
        <h1 className="page-title" style={{ margin: 0 }}>
          설정
        </h1>
        <button className="btn btn-danger" onClick={handleResetEnvironment} disabled={resetting}>
          {resetting ? "초기화 중..." : "환경 설정 초기화"}
        </button>
      </div>
      {error && <p className="error-text">{error}</p>}
      <div className="tab-bar">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            className={`tab-button${activeTab === tab.key ? " active" : ""}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {activeTab === "project" && <ProjectAdminTab />}
      {activeTab === "supplier-data" && <SupplierDataTab />}
      {activeTab === "csp-data" && <CspDataTab />}
      {activeTab === "legacy-infra" && <LegacyInfraTab />}
      {activeTab === "vcf-ops" && <VcfOpsTab />}
      {activeTab === "users" && <UsersTab />}
      {activeTab === "user-applications" && <UserApplicationsTab />}
      {activeTab === "smtp" && <SmtpTab />}
      {activeTab === "network" && <NetworkTab />}
      {activeTab === "brand" && <BrandTab />}
      {activeTab === "backup" && <BackupTab />}
    </div>
  );
}

export default AdminPage;
