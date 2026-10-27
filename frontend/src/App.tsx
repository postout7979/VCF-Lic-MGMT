import { Navigate, Route, Routes } from "react-router-dom";

import Sidebar from "./components/Sidebar";
import AdminPage from "./pages/AdminPage";
import LicenseOverviewPage from "./pages/LicenseOverviewPage";
import ProjectDetailView from "./pages/projects/ProjectDetailView";
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
                <h1 className="page-title">프로젝트</h1>
                <ProjectsListView />
              </div>
            }
          />
          <Route path="/projects/:id" element={<ProjectDetailView />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
