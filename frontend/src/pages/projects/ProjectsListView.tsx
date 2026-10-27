import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { fetchProjects } from "../../api/client";
import type { ProjectSummary } from "../../types";

function ProjectsListView() {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchProjects()
      .then(setProjects)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <p className="text-muted">불러오는 중...</p>;
  }

  if (projects.length === 0) {
    return (
      <div className="card placeholder-card">
        아직 생성된 프로젝트가 없습니다. 관리자 &gt; 프로젝트 탭에서 먼저 생성해주세요.
      </div>
    );
  }

  return (
    <div className="project-grid">
      {projects.map((project) => (
        <div key={project.id} className="project-card" onClick={() => navigate(`/projects/${project.id}`)}>
          <h3>{project.name}</h3>
          <div className="sum-row">
            <span>Perpetual</span>
            <span className="sum-value">{project.perpetual_quantity.toLocaleString()}</span>
          </div>
          <div className="sum-row">
            <span>Subscription</span>
            <span className="sum-value">{project.subscription_quantity.toLocaleString()}</span>
          </div>
          <div className="sum-row">
            <span>할당 항목 수</span>
            <span className="sum-value">{project.item_count.toLocaleString()}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

export default ProjectsListView;
