import { NavLink } from "react-router-dom";

const NAV_ITEMS = [
  { to: "/admin", label: "관리자" },
  { to: "/license-overview", label: "라이센스 종합 현황" },
  { to: "/realtime-usage", label: "실시간 사용 현황" },
  { to: "/projects", label: "프로젝트" },
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
