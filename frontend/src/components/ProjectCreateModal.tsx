import { useEffect, useMemo, useState } from "react";

import { createProject, fetchUsers } from "../api/client";
import type { User } from "../types";

interface Props {
  onClose: () => void;
  onCreated: () => void;
}

function ProjectCreateModal({ onClose, onCreated }: Props) {
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const [activeSearch, setActiveSearch] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers()
      .then((data) => setUsers(data.filter((u) => !u.is_admin)))
      .catch(() => setError("사용자 목록을 불러오지 못했습니다."))
      .finally(() => setLoadingUsers(false));
  }, []);

  const filteredUsers = useMemo(() => {
    const query = activeSearch.trim().toLowerCase();
    if (!query) return users;
    return users.filter((user) =>
      [user.username, user.name, user.email]
        .filter(Boolean)
        .some((field) => field!.toLowerCase().includes(query)),
    );
  }, [users, activeSearch]);

  const allSelected = useMemo(
    () => filteredUsers.length > 0 && filteredUsers.every((user) => selected.has(user.id)),
    [filteredUsers, selected],
  );

  function handleSearch() {
    setActiveSearch(searchInput.trim());
  }

  function handleClearSearch() {
    setSearchInput("");
    setActiveSearch("");
  }

  function toggle(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected((prev) => {
      if (allSelected) {
        const next = new Set(prev);
        for (const user of filteredUsers) next.delete(user.id);
        return next;
      }
      return new Set([...prev, ...filteredUsers.map((user) => user.id)]);
    });
  }

  async function handleSubmit() {
    if (!name.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      await createProject({
        name: name.trim(),
        location: location.trim(),
        userIds: Array.from(selected),
      });
      onCreated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "프로젝트 생성에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="modal-overlay">
      <div className="modal-box">
        <h2>프로젝트 생성</h2>

        <div className="form-grid" style={{ marginTop: 16, marginBottom: 16 }}>
          <div className="form-field" style={{ gridColumn: "1 / -1" }}>
            <label>프로젝트명</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            />
          </div>
          <div className="form-field" style={{ gridColumn: "1 / -1" }}>
            <label>위치</label>
            <input
              type="text"
              placeholder="예: 서울 본사 데이터센터"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>
        </div>

        <p className="text-muted" style={{ marginTop: 0 }}>
          사용자 할당 — 체크한 사용자는 이 프로젝트를 바로 볼 수 있게 됩니다. 나중에 설정 &gt; 사용자
          탭의 "프로젝트 할당"에서도 동일하게 관리할 수 있습니다.
        </p>

        {error && <p className="error-text">{error}</p>}

        {!loadingUsers && users.length > 0 && (
          <div className="search-bar">
            <input
              type="text"
              placeholder="Username / 이름 / Email 검색"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
            <button className="btn" onClick={handleSearch}>
              검색
            </button>
            {activeSearch && (
              <button className="btn btn-secondary" onClick={handleClearSearch}>
                초기화
              </button>
            )}
          </div>
        )}

        <div className="modal-scroll">
          {loadingUsers ? (
            <p style={{ padding: 16 }}>불러오는 중...</p>
          ) : users.length === 0 ? (
            <p style={{ padding: 16 }} className="text-muted">
              할당 가능한 사용자가 없습니다. 설정 &gt; 사용자 탭에서 먼저 생성해주세요.
            </p>
          ) : filteredUsers.length === 0 ? (
            <p style={{ padding: 16 }} className="text-muted">
              검색 결과가 없습니다.
            </p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>
                    <input type="checkbox" checked={allSelected} onChange={toggleAll} />
                  </th>
                  <th>Username</th>
                  <th>이름</th>
                  <th>Email</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selected.has(user.id)}
                        onChange={() => toggle(user.id)}
                      />
                    </td>
                    <td>{user.username}</td>
                    <td>{user.name ?? "-"}</td>
                    <td>{user.email}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={onClose} disabled={submitting}>
            취소
          </button>
          <button className="btn" onClick={handleSubmit} disabled={submitting || !name.trim()}>
            {submitting ? "생성 중..." : `생성 (사용자 ${selected.size})`}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ProjectCreateModal;
