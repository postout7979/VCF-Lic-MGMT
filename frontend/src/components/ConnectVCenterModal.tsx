import { useState } from "react";

import { createVCenterConnection } from "../api/client";
import type { VCenterVersionHint } from "../types";

interface Props {
  onClose: () => void;
  onConnected: () => void;
}

function ConnectVCenterModal({ onClose, onConnected }: Props) {
  const [name, setName] = useState("");
  const [host, setHost] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [versionHint, setVersionHint] = useState<VCenterVersionHint>("8.x");
  const [tlsSkip, setTlsSkip] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = name.trim() && host.trim() && username.trim() && password.trim();

  async function handleSubmit() {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      await createVCenterConnection({
        name: name.trim(),
        host: host.trim(),
        username: username.trim(),
        password,
        version_hint: versionHint,
        tls_skip: tlsSkip,
      });
      onConnected();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "vCenter 연결에 실패했습니다.");
      onConnected(); // the connection row is created even when the sync attempt fails
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="modal-overlay">
      <div className="modal-box narrow">
        <h2>vCenter 어답터 연결</h2>
        <p className="text-muted">
          vCenter 7.x 또는 8.x에 연결하여 Cluster/Host/CPU/라이센스 정보를 수집합니다.
        </p>
        <div className="notice-box">
          보안을 위해 전체 권한 계정이 아닌 Read-only(읽기 전용) 계정 사용을 권장합니다.
        </div>

        <div className="form-grid" style={{ marginTop: 16 }}>
          <div className="form-field" style={{ gridColumn: "1 / -1" }}>
            <label>연결 이름</label>
            <input
              type="text"
              placeholder="예: HQ-vCenter"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="form-field" style={{ gridColumn: "1 / -1" }}>
            <label>vCenter 호스트 / IP</label>
            <input
              type="text"
              placeholder="vcenter.example.com"
              value={host}
              onChange={(e) => setHost(e.target.value)}
            />
          </div>
          <div className="form-field">
            <label>사용자 이름</label>
            <input
              type="text"
              placeholder="administrator@vsphere.local"
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
          <div className="form-field" style={{ gridColumn: "1 / -1" }}>
            <label>vCenter 버전</label>
            <select
              value={versionHint}
              onChange={(e) => setVersionHint(e.target.value as VCenterVersionHint)}
            >
              <option value="7.x">7.x</option>
              <option value="8.x">8.x</option>
            </select>
          </div>
          <div className="form-field" style={{ gridColumn: "1 / -1" }}>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={tlsSkip}
                onChange={(e) => setTlsSkip(e.target.checked)}
              />
              TLS 인증서 검증 건너뛰기 (자체 서명 인증서 사용 시 체크)
            </label>
          </div>
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

export default ConnectVCenterModal;
