import { useEffect, useState } from "react";

import { deleteUser, fetchUsers, generateRecoveryKey } from "../../api/client";
import UserAssignProjectModal from "../../components/UserAssignProjectModal";
import UserFormModal from "../../components/UserFormModal";
import type { User } from "../../types";

function UsersTab() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revealed, setRevealed] = useState<Set<number>>(new Set());
  const [formTarget, setFormTarget] = useState<User | "new" | null>(null);
  const [assignTarget, setAssignTarget] = useState<User | null>(null);

  function loadUsers() {
    fetchUsers()
      .then(setUsers)
      .catch(() => setError("사용자 목록을 불러오지 못했습니다."))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadUsers();
  }, []);

  function toggleReveal(id: number) {
    setRevealed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleDelete(user: User) {
    if (!window.confirm(`${user.username} 사용자를 삭제할까요?`)) return;
    try {
      await deleteUser(user.id);
      loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "삭제에 실패했습니다.");
    }
  }

  async function handleGenerateRecoveryKey() {
    if (
      !window.confirm(
        "새 복구 키를 생성하면 이전 키는 즉시 무효화됩니다. 생성된 키는 다시 조회할 수 없으니 안전한 곳에 보관하세요. 계속할까요?",
      )
    ) {
      return;
    }
    try {
      const { recovery_key } = await generateRecoveryKey();
      const blob = new Blob([recovery_key], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "vcf-lic-mgmt-admin-recovery-key.txt";
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "복구 키 생성에 실패했습니다.");
    }
  }

  return (
    <div>
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="form-row" style={{ marginBottom: 0, justifyContent: "space-between" }}>
          <p className="text-muted" style={{ margin: 0 }}>
            사용자 계정 정보를 관리합니다. admin 계정은 모든 메뉴에 접근할 수 있고, 그 외 사용자는
            할당된 프로젝트만 볼 수 있습니다.
          </p>
          <button className="btn" onClick={() => setFormTarget("new")}>
            사용자 추가
          </button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="form-row" style={{ marginBottom: 0, justifyContent: "space-between" }}>
          <p className="text-muted" style={{ margin: 0 }}>
            admin 계정 비밀번호를 잊었을 때 로그인 페이지에서 초기화하는 데 쓰이는 복구 키입니다.
            생성 시 이전 키는 즉시 무효화됩니다.
          </p>
          <button className="btn btn-secondary" onClick={handleGenerateRecoveryKey}>
            복구 키 생성 및 다운로드
          </button>
        </div>
      </div>

      {error && <p className="error-text">{error}</p>}

      <div className="card">
        {loading ? (
          <p className="text-muted">불러오는 중...</p>
        ) : users.length === 0 ? (
          <p className="text-muted">등록된 사용자가 없습니다.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table>
              <thead>
                <tr>
                  <th>Username</th>
                  <th>Password</th>
                  <th>Email</th>
                  <th>프로젝트</th>
                  <th>생성일</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td>
                      {user.username}
                      {user.is_admin && (
                        <span className="badge badge-success" style={{ marginLeft: 8 }}>
                          관리자
                        </span>
                      )}
                    </td>
                    <td>
                      <span style={{ fontFamily: "monospace", marginRight: 8 }}>
                        {revealed.has(user.id) ? user.password : "•".repeat(10)}
                      </span>
                      <button
                        className="btn btn-secondary"
                        style={{ padding: "3px 10px", fontSize: 12 }}
                        onClick={() => toggleReveal(user.id)}
                      >
                        {revealed.has(user.id) ? "숨기기" : "보기"}
                      </button>
                    </td>
                    <td>{user.email}</td>
                    <td>
                      {user.is_admin
                        ? "전체"
                        : user.project_names.length > 0
                          ? user.project_names.join(", ")
                          : "미할당"}
                    </td>
                    <td>{new Date(user.created_at).toLocaleDateString()}</td>
                    <td style={{ display: "flex", gap: 6 }}>
                      <button className="btn btn-secondary" onClick={() => setFormTarget(user)}>
                        수정
                      </button>
                      {!user.is_admin && (
                        <>
                          <button
                            className="btn btn-secondary"
                            onClick={() => setAssignTarget(user)}
                          >
                            프로젝트 할당
                          </button>
                          <button className="btn btn-danger" onClick={() => handleDelete(user)}>
                            삭제
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {formTarget && (
        <UserFormModal
          user={formTarget === "new" ? null : formTarget}
          onClose={() => setFormTarget(null)}
          onSaved={loadUsers}
        />
      )}
      {assignTarget && (
        <UserAssignProjectModal
          user={assignTarget}
          onClose={() => setAssignTarget(null)}
          onAssigned={loadUsers}
        />
      )}
    </div>
  );
}

export default UsersTab;
