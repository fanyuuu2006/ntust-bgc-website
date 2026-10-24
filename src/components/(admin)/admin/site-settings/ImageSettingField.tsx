"use client";

/* eslint-disable @next/next/no-img-element -- 本機 blob 草稿預覽不適用 Image optimizer。 */
import { useEffect, useMemo, useState } from "react";
import { ImageIcon, Upload } from "lucide-react";
import { FormFeedback } from "@/components/FormFeedback";
import { Button } from "@/components/ui/Button";
import type { SiteImageField, useSiteSettingsForm } from "./SiteSettingsProvider";
import { cn } from "@/utils/className";

type FormState = ReturnType<typeof useSiteSettingsForm>;

export function useObjectUrl(file?: File): string | null {
  const url = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);
  return url;
}

export function ImageSettingField({
  label,
  hint,
  field,
  variant,
  form,
  formatHint = "JPEG、PNG、WebP，最大 4 MiB。",
}: {
  label: string;
  hint: string;
  field: SiteImageField;
  variant: "logo" | "favicon" | "og" | "hero";
  form: FormState;
  formatHint?: string;
}) {
  const file = form.pendingImages[field];
  const objectUrl = useObjectUrl(file);
  const value = form.values[field] ?? "";
  const preview = objectUrl ?? value;
  const [error, setError] = useState<string | null>(null);
  const box = variant === "og" ? "aspect-[1.91/1] w-40 max-w-full" : variant === "hero" ? "aspect-[16/9] w-40 max-w-full" : "size-20 sm:size-24";

  function select(next: File) {
    if (!next.size || next.size > 4 * 1024 * 1024) return setError("圖片大小必須介於 1 byte 與 4 MiB 之間");
    if (!( ["image/jpeg", "image/png", "image/webp"] as string[]).includes(next.type)) return setError("僅支援 JPEG、PNG 或 WebP 圖片");
    setError(null);
    form.setPendingImage(field, next);
  }

  return (
    <div className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-start gap-3 py-2 sm:gap-4">
      <div className={cn("flex shrink-0 items-center justify-center overflow-hidden rounded-lg border border-(--border-default) bg-(--surface-default)", box)}>
        {preview ? <img src={preview} alt={`${label}預覽`} className={cn(variant === "logo" || variant === "favicon" ? "size-full object-contain" : "size-full object-cover")} /> : <ImageIcon aria-hidden="true" className="size-6 text-(--text-muted)" />}
      </div>
      <div className="min-w-0 space-y-2 max-[420px]:col-span-2">
        <div>
          <h3 className="font-medium text-(--text-primary)">{label}</h3>
          {hint ? <p className="mt-0.5 text-xs leading-5 text-(--text-muted)">{hint}</p> : null}
          {formatHint ? <p className="text-xs text-(--text-muted)">{formatHint}</p> : null}
          {file ? <p className="break-words text-xs font-medium text-(--status-warning)">已選擇新圖片，儲存設定後才會上傳並套用。</p> : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="btn outline relative inline-flex min-h-9 cursor-pointer items-center gap-2 rounded-lg px-3 py-1.5 text-sm">
            <Upload aria-hidden="true" className="size-4" />
            {preview ? "更換圖片" : "選擇圖片"}
            <input type="file" accept="image/jpeg,image/png,image/webp" className="absolute inset-0 cursor-pointer opacity-0" onChange={(event) => { const next = event.target.files?.[0]; event.target.value = ""; if (next) select(next); }} />
          </label>
          {file ? <Button type="button" variant="ghost" size="sm" onClick={() => form.setPendingImage(field)}>取消選取</Button> : null}
          {value ? <Button type="button" variant="ghost" size="sm" onClick={() => { form.setPendingImage(field); form.update(field, ""); }}>恢復預設</Button> : null}
        </div>
        {error ? <FormFeedback error={error} /> : null}
      </div>
    </div>
  );
}
