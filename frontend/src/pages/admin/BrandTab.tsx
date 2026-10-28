import { useEffect, useRef, useState } from "react";

import {
  BRAND_BACKGROUND_IMAGE_URL,
  BRAND_LOGO_IMAGE_URL,
  deleteBrandBackground,
  deleteBrandLogo,
  fetchBrandInfo,
  resetBrandToDefault,
  uploadBrandBackground,
  uploadBrandLogo,
} from "../../api/client";
import type { BrandInfo } from "../../types";

function BrandTab() {
  const [info, setInfo] = useState<BrandInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploadingBackground, setUploadingBackground] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [cacheBust, setCacheBust] = useState(() => Date.now());
  const backgroundInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  function load() {
    fetchBrandInfo()
      .then(setInfo)
      .catch(() => setError("브랜드 설정을 불러오지 못했습니다."))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  async function handleBackgroundUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingBackground(true);
    setError(null);
    try {
      const result = await uploadBrandBackground(file);
      setInfo(result);
      setCacheBust(Date.now());
    } catch (err) {
      setError(err instanceof Error ? err.message : "업로드에 실패했습니다.");
    } finally {
      setUploadingBackground(false);
      if (backgroundInputRef.current) backgroundInputRef.current.value = "";
    }
  }

  async function handleBackgroundDelete() {
    if (!window.confirm("배경 이미지를 삭제할까요?")) return;
    try {
      await deleteBrandBackground();
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "삭제에 실패했습니다.");
    }
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLogo(true);
    setError(null);
    try {
      const result = await uploadBrandLogo(file);
      setInfo(result);
      setCacheBust(Date.now());
    } catch (err) {
      setError(err instanceof Error ? err.message : "업로드에 실패했습니다.");
    } finally {
      setUploadingLogo(false);
      if (logoInputRef.current) logoInputRef.current.value = "";
    }
  }

  async function handleLogoDelete() {
    if (!window.confirm("브랜드 로고를 삭제할까요?")) return;
    try {
      await deleteBrandLogo();
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "삭제에 실패했습니다.");
    }
  }

  async function handleResetToDefault() {
    if (
      !window.confirm(
        "배경화면과 기업 로고를 기본 이미지로 되돌릴까요? 현재 이미지는 사라집니다.",
      )
    ) {
      return;
    }
    setResetting(true);
    setError(null);
    try {
      const result = await resetBrandToDefault();
      setInfo(result);
      setCacheBust(Date.now());
    } catch (err) {
      setError(err instanceof Error ? err.message : "초기화에 실패했습니다.");
    } finally {
      setResetting(false);
    }
  }

  if (loading) {
    return <p className="text-muted">불러오는 중...</p>;
  }

  return (
    <div>
      {error && <p className="error-text">{error}</p>}

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="form-row" style={{ marginBottom: 0, justifyContent: "flex-end" }}>
          <button
            className="btn btn-secondary"
            onClick={handleResetToDefault}
            disabled={resetting}
          >
            {resetting ? "초기화 중..." : "배경화면 및 기업 로고 초기화"}
          </button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <p className="text-muted" style={{ marginTop: 0 }}>
          로그인 페이지 배경에 반투명하게 표시할 이미지입니다. 큰 이미지는 업로드 시 자동으로
          적절한 크기로 조절됩니다.
        </p>
        <div className="form-row" style={{ marginBottom: info?.has_background_image ? 14 : 0 }}>
          <input
            ref={backgroundInputRef}
            type="file"
            accept="image/*"
            onChange={handleBackgroundUpload}
            disabled={uploadingBackground}
          />
          {info?.has_background_image && (
            <button className="btn btn-danger" onClick={handleBackgroundDelete}>
              삭제
            </button>
          )}
        </div>
        {info?.has_background_image && (
          <img
            src={`${BRAND_BACKGROUND_IMAGE_URL}?t=${cacheBust}`}
            alt="배경 이미지 미리보기"
            style={{
              maxWidth: 360,
              maxHeight: 200,
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--color-border)",
            }}
          />
        )}
      </div>

      <div className="card">
        <p className="text-muted" style={{ marginTop: 0 }}>
          로그인 박스 위에 표시할 기업 로고입니다. 큰 이미지는 업로드 시 자동으로 적절한 크기로
          조절됩니다.
        </p>
        <div className="form-row" style={{ marginBottom: info?.has_logo_image ? 14 : 0 }}>
          <input
            ref={logoInputRef}
            type="file"
            accept="image/*"
            onChange={handleLogoUpload}
            disabled={uploadingLogo}
          />
          {info?.has_logo_image && (
            <button className="btn btn-danger" onClick={handleLogoDelete}>
              삭제
            </button>
          )}
        </div>
        {info?.has_logo_image && (
          <img
            src={`${BRAND_LOGO_IMAGE_URL}?t=${cacheBust}`}
            alt="브랜드 로고 미리보기"
            style={{
              maxWidth: 240,
              maxHeight: 120,
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--color-border)",
            }}
          />
        )}
      </div>
    </div>
  );
}

export default BrandTab;
