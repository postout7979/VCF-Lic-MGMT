import { useEffect, useRef, useState } from "react";
import type { ChangeEvent } from "react";

import { downloadBackup, fetchStorageInfo, importBackup } from "../../api/client";
import type { StorageInfo } from "../../types";

const WARNING_THRESHOLD_PERCENT = 80;

function formatBytes(bytes: number): string {
  const gb = bytes / 1024 ** 3;
  if (gb >= 1) return `${gb.toFixed(1)} GB`;
  return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
}

function BackupTab() {
  const [downloading, setDownloading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [storage, setStorage] = useState<StorageInfo | null>(null);
  const [storageError, setStorageError] = useState<string | null>(null);
  const [showExpandGuide, setShowExpandGuide] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchStorageInfo()
      .then(setStorage)
      .catch(() => setStorageError("디스크 사용량 정보를 불러오지 못했습니다."));
  }, []);

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

  const isOverThreshold = (storage?.volume_used_percent ?? 0) >= WARNING_THRESHOLD_PERCENT;

  return (
    <div>
      {error && <p className="error-text">{error}</p>}
      {success && <p className="success-text">{success}</p>}

      <div className="card" style={{ marginBottom: 20 }}>
        <p className="text-muted" style={{ marginTop: 0, marginBottom: storage ? 4 : 0 }}>
          Database가 저장되는 디스크 볼륨의 용량입니다.
        </p>
        {storageError ? (
          <p className="error-text" style={{ marginBottom: 0 }}>
            {storageError}
          </p>
        ) : storage ? (
          <>
            <div className="form-row" style={{ marginBottom: 0, justifyContent: "space-between" }}>
              <span>
                전체 {formatBytes(storage.volume_total_bytes)} 중{" "}
                <strong>{formatBytes(storage.volume_used_bytes)}</strong> 사용 중 (
                {storage.volume_used_percent}%)
              </span>
              <span className="text-muted">DB 데이터 크기: {formatBytes(storage.db_size_bytes)}</span>
            </div>
            <div className="storage-bar-track">
              <div
                className="storage-bar-fill"
                style={{
                  width: `${Math.min(storage.volume_used_percent, 100)}%`,
                  background: isOverThreshold ? "#dc2626" : "#2563eb",
                }}
              />
            </div>
            {isOverThreshold && (
              <div className="warning-box">
                ⚠️ 디스크 사용률이 {WARNING_THRESHOLD_PERCENT}%를 초과했습니다 (현재{" "}
                {storage.volume_used_percent}%). 용량 확보가 필요합니다 — 만료 항목 삭제, 불필요한
                업로드 정리, 또는 아래 디스크 확장을 검토해주세요.
              </div>
            )}
            <div className="form-row" style={{ marginTop: 10, marginBottom: 0 }}>
              <button className="btn btn-secondary" onClick={() => setShowExpandGuide((v) => !v)}>
                DB 크기 확장
              </button>
            </div>
            {showExpandGuide && (
              <div className="notice-box">
                이 앱은 호스트 디스크 위에 Docker 볼륨으로 DB를 저장하므로, 용량 확장은 앱 내부에서
                자동으로는 할 수 없습니다 (디스크/볼륨 그룹에 여유 공간이 있어야 하고, 호스트 root
                권한이 필요합니다). 아래 순서로 진행해주세요:
                <ol style={{ margin: "8px 0 0", paddingLeft: 20 }}>
                  <li>vCenter/하이퍼바이저 또는 클라우드 콘솔에서 이 VM의 가상 디스크 크기를 늘립니다.</li>
                  <li>
                    호스트에 SSH로 접속해 파티션/LVM을 확장합니다 (예: <code>growpart</code>,{" "}
                    <code>sudo lvextend -l +100%FREE /dev/ubuntu-vg/ubuntu-lv</code>,{" "}
                    <code>sudo resize2fs /dev/ubuntu-vg/ubuntu-lv</code>).
                  </li>
                  <li>이 페이지를 새로고침하면 늘어난 용량이 반영됩니다.</li>
                </ol>
              </div>
            )}
          </>
        ) : (
          <p className="text-muted" style={{ marginBottom: 0 }}>
            불러오는 중...
          </p>
        )}
      </div>

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
