import { z } from "zod";

import { identifyMediaSource } from "@/libs/media/media-url";

const optionalText = (max: number) => z.string().trim().max(max).nullable().optional();

const mediaReference = z.string().trim().max(2048).nullable().optional().superRefine((value, context) => {
  if (value === null || value === undefined) return;
  if (value.startsWith("/images/") && !value.includes("..") && !value.includes("\\")) return;
  const source = identifyMediaSource(value, process.env.NEXT_PUBLIC_SUPABASE_URL);
  const reference = source.kind === "site-media-url" || source.kind === "legacy-supabase-url" ? source.reference : null;
  if (!reference || reference.bucket !== "rich-content-images" || !reference.objectPath.startsWith("site-settings/")) {
    context.addIssue({ code: "custom", message: "圖片必須來自網站設定圖片或內建圖片" });
  }
});

export const siteSocialLinkSchema = z.object({
  label: z.string({ error: "請輸入顯示文字" }).trim().min(1, "請輸入顯示文字").max(40, "顯示文字不可超過 40 個字"),
  href: z.string({ error: "請輸入連結網址" }).trim().min(1, "請輸入連結網址").url("請輸入有效的連結網址").max(2048, "連結網址過長").refine((value) => {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password;
  }, "連結網址必須使用 HTTPS，且不可包含帳號或密碼"),
});

export const siteSettingsSchema = z.object({
  siteName: z.string().trim().min(1).max(100),
  siteFullName: z.string().trim().min(1).max(200),
  seoTitle: z.string().trim().min(1).max(200),
  seoDescription: z.string().trim().min(1).max(500),
  contactEmail: z.string().trim().email().max(320).nullable().optional(),
  socialLinks: z.array(siteSocialLinkSchema).max(20).default([]),
  logoMediaUrl: mediaReference,
  faviconMediaUrl: mediaReference,
  defaultOgImageUrl: mediaReference,
  heroTitle: optionalText(200),
  heroDescription: optionalText(1000),
  heroImageUrl: mediaReference,
});

export const siteSettingsPatchSchema = siteSettingsSchema.partial().strict();

export type SiteSettingsInput = z.infer<typeof siteSettingsSchema>;
export type SiteSettingsPatch = z.infer<typeof siteSettingsPatchSchema>;
