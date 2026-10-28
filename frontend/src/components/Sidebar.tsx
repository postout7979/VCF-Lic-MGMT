import { NavLink } from "react-router-dom";

const NAV_ITEMS = [
  { to: "/admin", label: "설정" },
  { to: "/license-overview", label: "라이센스 종합 현황" },
  { to: "/realtime-usage", label: "실시간 사용 현황" },
  { to: "/projects", label: "공급자 현황" },
  { to: "/csp-status", label: "CSP 현황" },
];

function Sidebar() {
  return (
    <nav className="sidebar">
      <p className="sidebar-title">VCF Lic MGMT</p>
      {NAV_ITEMS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) => `sidebar-link${isActive ? " active" : ""}`}
        >
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}

export default Sidebar;
