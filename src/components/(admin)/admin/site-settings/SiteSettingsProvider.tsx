"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

import { useToast } from "@/contexts/ToastContext";
import { apiClient } from "@/libs/api/client";
import { ApiError } from "@/libs/api/errors";
import type { SiteSettingsPatch } from "@/services/site-settings/site-settings.schema";
import type { SiteSettings } from "@/types/site-settings";

export type EditableSiteSettings = Omit<SiteSettings, "updatedAt" | "updatedBy">;
export type SiteImageField = "logoMediaUrl" | "faviconMediaUrl" | "defaultOgImageUrl" | "heroImageUrl";
export type PendingSiteImages = Partial<Record<SiteImageField, File>>;

const DRAFT_KEY = "admin-site-settings-draft-v1";
const EMPTY_SETTINGS: EditableSiteSettings = {
  siteName: "", siteFullName: "", seoTitle: "", seoDescription: "", contactEmail: "", socialLinks: [],
  logoMediaUrl: "", faviconMediaUrl: "", defaultOgImageUrl: "", heroTitle: "", heroDescription: "", heroImageUrl: "",
};
const UPLOAD_FIELDS: Record<SiteImageField, "logo" | "favicon" | "og" | "hero"> = {
  logoMediaUrl: "logo", faviconMediaUrl: "favicon", defaultOgImageUrl: "og", heroImageUrl: "hero",
};

function toEditable(settings: SiteSettings): EditableSiteSettings {
  return {
    siteName: settings.siteName, siteFullName: settings.siteFullName, seoTitle: settings.seoTitle,
    seoDescription: settings.seoDescription, contactEmail: settings.contactEmail ?? "",
    socialLinks: settings.socialLinks.map((link) => ({ ...link })), logoMediaUrl: settings.logoMediaUrl ?? "",
    faviconMediaUrl: settings.faviconMediaUrl ?? "", defaultOgImageUrl: settings.defaultOgImageUrl ?? "",
    heroTitle: settings.heroTitle ?? "", heroDescription: settings.heroDescription ?? "", heroImageUrl: settings.heroImageUrl ?? "",
  };
}

export function validateSocialLinks(links: EditableSiteSettings["socialLinks"]): Record<string, string> {
  const errors: Record<string, string> = {};
  links.forEach((link, index) => {
    if (!link.label.trim()) errors["social-" + index + "-label"] = "請輸入顯示文字";
    try {
      const url = new URL(link.href.trim());
      if (url.protocol !== "https:" || url.username || url.password) throw new Error();
    } catch {
      errors["social-" + index + "-href"] = "請輸入有效的 HTTPS 連結網址";
    }
  });
  return errors;
}

export function buildSiteSettingsPatch(values: EditableSiteSettings): SiteSettingsPatch {
  return {
    siteName: values.siteName.trim(), siteFullName: values.siteFullName.trim(), seoTitle: values.seoTitle.trim(),
    seoDescription: values.seoDescription.trim(), contactEmail: values.contactEmail?.trim() || null,
    socialLinks: values.socialLinks.map((link) => ({ label: link.label.trim(), href: link.href.trim() })),
    logoMediaUrl: values.logoMediaUrl || null, faviconMediaUrl: values.faviconMediaUrl || null,
    defaultOgImageUrl: values.defaultOgImageUrl || null, heroTitle: values.heroTitle?.trim() || null,
    heroDescription: values.heroDescription?.trim() || null, heroImageUrl: values.heroImageUrl || null,
  };
}

type ContextValue = {
  values: EditableSiteSettings;
  pendingImages: PendingSiteImages;
  errors: Record<string, string>;
  loading: boolean;
  saving: boolean;
  dirty: boolean;
  loadError: string | null;
  saveError: string | null;
  update: <K extends keyof EditableSiteSettings>(key: K, value: EditableSiteSettings[K]) => void;
  setPendingImage: (field: SiteImageField, file?: File) => void;
  save: () => Promise<void>;
  restore: () => void;
  reload: () => Promise<void>;
};

const SiteSettingsContext = createContext<ContextValue | null>(null);

export function SiteSettingsProvider({ children }: { children: React.ReactNode }) {
  const { showToast } = useToast();
  const [values, setValues] = useState(EMPTY_SETTINGS);
  const [saved, setSaved] = useState(EMPTY_SETTINGS);
  const [pendingImages, setPendingImages] = useState<PendingSiteImages>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const dirty = useMemo(() => JSON.stringify(values) !== JSON.stringify(saved) || Object.keys(pendingImages).length > 0, [values, saved, pendingImages]);

  async function reload() {
    setLoading(true); setLoadError(null);
    try {
      const response = await apiClient<{ data: SiteSettings }>("/api/admin/site-settings");
      const baseline = toEditable(response.data);
      const storedDraft = sessionStorage.getItem(DRAFT_KEY);
      setSaved(baseline);
      setValues(storedDraft ? { ...baseline, ...(JSON.parse(storedDraft) as Partial<EditableSiteSettings>) } : baseline);
      setPendingImages({});
    } catch (error) {
      setLoadError(error instanceof ApiError ? error.message : "讀取網站設定失敗，請稍後再試。");
    } finally { setLoading(false); }
  }

  useEffect(() => {
    // 初次掛載從管理 API 建立表單基準值；後續子路由切換會保留同一個 Provider。
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void reload();
  }, []);
  useEffect(() => {
    if (loading) return;
    if (dirty) sessionStorage.setItem(DRAFT_KEY, JSON.stringify(values));
    else sessionStorage.removeItem(DRAFT_KEY);
  }, [dirty, loading, values]);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  function update<K extends keyof EditableSiteSettings>(key: K, value: EditableSiteSettings[K]) {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => {
      const next = { ...current, [key]: "" };
      if (key === "socialLinks") Object.keys(next).filter((errorKey) => errorKey.startsWith("social-")).forEach((errorKey) => delete next[errorKey]);
      return next;
    });
    setSaveError(null);
  }
  function setPendingImage(field: SiteImageField, file?: File) {
    setPendingImages((current) => { const next = { ...current }; if (file) next[field] = file; else delete next[field]; return next; });
  }
  function validate(): boolean {
    const next: Record<string, string> = {};
    if (!values.siteName.trim()) next.siteName = "請填寫網站名稱";
    if (!values.siteFullName.trim()) next.siteFullName = "請填寫社團正式名稱";
    if (!values.seoTitle.trim()) next.seoTitle = "請填寫預設搜尋標題";
    if (!values.seoDescription.trim()) next.seoDescription = "請填寫預設搜尋描述";
    Object.assign(next, validateSocialLinks(values.socialLinks));
    setErrors(next); return Object.keys(next).length === 0;
  }
  async function upload(field: SiteImageField, file: File): Promise<string> {
    const body = new FormData(); body.append("field", UPLOAD_FIELDS[field]); body.append("file", file);
    const response = await fetch("/api/admin/site-settings/images", { method: "POST", body });
    const payload = await response.json().catch(() => null) as { data?: { src?: string }; message?: string } | null;
    if (!response.ok || !payload?.data?.src) throw new Error(payload?.message ?? "圖片上傳失敗");
    return payload.data.src;
  }
  async function save() {
    if (saving || !validate()) return;
    setSaving(true); setSaveError(null);
    try {
      const nextValues = { ...values };
      for (const field of Object.keys(pendingImages) as SiteImageField[]) {
        const file = pendingImages[field];
        if (file) { nextValues[field] = await upload(field, file); setValues((current) => ({ ...current, [field]: nextValues[field] })); setPendingImage(field); }
      }
      const response = await apiClient<{ data: SiteSettings }>("/api/admin/site-settings", { method: "PATCH", body: buildSiteSettingsPatch(nextValues) });
      const baseline = toEditable(response.data);
      setValues(baseline); setSaved(baseline); setPendingImages({}); sessionStorage.removeItem(DRAFT_KEY);
      showToast("success", "網站設定已儲存，公開頁面會在快取更新後套用。");
    } catch (error) { setSaveError(error instanceof Error ? error.message : "儲存網站設定失敗，輸入內容已保留。"); }
    finally { setSaving(false); }
  }
  function restore() { setValues(saved); setPendingImages({}); setErrors({}); setSaveError(null); sessionStorage.removeItem(DRAFT_KEY); }

  return <SiteSettingsContext.Provider value={{ values, pendingImages, errors, loading, saving, dirty, loadError, saveError, update, setPendingImage, save, restore, reload }}>{children}</SiteSettingsContext.Provider>;
}

export function useSiteSettingsForm(): ContextValue {
  const value = useContext(SiteSettingsContext);
  if (!value) throw new Error("useSiteSettingsForm must be used within SiteSettingsProvider");
  return value;
}
