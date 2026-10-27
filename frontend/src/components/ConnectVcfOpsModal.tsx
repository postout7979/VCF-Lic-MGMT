import { useState } from "react";

import { createVcfOpsConnection } from "../api/client";
import type { VcfOpsAuthMethod } from "../types";

interface Props {
  onClose: () => void;
  onConnected: () => void;
}

function ConnectVcfOpsModal({ onClose, onConnected }: Props) {
  const [name, setName] = useState("");
  const [host, setHost] = useState("");
  const [authMethod, setAuthMethod] = useState<VcfOpsAuthMethod>("credentials");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [apiToken, setApiToken] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit =
    name.trim() &&
    host.trim() &&
    (authMethod === "credentials" ? username.trim() && password.trim() : apiToken.trim());

  async function handleSubmit() {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      await createVcfOpsConnection({
        name: name.trim(),
        host: host.trim(),
        auth_method: authMethod,
        ...(authMethod === "credentials"
          ? { username: username.trim(), password }
          : { api_token: apiToken.trim() }),
      });
      onConnected();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "VCF Operations 연결에 실패했습니다.");
      onConnected(); // the connection row is created even when the sync attempt fails
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box narrow" onClick={(e) => e.stopPropagation()}>
        <h2>VCF Operations 연결</h2>
        <p className="text-muted">
          VCF 9 Operations에 연결하여 코어 라이센스 할당/사용 현황을 수집합니다.
        </p>

        <div className="form-grid" style={{ marginTop: 16 }}>
          <div className="form-field" style={{ gridColumn: "1 / -1" }}>
            <label>연결 이름</label>
            <input
              type="text"
              placeholder="예: HQ-VCF-Ops"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="form-field" style={{ gridColumn: "1 / -1" }}>
            <label>VCF Operations 호스트 / IP</label>
            <input
              type="text"
              placeholder="vcf-ops.example.com"
              value={host}
              onChange={(e) => setHost(e.target.value)}
            />
          </div>
          <div className="form-field" style={{ gridColumn: "1 / -1" }}>
            <label>인증 방식</label>
            <select
              value={authMethod}
              onChange={(e) => setAuthMethod(e.target.value as VcfOpsAuthMethod)}
            >
              <option value="credentials">아이디 / 비밀번호</option>
              <option value="token">API 토큰</option>
            </select>
          </div>

          {authMethod === "credentials" ? (
            <>
              <div className="form-field">
                <label>사용자 이름</label>
                <input
                  type="text"
                  placeholder="admin"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
              <div className="form-field">
                <label>비밀번호</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </>
          ) : (
            <div className="form-field" style={{ gridColumn: "1 / -1" }}>
              <label>API 토큰</label>
              <input
                type="password"
                placeholder="발급받은 VCF Operations API 토큰"
                value={apiToken}
                onChange={(e) => setApiToken(e.target.value)}
              />
            </div>
          )}
        </div>

        {error && <p className="error-text">{error}</p>}

        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={onClose} disabled={submitting}>
            취소
          </button>
          <button className="btn" onClick={handleSubmit} disabled={submitting || !canSubmit}>
            {submitting ? "연결 중..." : "연결"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConnectVcfOpsModal;
