import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";

import { useAuth } from "../auth/AuthContext";
import SelfAccountModal from "./SelfAccountModal";

const NAV_ITEMS = [
  { to: "/license-overview-all", label: "라이센스 전체 현황", adminOnly: true },
  { to: "/license-overview", label: "프로젝트 현황" },
  { to: "/realtime-usage", label: "실시간 사용 현황" },
  { to: "/projects", label: "공급자 현황", supplierOnly: true },
  { to: "/csp-status", label: "Customer Support Portal 현황" },
  { to: "/license-key-match", label: "라이센스 키 매칭 현황" },
];

const SETTINGS_ITEM = { to: "/admin", label: "설정" };

function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showAccountModal, setShowAccountModal] = useState(false);

  async function handleLogout() {
    await logout();
    navigate("/login", { replace: true });
  }

  return (
    <nav className="sidebar">
      <div className="sidebar-user">
        <div className="sidebar-user-name">
          <button
            type="button"
            className="sidebar-user-name-btn"
            onClick={() => setShowAccountModal(true)}
          >
            {user?.name || user?.username}
          </button>
        </div>
        <button className="sidebar-logout" onClick={handleLogout}>
          로그아웃
        </button>
      </div>

      <p className="sidebar-title">VCF License Management</p>
      {NAV_ITEMS.filter(
        (item) =>
          (!item.supplierOnly || user?.is_admin || user?.show_supplier_menu) &&
          (!item.adminOnly || user?.is_admin),
      ).map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) => `sidebar-link${isActive ? " active" : ""}`}
        >
          {item.label}
        </NavLink>
      ))}
      {user?.is_admin && (
        <NavLink
          to={SETTINGS_ITEM.to}
          className={({ isActive }) =>
            `sidebar-link sidebar-link-bottom${isActive ? " active" : ""}`
          }
        >
          {SETTINGS_ITEM.label}
        </NavLink>
      )}

      {showAccountModal && (
        <SelfAccountModal onClose={() => setShowAccountModal(false)} />
      )}
    </nav>
  );
}

export default Sidebar;
