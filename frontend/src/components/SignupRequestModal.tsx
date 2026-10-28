import { useState } from "react";

import { signupRequest } from "../api/client";
import { generatePassword } from "../utils/password";
import { SECURITY_QUESTIONS } from "../types";

interface Props {
  onClose: () => void;
}

function SignupRequestModal({ onClose }: Props) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState(generatePassword());
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [answer1, setAnswer1] = useState("");
  const [answer2, setAnswer2] = useState("");
  const [answer3, setAnswer3] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const canSubmit =
    username.trim() &&
    password.trim() &&
    email.trim() &&
    answer1.trim() &&
    answer2.trim() &&
    answer3.trim();

  async function handleSubmit() {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      await signupRequest({
        username: username.trim(),
        password,
        email: email.trim(),
        security_answer_1: answer1.trim(),
        security_answer_2: answer2.trim(),
        security_answer_3: answer3.trim(),
      });
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "신청에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="modal-overlay">
        <div className="modal-box narrow">
          <h2>사용자 신규 신청</h2>
          <p className="text-muted">
            신청이 접수되었습니다. 관리자가 승인하면 로그인할 수 있습니다.
          </p>
          <div className="modal-actions">
            <button className="btn" onClick={onClose}>
              닫기
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay">
      <div className="modal-box narrow">
        <h2>사용자 신규 신청</h2>

        <div className="form-grid" style={{ marginTop: 16 }}>
          <div className="form-field" style={{ gridColumn: "1 / -1" }}>
            <label>Username</label>
            <input
              type="text"
              autoFocus
              value={username}
              onChange={(e) => setUsername(e.target.value)}
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
          <div className="notice-box" style={{ gridColumn: "1 / -1" }}>
            비밀번호 초기화 시 이메일을 받지 못하는 경우를 대비한 보안 질문입니다. 세 질문 모두
            답변해주세요.
          </div>
          <div className="form-field" style={{ gridColumn: "1 / -1" }}>
            <label>질문1. {SECURITY_QUESTIONS[0]}</label>
            <input type="text" value={answer1} onChange={(e) => setAnswer1(e.target.value)} />
          </div>
          <div className="form-field" style={{ gridColumn: "1 / -1" }}>
            <label>질문2. {SECURITY_QUESTIONS[1]}</label>
            <input type="text" value={answer2} onChange={(e) => setAnswer2(e.target.value)} />
          </div>
          <div className="form-field" style={{ gridColumn: "1 / -1" }}>
            <label>질문3. {SECURITY_QUESTIONS[2]}</label>
            <input type="text" value={answer3} onChange={(e) => setAnswer3(e.target.value)} />
          </div>
        </div>

        {error && <p className="error-text">{error}</p>}

        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={onClose} disabled={submitting}>
            취소
          </button>
          <button className="btn" onClick={handleSubmit} disabled={submitting || !canSubmit}>
            {submitting ? "신청 중..." : "신청"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default SignupRequestModal;
