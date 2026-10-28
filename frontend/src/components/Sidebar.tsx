import { NavLink, useNavigate } from "react-router-dom";

import { useAuth } from "../auth/AuthContext";

const NAV_ITEMS = [
  { to: "/license-overview", label: "라이센스 종합 현황" },
  { to: "/realtime-usage", label: "실시간 사용 현황" },
  { to: "/projects", label: "공급자 현황" },
  { to: "/csp-status", label: "Customer Support Portal 현황" },
];

const SETTINGS_ITEM = { to: "/admin", label: "설정" };

function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate("/login", { replace: true });
  }

  return (
    <nav className="sidebar">
      <p className="sidebar-title">VCF License Management</p>
      {NAV_ITEMS.map((item) => (
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
      <div className="sidebar-user">
        <div className="sidebar-user-name">
          {user?.username}
          {user && user.project_names.length > 0 && (
            <span className="sidebar-user-project">{user.project_names.join(", ")}</span>
          )}
        </div>
        <button className="sidebar-logout" onClick={handleLogout}>
          로그아웃
        </button>
      </div>
    </nav>
  );
}

export default Sidebar;
