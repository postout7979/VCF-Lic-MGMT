import { useEffect, useState } from "react";

import { fetchNetworkSettings, updateNetworkSettings } from "../../api/client";

function NetworkTab() {
  const [dnsServer, setDnsServer] = useState("");
  const [ntpServer, setNtpServer] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetchNetworkSettings()
      .then((data) => {
        setDnsServer(data.dns_server);
        setNtpServer(data.ntp_server);
      })
      .catch(() => setError("Network 설정을 불러오지 못했습니다."))
      .finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await updateNetworkSettings({
        dns_server: dnsServer.trim(),
        ntp_server: ntpServer.trim(),
      });
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="text-muted">불러오는 중...</p>;
  }

  return (
    <div>
      <div className="card">
        <p className="text-muted" style={{ marginTop: 0 }}>
          SMTP 메일 발송 시 사용할 DNS 서버(릴레이 호스트 이름 조회)와 NTP 서버(발송 시각
          동기화) 주소를 설정합니다.
        </p>

        <div className="form-grid">
          <div className="form-field">
            <label>DNS 서버</label>
            <input
              type="text"
              placeholder="8.8.8.8"
              value={dnsServer}
              onChange={(e) => setDnsServer(e.target.value)}
            />
          </div>
          <div className="form-field">
            <label>NTP 서버</label>
            <input
              type="text"
              placeholder="pool.ntp.org"
              value={ntpServer}
              onChange={(e) => setNtpServer(e.target.value)}
            />
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
    </div>
  );
}

export default NetworkTab;
