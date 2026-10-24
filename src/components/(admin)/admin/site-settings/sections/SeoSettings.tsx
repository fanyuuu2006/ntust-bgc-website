"use client";
import { useState } from "react";
import { Eye } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/Modal";
import { ImageSettingField, useObjectUrl } from "../ImageSettingField";
import { TextAreaInput, TextInput, toDraftSettings } from "../SiteSettingsFields";
import { SearchPreview, SocialPreview } from "../SiteSettingsPreviewContent";
import { resolveSitePresentation } from "@/libs/site-settings/presentation";
import type { useSiteSettingsForm } from "../SiteSettingsProvider";
type FormState = ReturnType<typeof useSiteSettingsForm>;
export function SeoSettings({ form, siteUrl }: { form: FormState; siteUrl: string }) {
  const [preview, setPreview] = useState<"search" | "social" | null>(null);
  const site = resolveSitePresentation(toDraftSettings(form.values));
  const objectUrl = useObjectUrl(form.pendingImages.defaultOgImageUrl);
  const image = objectUrl ?? site.socialImageUrl;
  return (
    <div className="space-y-6">
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-base font-semibold text-(--text-primary)">搜尋預設</h3>
          <Button type="button" variant="outline" size="sm" aria-label="預覽搜尋結果" title="預覽搜尋結果" onClick={() => setPreview("search")}><Eye aria-hidden="true" className="size-4" />預覽</Button>
        </div>
        <TextInput
          id="seoTitle"
          label="預設搜尋標題"
          hint={`${form.values.seoTitle.length}/200；沒有專屬標題的頁面會使用此值。`}
          value={form.values.seoTitle}
          error={form.errors.seoTitle}
          onChange={(value) => form.update("seoTitle", value)}
          required
        />
        <TextAreaInput
          id="seoDescription"
          label="預設搜尋描述"
          hint={`${form.values.seoDescription.length}/500；頁面專屬描述優先。`}
          value={form.values.seoDescription}
          error={form.errors.seoDescription}
          onChange={(value) => form.update("seoDescription", value)}
          required
        />
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-(--border-default) pt-5">
          <h3 className="text-base font-semibold text-(--text-primary)">社群分享圖片</h3>
          <Button type="button" variant="outline" size="sm" aria-label="預覽社群分享" title="預覽社群分享" onClick={() => setPreview("social")}><Eye aria-hidden="true" className="size-4" />預覽</Button>
        </div>
        <ImageSettingField
          label="圖片"
          hint=""
          field="defaultOgImageUrl"
          variant="og"
          form={form}
        />
      </section>
      <Modal open={preview !== null} onClose={() => setPreview(null)} title={preview === "search" ? "搜尋結果預覽" : "社群分享預覽"} description="實際顯示可能因平台而異。" size="md">{preview === "search" ? <SearchPreview siteUrl={siteUrl} title={site.seoTitle} description={site.seoDescription} /> : <SocialPreview siteName={site.siteName} title={site.seoTitle} description={site.seoDescription} image={image} />}</Modal>
    </div>
  );
}





