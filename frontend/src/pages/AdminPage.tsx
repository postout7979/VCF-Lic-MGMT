import { useState } from "react";

import LegacyInfraTab from "./admin/LegacyInfraTab";
import ProjectAdminTab from "./admin/ProjectAdminTab";
import SupplierDataTab from "./admin/SupplierDataTab";

const TABS = [
  { key: "supplier-data", label: "공급자 데이터" },
  { key: "project", label: "프로젝트" },
  { key: "legacy-infra", label: "Legacy Infra" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

function AdminPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("supplier-data");

  return (
    <div>
      <h1 className="page-title">관리자</h1>
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
      {activeTab === "supplier-data" && <SupplierDataTab />}
      {activeTab === "project" && <ProjectAdminTab />}
      {activeTab === "legacy-infra" && <LegacyInfraTab />}
    </div>
  );
}

export default AdminPage;
