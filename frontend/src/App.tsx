import { Navigate, Route, Routes } from "react-router-dom";

import Sidebar from "./components/Sidebar";
import AdminPage from "./pages/AdminPage";
import CspStatusPage from "./pages/CspStatusPage";
import LicenseOverviewPage from "./pages/LicenseOverviewPage";
import ProjectsListView from "./pages/projects/ProjectsListView";
import RealtimeUsagePage from "./pages/RealtimeUsagePage";

function App() {
  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-panel">
        <Routes>
          <Route path="/" element={<Navigate to="/admin" replace />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/license-overview" element={<LicenseOverviewPage />} />
          <Route path="/realtime-usage" element={<RealtimeUsagePage />} />
          <Route
            path="/projects"
            element={
              <div>
                <h1 className="page-title">공급자 현황</h1>
                <ProjectsListView />
              </div>
            }
          />
          <Route
            path="/csp-status"
            element={
              <div>
                <h1 className="page-title" style={{ marginBottom: 2 }}>
                  CSP 현황
                </h1>
                <p className="text-muted" style={{ marginTop: 0, marginBottom: 18 }}>
                  (Customer support portal)
                </p>
                <CspStatusPage />
              </div>
            }
          />
        </Routes>
      </main>
    </div>
  );
}

export default App;
