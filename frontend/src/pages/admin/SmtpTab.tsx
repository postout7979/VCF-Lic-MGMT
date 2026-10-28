import { useEffect, useState } from "react";

import { fetchSmtpSettings, sendTestEmail, updateSmtpSettings } from "../../api/client";

function SmtpTab() {
  const [host, setHost] = useState("");
  const [port, setPort] = useState(587);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [useTls, setUseTls] = useState(true);
  const [fromAddress, setFromAddress] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const [testAddress, setTestAddress] = useState("");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [testError, setTestError] = useState<string | null>(null);

  useEffect(() => {
    fetchSmtpSettings()
      .then((data) => {
        setHost(data.host);
        setPort(data.port);
        setUsername(data.username);
        setPassword(data.password);
        setUseTls(data.use_tls);
        setFromAddress(data.from_address);
      })
      .catch(() => setError("SMTP 설정을 불러오지 못했습니다."))
      .finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await updateSmtpSettings({
        host: host.trim(),
        port,
        username: username.trim(),
        password,
        use_tls: useTls,
        from_address: fromAddress.trim(),
      });
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  }

  async function handleTest() {
    if (!testAddress.trim()) return;
    setTesting(true);
    setTestResult(null);
    setTestError(null);
    try {
      await sendTestEmail(testAddress.trim());
      setTestResult("테스트 메일을 발송했습니다. 수신 여부를 확인해주세요.");
    } catch (err) {
      setTestError(err instanceof Error ? err.message : "테스트 메일 발송에 실패했습니다.");
    } finally {
      setTesting(false);
    }
  }

  if (loading) {
    return <p className="text-muted">불러오는 중...</p>;
  }

  return (
    <div>
      <div className="card" style={{ marginBottom: 20 }}>
        <p className="text-muted" style={{ marginTop: 0 }}>
          비밀번호 초기화 인증코드 등 이메일 발송에 사용할 SMTP 릴레이 서버 정보를 설정합니다.
        </p>

        <div className="form-grid">
          <div className="form-field">
            <label>SMTP Host</label>
            <input
              type="text"
              placeholder="smtp.example.com"
              value={host}
              onChange={(e) => setHost(e.target.value)}
            />
          </div>
          <div className="form-field">
            <label>Port</label>
            <input
              type="number"
              value={port}
              onChange={(e) => setPort(Number(e.target.value) || 0)}
            />
          </div>
          <div className="form-field">
            <label>Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>
          <div className="form-field">
            <label>Password</label>
            <div className="form-row" style={{ marginBottom: 0 }}>
              <input
                type={showPassword ? "text" : "password"}
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
          <div className="form-field" style={{ gridColumn: "1 / -1" }}>
            <label>발신 이메일 주소 (From)</label>
            <input
              type="text"
              placeholder="noreply@example.com"
              value={fromAddress}
              onChange={(e) => setFromAddress(e.target.value)}
            />
          </div>
          <div className="form-field" style={{ gridColumn: "1 / -1" }}>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={useTls}
                onChange={(e) => setUseTls(e.target.checked)}
              />
              TLS 사용 (STARTTLS)
            </label>
          </div>
        </div>

        {error && <p className="error-text">{error}</p>}
        {saved && !error && <p className="text-muted">저장되었습니다.</p>}

        <div className="modal-actions" style={{ justifyContent: "flex-start" }}>
          <button className="btn" onClick={handleSave} disabled={saving}>
            {saving ? "저장 중..." : "저장"}
          </button>
        </div>
      </div>

      <div className="card">
        <p className="text-muted" style={{ marginTop: 0 }}>
          설정을 저장한 뒤, 테스트 메일을 발송해 정상 동작하는지 확인하세요.
        </p>
        <div className="form-row">
          <input
            type="text"
            placeholder="수신 이메일 주소"
            value={testAddress}
            onChange={(e) => setTestAddress(e.target.value)}
            style={{ flex: 1 }}
          />
          <button
            className="btn btn-secondary"
            onClick={handleTest}
            disabled={testing || !testAddress.trim()}
          >
            {testing ? "발송 중..." : "테스트 메일 발송"}
          </button>
        </div>
        {testResult && <p className="text-muted">{testResult}</p>}
        {testError && <p className="error-text">{testError}</p>}
      </div>
    </div>
  );
}

export default SmtpTab;
