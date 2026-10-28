import { useEffect, useState } from "react";

import {
  approveUserApplication,
  fetchUserApplications,
  rejectUserApplication,
} from "../../api/client";
import type { UserApplication } from "../../types";

function UserApplicationsTab() {
  const [applications, setApplications] = useState<UserApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revealed, setRevealed] = useState<Set<number>>(new Set());
  const [busyId, setBusyId] = useState<number | null>(null);

  function loadApplications() {
    fetchUserApplications()
      .then(setApplications)
      .catch(() => setError("신청 목록을 불러오지 못했습니다."))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadApplications();
  }, []);

  function toggleReveal(id: number) {
    setRevealed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleApprove(application: UserApplication) {
    if (!window.confirm(`${application.username} 사용자를 승인할까요?`)) return;
    setBusyId(application.id);
    setError(null);
    try {
      await approveUserApplication(application.id);
      loadApplications();
    } catch (err) {
      setError(err instanceof Error ? err.message : "승인에 실패했습니다.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleReject(application: UserApplication) {
    if (!window.confirm(`${application.username} 신청을 거절할까요?`)) return;
    setBusyId(application.id);
    setError(null);
    try {
      await rejectUserApplication(application.id);
      loadApplications();
    } catch (err) {
      setError(err instanceof Error ? err.message : "거절에 실패했습니다.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <div className="card" style={{ marginBottom: 20 }}>
        <p className="text-muted" style={{ margin: 0 }}>
          로그인 페이지에서 접수된 사용자 신규 신청 목록입니다. 승인하면 사용자 탭에 바로
          추가됩니다.
        </p>
      </div>

      {error && <p className="error-text">{error}</p>}

      <div className="card">
        {loading ? (
          <p className="text-muted">불러오는 중...</p>
        ) : applications.length === 0 ? (
          <p className="text-muted">대기 중인 신청이 없습니다.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table>
              <thead>
                <tr>
                  <th>Username</th>
                  <th>Password</th>
                  <th>Email</th>
                  <th>신청일</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {applications.map((application) => (
                  <tr key={application.id}>
                    <td>{application.username}</td>
                    <td>
                      <span style={{ fontFamily: "monospace", marginRight: 8 }}>
                        {revealed.has(application.id) ? application.password : "•".repeat(10)}
                      </span>
                      <button
                        className="btn btn-secondary"
                        style={{ padding: "3px 10px", fontSize: 12 }}
                        onClick={() => toggleReveal(application.id)}
                      >
                        {revealed.has(application.id) ? "숨기기" : "보기"}
                      </button>
                    </td>
                    <td>{application.email}</td>
                    <td>{new Date(application.created_at).toLocaleDateString()}</td>
                    <td style={{ display: "flex", gap: 6 }}>
                      <button
                        className="btn"
                        onClick={() => handleApprove(application)}
                        disabled={busyId === application.id}
                      >
                        승인
                      </button>
                      <button
                        className="btn btn-danger"
                        onClick={() => handleReject(application)}
                        disabled={busyId === application.id}
                      >
                        거절
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default UserApplicationsTab;
