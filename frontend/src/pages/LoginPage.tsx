import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Navigate, useLocation } from "react-router-dom";

import { BRAND_BACKGROUND_IMAGE_URL, BRAND_LOGO_IMAGE_URL, fetchBrandInfo } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import ForgotPasswordModal from "../components/ForgotPasswordModal";
import SignupRequestModal from "../components/SignupRequestModal";
import type { BrandInfo } from "../types";

function LoginPage() {
  const { user, loading, login } = useAuth();
  const location = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showSignupRequest, setShowSignupRequest] = useState(false);
  const [brand, setBrand] = useState<BrandInfo | null>(null);

  useEffect(() => {
    fetchBrandInfo()
      .then(setBrand)
      .catch(() => setBrand(null));
  }, []);

  if (loading) {
    return <p className="text-muted" style={{ padding: 24 }}>불러오는 중...</p>;
  }
  if (user) {
    const from = (location.state as { from?: string } | null)?.from ?? "/license-overview";
    return <Navigate to={from} replace />;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!username.trim() || !password) return;
    setSubmitting(true);
    setError(null);
    try {
      await login(username.trim(), password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "로그인에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--color-bg)",
        overflow: "hidden",
      }}
    >
      {brand?.has_background_image && (
        <img
          src={BRAND_BACKGROUND_IMAGE_URL}
          alt=""
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            opacity: 0.16,
          }}
        />
      )}

      <div
        style={{
          position: "absolute",
          top: 24,
          right: 32,
          fontSize: 16,
          fontWeight: 700,
          letterSpacing: "0.01em",
          color: "var(--color-text-muted)",
        }}
      >
        BROADCOM KOREA
      </div>

      <div
        style={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        {brand?.has_logo_image && (
          <img
            src={BRAND_LOGO_IMAGE_URL}
            alt="기업 로고"
            style={{ maxWidth: 240, maxHeight: 120, objectFit: "contain", marginBottom: 20 }}
          />
        )}
        <form className="card" style={{ width: 360 }} onSubmit={handleSubmit}>
          <h2 style={{ marginTop: 0, textAlign: "center" }}>VCF License Management</h2>
        <div className="form-field" style={{ marginBottom: 14 }}>
          <label>아이디 (이메일)</label>
          <input
            type="text"
            autoFocus
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </div>
        <div className="form-field" style={{ marginBottom: 14 }}>
          <label>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        {error && (
          <p className="error-text" style={{ marginBottom: 14 }}>
            {error}
          </p>
        )}
        <button
          type="submit"
          className="btn"
          style={{ width: "100%" }}
          disabled={submitting || !username.trim() || !password}
        >
          {submitting ? "로그인 중..." : "로그인"}
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          style={{ width: "100%", marginTop: 10 }}
          onClick={() => setShowForgotPassword(true)}
        >
          비밀번호를 잊으셨나요?
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          style={{ width: "100%", marginTop: 10 }}
          onClick={() => setShowSignupRequest(true)}
        >
          사용자 신규 신청
        </button>
        </form>
      </div>

      <div
        style={{
          position: "absolute",
          bottom: 18,
          left: 0,
          right: 0,
          textAlign: "center",
          fontSize: 12,
          color: "var(--color-text-muted)",
        }}
      >
        © {new Date().getFullYear()} BROADCOM KOREA. All rights reserved.
      </div>

      {showForgotPassword && (
        <ForgotPasswordModal onClose={() => setShowForgotPassword(false)} />
      )}
      {showSignupRequest && (
        <SignupRequestModal onClose={() => setShowSignupRequest(false)} />
      )}
    </div>
  );
}

export default LoginPage;
