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
    <div className="card">
      <table>
        <thead>
          <tr>
            <th>프로젝트명</th>
            <th>생성일</th>
            <th>할당 항목 수</th>
            <th>Perpetual 합계</th>
            <th>Subscription 합계</th>
          </tr>
        </thead>
        <tbody>
          {projects.map((project) => (
            <tr key={project.id} className="clickable" onClick={() => navigate(`/projects/${project.id}`)}>
              <td>{project.name}</td>
              <td>{new Date(project.created_at).toLocaleDateString()}</td>
              <td>{project.item_count.toLocaleString()}</td>
              <td>{project.perpetual_quantity.toLocaleString()}</td>
              <td>{project.subscription_quantity.toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default ProjectsListView;
