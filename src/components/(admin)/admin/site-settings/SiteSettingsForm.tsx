"use client";

import { RotateCcw } from "lucide-react";

import { FormFeedback } from "@/components/FormFeedback";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useSiteSettingsForm } from "./SiteSettingsProvider";
import type { SiteSettingsCategory } from "./site-settings-navigation";
import { BrandingSettings } from "./sections/BrandingSettings";
import { HomepageSettings } from "./sections/HomepageSettings";
import { ContactSettings } from "./sections/ContactSettings";
import { SeoSettings } from "./sections/SeoSettings";

const categoryCopy: Record<SiteSettingsCategory, { title: string }> = {
  branding: { title: "品牌識別" },
  homepage: { title: "首頁內容" },
  contact: { title: "聯絡與社群" },
  seo: { title: "搜尋與分享" },
};

export function SiteSettingsForm({
  category,
  siteUrl,
}: {
  category: SiteSettingsCategory;
  siteUrl: string;
}) {
  const form = useSiteSettingsForm();
  const copy = categoryCopy[category];
  if (form.loading) return <SettingsLoading />;
  if (form.loadError)
    return (
      <Card className="space-y-3 p-5">
        <FormFeedback error={form.loadError} />
        <Button variant="outline" onClick={() => void form.reload()}>
          重新載入
        </Button>
      </Card>
    );

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void form.save();
      }}
      noValidate
      className="space-y-5"
    >
      <header className="border-b border-(--border-default) pb-3">
        <h2 className="text-xl font-bold text-(--text-primary)">
          {copy.title}
        </h2>
      </header>
      {category === "branding" ? <BrandingSettings form={form} /> : null}
      {category === "homepage" ? <HomepageSettings form={form} /> : null}
      {category === "contact" ? <ContactSettings form={form} /> : null}
      {category === "seo" ? <SeoSettings form={form} siteUrl={siteUrl} /> : null}
      <div className="space-y-3 border-t border-(--border-default) pt-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <p className="mr-auto text-sm text-(--text-muted)">
            {form.dirty ? "有尚未儲存的變更" : "已儲存"}
          </p>
          <div className="flex w-full flex-col-reverse gap-2 sm:w-auto sm:flex-row">
            <Button
              type="button"
              variant="outline"
              onClick={form.restore}
              disabled={!form.dirty || form.saving}
              className="w-full sm:w-auto"
            >
              <RotateCcw aria-hidden="true" className="size-4" />
              還原變更
            </Button>
            <Button
              type="submit"
              isLoading={form.saving}
              disabled={!form.dirty}
              className="w-full sm:w-auto"
            >
              儲存所有變更
            </Button>
          </div>
        </div>
        {form.saveError ? <FormFeedback error={form.saveError} /> : null}
      </div>
    </form>
  );
}


function SettingsLoading() {
  return (
    <div className="space-y-5">
      <div className="skeleton h-16 rounded-xl" />
      <div className="skeleton h-80 rounded-xl" />
    </div>
  );
}






