import { useState } from "react";

import CspDataTab from "./admin/CspDataTab";
import LegacyInfraTab from "./admin/LegacyInfraTab";
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
] as const;

type TabKey = (typeof TABS)[number]["key"];

function AdminPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("project");

  return (
    <div>
      <h1 className="page-title">설정</h1>
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
    </div>
  );
}

export default AdminPage;
