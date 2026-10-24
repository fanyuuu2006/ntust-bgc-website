"use client";
import { ImageSettingField } from "../ImageSettingField";
import { TextInput } from "../SiteSettingsFields";
import type { useSiteSettingsForm } from "../SiteSettingsProvider";
type FormState = ReturnType<typeof useSiteSettingsForm>;
export function BrandingSettings({ form }: { form: FormState }) {
  return (
    <div className="space-y-6">
      <section>
        <div className="grid gap-4 sm:grid-cols-2">
        <TextInput
          id="siteName"
          label="網站名稱"
          hint=""
          value={form.values.siteName}
          error={form.errors.siteName}
          onChange={(value) => form.update("siteName", value)}
          required
        />
        <TextInput
          id="siteFullName"
          label="社團正式名稱"
          hint=""
          value={form.values.siteFullName}
          error={form.errors.siteFullName}
          onChange={(value) => form.update("siteFullName", value)}
          required
        />
        </div>
      </section>
      <section className="space-y-3 border-t border-(--border-default) pt-5">
        <h3 className="text-base font-semibold text-(--text-primary)">品牌圖片</h3>
        <div className="grid gap-x-5 gap-y-2 md:grid-cols-2">
        <ImageSettingField
          label="網站 Logo"
          hint=""
          field="logoMediaUrl"
          variant="logo"
          form={form}
        />
        <ImageSettingField
          label="瀏覽器網站圖示"
          hint=""
          formatHint=""
          field="faviconMediaUrl"
          variant="favicon"
          form={form}
        />
        </div>
      </section>
    </div>
  );
}





