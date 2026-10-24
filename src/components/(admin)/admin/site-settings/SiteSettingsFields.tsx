// 圖片待儲存提示：按下「儲存設定」後才會上傳並套用。
"use client";
import { Field, getFieldDescribedBy } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import type { SiteSettings } from "@/types/site-settings";
import type { EditableSiteSettings } from "./SiteSettingsProvider";
export function toDraftSettings(values: EditableSiteSettings): SiteSettings { return { ...values, contactEmail: values.contactEmail || null, logoMediaUrl: values.logoMediaUrl || null, faviconMediaUrl: values.faviconMediaUrl || null, defaultOgImageUrl: values.defaultOgImageUrl || null, heroTitle: values.heroTitle || null, heroDescription: values.heroDescription || null, heroImageUrl: values.heroImageUrl || null, updatedAt: null, updatedBy: null }; }
export function TextInput({ id, label, hint, value, onChange, error, required, type = "text" }: { id: string; label: string; hint?: string; value: string; onChange: (value: string) => void; error?: string; required?: boolean; type?: string }) { return <Field label={label} htmlFor={id} hint={hint} hintPlacement="below" error={error} required={required}><Input id={id} type={type} value={value} onChange={(event) => onChange(event.target.value)} invalid={!!error} aria-describedby={getFieldDescribedBy(id, hint, error)} /></Field>; }
export function TextAreaInput({ id, label, hint, value, onChange, error, required }: { id: string; label: string; hint?: string; value: string; onChange: (value: string) => void; error?: string; required?: boolean }) { return <Field label={label} htmlFor={id} hint={hint} hintPlacement="below" error={error} required={required}><Textarea id={id} value={value} onChange={(event) => onChange(event.target.value)} invalid={!!error} aria-describedby={getFieldDescribedBy(id, hint, error)} /></Field>; }

