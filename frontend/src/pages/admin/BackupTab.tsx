import { useRef, useState } from "react";
import type { ChangeEvent } from "react";

import { downloadBackup, importBackup } from "../../api/client";

function BackupTab() {
  const [downloading, setDownloading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleDownload() {
    setDownloading(true);
    setError(null);
    setSuccess(null);
    try {
      await downloadBackup();
    } catch (err) {
      setError(err instanceof Error ? err.message : "백업 다운로드에 실패했습니다.");
    } finally {
      setDownloading(false);
    }
  }

  async function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (
      !window.confirm(
        "백업 파일로 복구하면 현재 저장된 모든 데이터가 이 백업 시점의 데이터로 완전히 교체됩니다. 계속하시겠습니까?",
      )
    ) {
      e.target.value = "";
      return;
    }
    setUploading(true);
    setError(null);
    setSuccess(null);
    try {
      await importBackup(file);
      setSuccess("복구가 완료되었습니다. 잠시 후 페이지를 새로고침합니다...");
      setTimeout(() => window.location.reload(), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "복구에 실패했습니다.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <div>
      {error && <p className="error-text">{error}</p>}
      {success && <p className="success-text">{success}</p>}

      <div className="card" style={{ marginBottom: 20 }}>
        <p className="text-muted" style={{ marginTop: 0 }}>
          현재 데이터베이스 전체를 백업 파일(.sql)로 다운로드합니다.
        </p>
        <button className="btn" onClick={handleDownload} disabled={downloading}>
          {downloading ? "백업 생성 중..." : "백업 다운로드"}
        </button>
      </div>

      <div className="card">
        <p className="text-muted" style={{ marginTop: 0 }}>
          백업 파일을 업로드하여 데이터베이스를 복구합니다. 현재 저장된 모든 데이터는 백업 시점의
          데이터로 교체됩니다.
        </p>
        <div className="form-row" style={{ marginBottom: 0 }}>
          <input
            ref={fileInputRef}
            type="file"
            accept=".sql"
            onChange={handleFileChange}
            disabled={uploading}
          />
          {uploading && <span className="text-muted">복구 중...</span>}
        </div>
      </div>
    </div>
  );
}

export default BackupTab;
