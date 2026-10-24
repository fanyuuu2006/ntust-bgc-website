"use client";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { TextInput } from "../SiteSettingsFields";
import type { useSiteSettingsForm } from "../SiteSettingsProvider";
import type { SiteSocialLink } from "@/types/site-settings";
type FormState = ReturnType<typeof useSiteSettingsForm>;
export function ContactSettings({ form }: { form: FormState }) {
  function updateLink(index: number, patch: Partial<SiteSocialLink>) {
    form.update(
      "socialLinks",
      form.values.socialLinks.map((link, current) =>
        current === index ? { ...link, ...patch } : link,
      ),
    );
  }
  return (
    <div className="space-y-6">
      <section><TextInput
        id="contactEmail"
        type="email"
        label="公開聯絡信箱"
        hint="顯示於 Footer；留空時不顯示信箱連結。"
        value={form.values.contactEmail ?? ""}
        onChange={(value) => form.update("contactEmail", value)}
      /></section>
      <section className="space-y-4 border-t border-(--border-default) pt-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="font-medium text-(--text-primary)">官方社群連結</h3>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              form.update("socialLinks", [
                ...form.values.socialLinks,
                { label: "", href: "" },
              ])
            }
            disabled={form.values.socialLinks.length >= 20}
          >
            <Plus aria-hidden="true" className="size-4" />
            新增連結
          </Button>
        </div>
        {form.values.socialLinks.length === 0 ? (
          <p className="rounded-xl bg-(--surface-subtle) px-4 py-6 text-center text-sm text-(--text-muted)">
            尚未設定官方社群連結。
          </p>
        ) : (
          <div className="space-y-3">
            {form.values.socialLinks.map((link, index) => (
              <div
                key={index}
                className="grid min-w-0 gap-3 border-b border-(--border-default) pb-4 last:border-b-0 last:pb-0 sm:grid-cols-[minmax(8rem,1fr)_minmax(0,2fr)_auto] sm:items-start"
              >
                <TextInput
                  id={`social-label-${index}`}
                  label="顯示文字"
                  value={link.label}
                  error={form.errors[`social-${index}-label`]}
                  onChange={(value) => updateLink(index, { label: value })}
                />
                <TextInput
                  id={`social-href-${index}`}
                  label="連結網址"
                  value={link.href}
                  error={form.errors[`social-${index}-href`]}
                  onChange={(value) => updateLink(index, { href: value })}
                />
                <Button
                  type="button"
                  variant="danger"
                  size="sm"
                  className="sm:mt-6"
                  onClick={() =>
                    form.update(
                      "socialLinks",
                      form.values.socialLinks.filter(
                        (_, current) => current !== index,
                      ),
                    )
                  }
                >
                  <Trash2 aria-hidden="true" className="size-4" />
                  移除
                </Button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}




