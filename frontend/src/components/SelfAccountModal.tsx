import { useState } from "react";

import { updateMe } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { isValidEmailFormat } from "../utils/email";

interface Props {
  onClose: () => void;
}

function SelfAccountModal({ onClose }: Props) {
  const { user, refreshUser } = useAuth();
  const isAdminAccount = user?.is_admin ?? false;
  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const emailValid = isValidEmailFormat(email.trim());

  const canSubmit = isAdminAccount
    ? email.trim().length > 0 && emailValid
    : name.trim().length > 0;

  async function handleSubmit() {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      await updateMe({
        ...(isAdminAccount ? { email: email.trim() } : { name: name.trim() }),
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
          {!isAdminAccount && (
            <div className="form-field" style={{ gridColumn: "1 / -1" }}>
              <label>이름</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
          )}
          <div className="form-field" style={{ gridColumn: "1 / -1" }}>
            <label>Email{!isAdminAccount && " (로그인 아이디)"}</label>
            <input
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={!isAdminAccount}
            />
            {isAdminAccount && email.trim() && (
              <p className={emailValid ? "success-text" : "error-text"} style={{ margin: 0 }}>
                {emailValid ? "올바른 이메일 형식입니다." : "이메일 형식이 올바르지 않습니다."}
              </p>
            )}
          </div>
          {!isAdminAccount && (
            <div className="notice-box" style={{ gridColumn: "1 / -1" }}>
              Email(로그인 아이디) 변경은 관리자에게 문의해주세요.
            </div>
          )}
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
