import { useState } from "react";

import { createUser, updateUser } from "../api/client";
import { generatePassword } from "../utils/password";
import { SECURITY_QUESTIONS } from "../types";
import type { User } from "../types";

interface Props {
  user: User | null;
  onClose: () => void;
  onSaved: () => void;
}

function UserFormModal({ user, onClose, onSaved }: Props) {
  const isEdit = user !== null;
  const isAdminAccount = user?.is_admin ?? false;
  const [username, setUsername] = useState(user?.username ?? "");
  const [password, setPassword] = useState(user?.password ?? generatePassword());
  const [email, setEmail] = useState(user?.email ?? "");
  const [answer1, setAnswer1] = useState(user?.security_answer_1 ?? "");
  const [answer2, setAnswer2] = useState(user?.security_answer_2 ?? "");
  const [answer3, setAnswer3] = useState(user?.security_answer_3 ?? "");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit =
    username.trim() &&
    password.trim() &&
    email.trim() &&
    (isAdminAccount || (answer1.trim() && answer2.trim() && answer3.trim()));

  async function handleSubmit() {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      if (isEdit && user) {
        await updateUser(user.id, {
          ...(isAdminAccount
            ? {}
            : {
                username: username.trim(),
                security_answer_1: answer1.trim(),
                security_answer_2: answer2.trim(),
                security_answer_3: answer3.trim(),
              }),
          password,
          email: email.trim(),
        });
      } else {
        await createUser({
          username: username.trim(),
          password,
          email: email.trim(),
          security_answer_1: answer1.trim(),
          security_answer_2: answer2.trim(),
          security_answer_3: answer3.trim(),
        });
      }
      onSaved();
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
        <h2>{isEdit ? "사용자 수정" : "사용자 추가"}</h2>
        {isAdminAccount && (
          <p className="text-muted">admin 계정은 이메일과 비밀번호만 수정할 수 있습니다.</p>
        )}

        <div className="form-grid" style={{ marginTop: 16 }}>
          <div className="form-field" style={{ gridColumn: "1 / -1" }}>
            <label>Username</label>
            <input
              type="text"
              placeholder="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={isAdminAccount}
            />
          </div>
          <div className="form-field" style={{ gridColumn: "1 / -1" }}>
            <label>Password</label>
            <div className="form-row" style={{ marginBottom: 0 }}>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ flex: 1, fontFamily: "monospace" }}
              />
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowPassword((prev) => !prev)}
              >
                {showPassword ? "숨기기" : "보기"}
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setPassword(generatePassword())}
              >
                재생성
              </button>
            </div>
          </div>
          <div className="form-field" style={{ gridColumn: "1 / -1" }}>
            <label>Email</label>
            <input
              type="text"
              placeholder="user@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          {!isAdminAccount && (
            <>
              <div className="notice-box" style={{ gridColumn: "1 / -1" }}>
                비밀번호 초기화 시 이메일을 받지 못하는 경우를 대비한 보안 질문입니다. 세 질문
                모두 답변해주세요.
              </div>
              <div className="form-field" style={{ gridColumn: "1 / -1" }}>
                <label>질문1. {SECURITY_QUESTIONS[0]}</label>
                <input
                  type="text"
                  value={answer1}
                  onChange={(e) => setAnswer1(e.target.value)}
                />
              </div>
              <div className="form-field" style={{ gridColumn: "1 / -1" }}>
                <label>질문2. {SECURITY_QUESTIONS[1]}</label>
                <input
                  type="text"
                  value={answer2}
                  onChange={(e) => setAnswer2(e.target.value)}
                />
              </div>
              <div className="form-field" style={{ gridColumn: "1 / -1" }}>
                <label>질문3. {SECURITY_QUESTIONS[2]}</label>
                <input
                  type="text"
                  value={answer3}
                  onChange={(e) => setAnswer3(e.target.value)}
                />
              </div>
            </>
          )}
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

export default UserFormModal;
