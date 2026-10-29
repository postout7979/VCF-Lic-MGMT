import { Navigate, Route, Routes } from "react-router-dom";

import { AuthProvider } from "./auth/AuthContext";
import ProtectedRoute from "./auth/ProtectedRoute";
import Sidebar from "./components/Sidebar";
import AdminPage from "./pages/AdminPage";
import CspStatusPage from "./pages/CspStatusPage";
import LicenseKeyMatchPage from "./pages/LicenseKeyMatchPage";
import LicenseOverviewAllPage from "./pages/LicenseOverviewAllPage";
import LicenseOverviewPage from "./pages/LicenseOverviewPage";
import LoginPage from "./pages/LoginPage";
import ProjectsListView from "./pages/projects/ProjectsListView";
import RealtimeUsagePage from "./pages/RealtimeUsagePage";

function AppShell() {
  return (
    <ProtectedRoute>
      <div className="app-shell">
        <Sidebar />
        <main className="main-panel">
          <Routes>
            <Route path="/" element={<Navigate to="/license-overview" replace />} />
            <Route
              path="/admin"
              element={
                <ProtectedRoute requireAdmin>
                  <AdminPage />
                </ProtectedRoute>
              }
            />
            <Route path="/license-overview" element={<LicenseOverviewPage />} />
            <Route
              path="/license-overview-all"
              element={
                <ProtectedRoute requireAdmin>
                  <LicenseOverviewAllPage />
                </ProtectedRoute>
              }
            />
            <Route path="/realtime-usage" element={<RealtimeUsagePage />} />
            <Route path="/license-key-match" element={<LicenseKeyMatchPage />} />
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
    </ProtectedRoute>
  );
}

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/*" element={<AppShell />} />
      </Routes>
    </AuthProvider>
  );
}

export default App;
