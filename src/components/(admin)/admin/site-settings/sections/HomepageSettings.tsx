"use client";
import { useState } from "react";
import { Eye } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/Modal";
import { HomeHeroPresentation } from "@/components/(public)/home/HomeHeroPresentation";
import { resolveSitePresentation } from "@/libs/site-settings/presentation";
import { ImageSettingField, useObjectUrl } from "../ImageSettingField";
import { TextAreaInput, TextInput, toDraftSettings } from "../SiteSettingsFields";
import type { useSiteSettingsForm } from "../SiteSettingsProvider";
type FormState = ReturnType<typeof useSiteSettingsForm>;
export function HomepageSettings({ form }: { form: FormState }) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const draft = toDraftSettings(form.values);
  const site = resolveSitePresentation(draft);
  const objectUrl = useObjectUrl(form.pendingImages.heroImageUrl);
  return (
    <div className="space-y-6">
      <section className="space-y-4">
        <TextInput
          id="heroTitle"
          label="首頁主標題"
          hint="留空時使用預設內容。"
          value={form.values.heroTitle ?? ""}
          onChange={(value) => form.update("heroTitle", value)}
        />
        <TextAreaInput
          id="heroDescription"
          label="首頁介紹"
          hint="留空時使用預設介紹。"
          value={form.values.heroDescription ?? ""}
          onChange={(value) => form.update("heroDescription", value)}
        />
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-(--border-default) pt-5">
          <h3 className="text-base font-semibold text-(--text-primary)">首頁主視覺</h3>
          <Button type="button" variant="outline" size="sm" onClick={() => setPreviewOpen(true)}><Eye aria-hidden="true" className="size-4" />預覽</Button>
        </div>
        <ImageSettingField
          label="首頁主視覺圖片"
          hint=""
          field="heroImageUrl"
          variant="hero"
          form={form}
        />
      </section>
      <Modal open={previewOpen} onClose={() => setPreviewOpen(false)} title="首頁草稿預覽" description="實際頁面會依可用寬度自然換行。" size="lg"><div className="overflow-hidden"><HomeHeroPresentation {...site} heroImageUrl={objectUrl ?? site.heroImageUrl} preview /></div></Modal>
    </div>
  );
}





