import { useState } from "react";

import { updateMe } from "../api/client";
import { useAuth } from "../auth/AuthContext";

interface Props {
  onClose: () => void;
}

function SelfAccountModal({ onClose }: Props) {
  const { user, refreshUser } = useAuth();
  const [email, setEmail] = useState(user?.email ?? "");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = email.trim().length > 0;

  async function handleSubmit() {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      await updateMe({
        email: email.trim(),
        ...(password ? { password } : {}),
      });
      await refreshUser();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "저장에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="modal-overlay">
      <div className="modal-box narrow">
        <h2>내 정보 수정</h2>

        <div className="form-grid" style={{ marginTop: 16 }}>
          <div className="form-field" style={{ gridColumn: "1 / -1" }}>
            <label>Username</label>
            <input type="text" value={user?.username ?? ""} disabled />
          </div>
          <div className="form-field" style={{ gridColumn: "1 / -1" }}>
            <label>Email</label>
            <input
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="form-field" style={{ gridColumn: "1 / -1" }}>
            <label>새 비밀번호</label>
            <div className="form-row" style={{ marginBottom: 0 }}>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="변경하지 않으려면 비워두세요"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ flex: 1 }}
              />
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowPassword((prev) => !prev)}
              >
                {showPassword ? "숨기기" : "보기"}
              </button>
            </div>
          </div>
        </div>

        {error && <p className="error-text">{error}</p>}

        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={onClose} disabled={submitting}>
            취소
          </button>
          <button className="btn" onClick={handleSubmit} disabled={submitting || !canSubmit}>
            {submitting ? "저장 중..." : "저장"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default SelfAccountModal;
