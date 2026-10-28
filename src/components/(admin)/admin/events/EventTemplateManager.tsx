"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiClient } from "@/libs/api/client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/contexts/ToastContext";

export function EventTemplateManager({ templates }: { templates: { id: string; name: string }[] }) {
  const router = useRouter(); const { showToast } = useToast(); const [name, setName] = useState(""); const [busy, setBusy] = useState(false);
  async function create() { if (!name.trim()) return; setBusy(true); try { await apiClient("/api/admin/event-templates", { method: "POST", body: { name, description: "", description_format: "plain_text", rich_description: null, calendar_color: null } }); setName(""); showToast("success", "活動範本已建立"); router.refresh(); } catch (error) { showToast("error", error instanceof Error ? error.message : "建立範本失敗"); } finally { setBusy(false); } }
  async function remove(id: string) { setBusy(true); try { await apiClient(`/api/admin/event-templates/${id}`, { method: "DELETE" }); showToast("success", "活動範本已刪除"); router.refresh(); } catch (error) { showToast("error", error instanceof Error ? error.message : "刪除範本失敗"); } finally { setBusy(false); } }
  return <section className="space-y-3" aria-labelledby="event-template-title"><h2 id="event-template-title" className="text-lg font-semibold">活動範本</h2><div className="flex flex-col gap-2 sm:flex-row"><Input aria-label="範本名稱" value={name} onChange={(event) => setName(event.target.value)} placeholder="例如：週末桌遊聚會" disabled={busy} /><Button type="button" onClick={create} disabled={busy || !name.trim()}>新增範本</Button></div>{templates.length ? <ul className="divide-y rounded-xl border">{templates.map((template) => <li key={template.id} className="flex items-center justify-between gap-3 p-3"><span>{template.name}</span><Button type="button" variant="outline" size="sm" onClick={() => remove(template.id)} disabled={busy}>刪除</Button></li>)}</ul> : <p className="text-sm text-(--text-muted)">目前沒有活動範本。</p>}</section>;
}
