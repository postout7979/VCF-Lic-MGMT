import { useEffect, useState } from "react";

import {
  adminResetPassword,
  forgotPasswordInit,
  requestPasswordOtp,
  verifyPasswordOtp,
  verifySecurityAnswers,
} from "../api/client";

interface Props {
  onClose: () => void;
}

type Step =
  | "username"
  | "admin-reset"
  | "choose-method"
  | "otp"
  | "security"
  | "done";

const OTP_TTL_SECONDS = 120;

function ForgotPasswordModal({ onClose }: Props) {
  const [step, setStep] = useState<Step>("username");
  const [username, setUsername] = useState("");
  const [hasEmail, setHasEmail] = useState(false);
  const [questions, setQuestions] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [recoveryKey, setRecoveryKey] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [answer1, setAnswer1] = useState("");
  const [answer2, setAnswer2] = useState("");
  const [answer3, setAnswer3] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [otpExpiresAt, setOtpExpiresAt] = useState<number | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState(0);

  useEffect(() => {
    if (otpExpiresAt === null) return;
    const tick = () =>
      setRemainingSeconds(Math.max(0, Math.round((otpExpiresAt - Date.now()) / 1000)));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [otpExpiresAt]);

  const passwordsValid =
    newPassword.length > 0 && newPassword === confirmPassword;

  async function handleUsernameSubmit() {
    if (!username.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const result = await forgotPasswordInit(username.trim());
      setHasEmail(result.has_email);
      setQuestions(result.security_questions);
      setStep(result.is_admin ? "admin-reset" : "choose-method");
    } catch (err) {
      setError(err instanceof Error ? err.message : "조회에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAdminReset() {
    if (!recoveryKey.trim() || !passwordsValid) return;
    setSubmitting(true);
    setError(null);
    try {
      await adminResetPassword({
        username: username.trim(),
        recovery_key: recoveryKey.trim(),
        new_password: newPassword,
      });
      setStep("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "초기화에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRequestOtp() {
    setSubmitting(true);
    setError(null);
    try {
      await requestPasswordOtp(username.trim());
      setOtpExpiresAt(Date.now() + OTP_TTL_SECONDS * 1000);
      setOtpCode("");
      setStep("otp");
    } catch (err) {
      setError(err instanceof Error ? err.message : "인증코드 발송에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleVerifyOtp() {
    if (!otpCode.trim() || !passwordsValid) return;
    setSubmitting(true);
    setError(null);
    try {
      await verifyPasswordOtp({
        username: username.trim(),
        code: otpCode.trim(),
        new_password: newPassword,
      });
      setStep("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "초기화에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleVerifySecurityAnswers() {
    if (!answer1.trim() || !answer2.trim() || !answer3.trim() || !passwordsValid) return;
    setSubmitting(true);
    setError(null);
    try {
      await verifySecurityAnswers({
        username: username.trim(),
        answer_1: answer1.trim(),
        answer_2: answer2.trim(),
        answer_3: answer3.trim(),
        new_password: newPassword,
      });
      setStep("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "초기화에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="modal-overlay">
      <div className="modal-box narrow">
        <h2>비밀번호 초기화</h2>

        {step === "username" && (
          <>
            <div className="form-field" style={{ marginTop: 16 }}>
              <label>아이디 (이메일)</label>
              <input
                type="text"
                autoFocus
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleUsernameSubmit()}
              />
            </div>
            {error && <p className="error-text">{error}</p>}
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={onClose} disabled={submitting}>
                취소
              </button>
              <button
                className="btn"
                onClick={handleUsernameSubmit}
                disabled={submitting || !username.trim()}
              >
                다음
              </button>
            </div>
          </>
        )}

        {step === "admin-reset" && (
          <>
            <p className="text-muted">
              설정 &gt; 사용자 메뉴에서 다운로드한 복구 키를 입력하세요.
            </p>
            <div className="form-grid" style={{ marginTop: 10 }}>
              <div className="form-field" style={{ gridColumn: "1 / -1" }}>
                <label>복구 키</label>
                <input
                  type="text"
                  style={{ fontFamily: "monospace" }}
                  value={recoveryKey}
                  onChange={(e) => setRecoveryKey(e.target.value)}
                />
              </div>
              <div className="form-field" style={{ gridColumn: "1 / -1" }}>
                <label>새 비밀번호</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>
              <div className="form-field" style={{ gridColumn: "1 / -1" }}>
                <label>새 비밀번호 확인</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
            </div>
            {newPassword && confirmPassword && !passwordsValid && (
              <p className="error-text">비밀번호가 일치하지 않습니다.</p>
            )}
            {error && <p className="error-text">{error}</p>}
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={onClose} disabled={submitting}>
                취소
              </button>
              <button
                className="btn"
                onClick={handleAdminReset}
                disabled={submitting || !recoveryKey.trim() || !passwordsValid}
              >
                {submitting ? "처리 중..." : "비밀번호 초기화"}
              </button>
            </div>
          </>
        )}

        {step === "choose-method" && (
          <>
            <p className="text-muted">초기화 방법을 선택하세요.</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 12 }}>
              <button
                className="btn btn-secondary"
                onClick={handleRequestOtp}
                disabled={submitting || !hasEmail}
              >
                이메일 인증코드로 초기화
              </button>
              {!hasEmail && (
                <p className="text-muted" style={{ marginTop: -4 }}>
                  등록된 이메일이 없어 사용할 수 없습니다.
                </p>
              )}
              <button className="btn btn-secondary" onClick={() => setStep("security")}>
                보안 질문으로 초기화
              </button>
            </div>
            {error && <p className="error-text">{error}</p>}
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={onClose} disabled={submitting}>
                취소
              </button>
            </div>
          </>
        )}

        {step === "otp" && (
          <>
            <p className="text-muted">
              이메일로 전송된 6자리 인증코드를{" "}
              {remainingSeconds > 0 ? `${remainingSeconds}초 이내에` : ""} 입력하세요.
            </p>
            <div className="form-grid" style={{ marginTop: 10 }}>
              <div className="form-field" style={{ gridColumn: "1 / -1" }}>
                <label>인증코드 {remainingSeconds <= 0 && "(만료됨)"}</label>
                <input
                  type="text"
                  maxLength={6}
                  style={{ fontFamily: "monospace" }}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/[^0-9]/g, ""))}
                />
              </div>
              <div className="form-field" style={{ gridColumn: "1 / -1" }}>
                <label>새 비밀번호</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>
              <div className="form-field" style={{ gridColumn: "1 / -1" }}>
                <label>새 비밀번호 확인</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
            </div>
            {newPassword && confirmPassword && !passwordsValid && (
              <p className="error-text">비밀번호가 일치하지 않습니다.</p>
            )}
            {error && <p className="error-text">{error}</p>}
            <div className="modal-actions" style={{ justifyContent: "space-between" }}>
              <button className="btn btn-secondary" onClick={handleRequestOtp} disabled={submitting}>
                재발송
              </button>
              <div style={{ display: "flex", gap: 10 }}>
                <button className="btn btn-secondary" onClick={onClose} disabled={submitting}>
                  취소
                </button>
                <button
                  className="btn"
                  onClick={handleVerifyOtp}
                  disabled={
                    submitting || !otpCode.trim() || !passwordsValid || remainingSeconds <= 0
                  }
                >
                  {submitting ? "처리 중..." : "비밀번호 초기화"}
                </button>
              </div>
            </div>
          </>
        )}

        {step === "security" && (
          <>
            <p className="text-muted">세 질문에 모두 답변하세요.</p>
            <div className="form-grid" style={{ marginTop: 10 }}>
              <div className="form-field" style={{ gridColumn: "1 / -1" }}>
                <label>질문1. {questions[0]}</label>
                <input type="text" value={answer1} onChange={(e) => setAnswer1(e.target.value)} />
              </div>
              <div className="form-field" style={{ gridColumn: "1 / -1" }}>
                <label>질문2. {questions[1]}</label>
                <input type="text" value={answer2} onChange={(e) => setAnswer2(e.target.value)} />
              </div>
              <div className="form-field" style={{ gridColumn: "1 / -1" }}>
                <label>질문3. {questions[2]}</label>
                <input type="text" value={answer3} onChange={(e) => setAnswer3(e.target.value)} />
              </div>
              <div className="form-field" style={{ gridColumn: "1 / -1" }}>
                <label>새 비밀번호</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>
              <div className="form-field" style={{ gridColumn: "1 / -1" }}>
                <label>새 비밀번호 확인</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
            </div>
            {newPassword && confirmPassword && !passwordsValid && (
              <p className="error-text">비밀번호가 일치하지 않습니다.</p>
            )}
            {error && <p className="error-text">{error}</p>}
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={onClose} disabled={submitting}>
                취소
              </button>
              <button
                className="btn"
                onClick={handleVerifySecurityAnswers}
                disabled={
                  submitting ||
                  !answer1.trim() ||
                  !answer2.trim() ||
                  !answer3.trim() ||
                  !passwordsValid
                }
              >
                {submitting ? "처리 중..." : "비밀번호 초기화"}
              </button>
            </div>
          </>
        )}

        {step === "done" && (
          <>
            <p className="text-muted">비밀번호가 초기화되었습니다. 새 비밀번호로 로그인해주세요.</p>
            <div className="modal-actions">
              <button className="btn" onClick={onClose}>
                로그인 페이지로 돌아가기
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default ForgotPasswordModal;
