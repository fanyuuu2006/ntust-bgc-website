"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { FormFeedback } from "@/components/FormFeedback";
import { Modal } from "@/components/Modal";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";
import { apiClient } from "@/libs/api/client";
import type { AcademicYear, User } from "@/types/database";

type Officer = { id: string; title: string; user: User; academic_year: AcademicYear | null };
type Values = { user_id: string; academic_year_id: string; title: string };

export function OfficerManager({ officers, users, years }: { officers: Officer[]; users: User[]; years: AcademicYear[] }) {
  const router = useRouter();
  const currentYearId = years.find((year) => year.is_current)?.id ?? "";
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Officer | "new" | null>(null);
  const [deleting, setDeleting] = useState<Officer | null>(null);
  const [values, setValues] = useState<Values>({ user_id: "", academic_year_id: currentYearId, title: "" });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const visible = useMemo(() => officers.filter((officer) => `${officer.user.name} ${officer.user.email} ${officer.title}`.toLowerCase().includes(search.toLowerCase())), [officers, search]);

  function open(officer: Officer | "new") {
    setEditing(officer);
    setError(null);
    setSuccess(null);
    setValues(officer === "new" ? { user_id: "", academic_year_id: currentYearId, title: "" } : { user_id: officer.user.id, academic_year_id: officer.academic_year?.id ?? "", title: officer.title });
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!editing || busy) return;
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      await apiClient(editing === "new" ? "/api/admin/officers" : `/api/admin/officers/${editing.id}`, { method: editing === "new" ? "POST" : "PATCH", body: values });
      setSuccess(`幹部職位已${editing === "new" ? "新增" : "更新"}。`);
      setEditing(null);
      router.refresh();
    } catch (error) {
      setError(error instanceof Error ? error.message : "操作失敗");
    } finally { setBusy(false); }
  }

  async function remove() {
    if (!deleting) return;
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      await apiClient(`/api/admin/officers/${deleting.id}`, { method: "DELETE" });
      setSuccess("幹部職位已移除。");
      setDeleting(null);
      router.refresh();
    } catch (error) {
      setError(error instanceof Error ? error.message : "移除失敗");
    } finally { setBusy(false); }
  }

  return <div className="space-y-4">
    <div className="flex flex-col gap-3 sm:flex-row"><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="搜尋使用者、Email 或職位" aria-label="搜尋幹部" className="min-w-0 flex-1" /><Button onClick={() => open("new")} className="w-full sm:w-auto">+ 新增幹部</Button></div>
    <FormFeedback error={error} success={success} />
    {visible.length === 0 ? <EmptyState title="沒有符合條件的幹部職位" description={officers.length === 0 ? "尚未建立幹部職位。" : "請調整搜尋條件後再試。"} /> : <>
      <div className="grid gap-3 md:hidden">{visible.map((officer) => <Card key={officer.id} className="rounded-xl p-4"><p className="font-semibold">{officer.user.name}</p><p className="mt-1 break-all text-sm text-(--text-muted)">{officer.user.email}</p><p className="mt-1 text-sm text-(--text-muted)">{officer.title} · {officer.academic_year?.year ?? "—"} 學年度</p><div className="mt-3 flex flex-wrap gap-2"><Button variant="outline" size="sm" onClick={() => open(officer)}>編輯</Button><Button variant="danger" size="sm" onClick={() => setDeleting(officer)}>移除</Button></div></Card>)}</div>
      <Card className="hidden overflow-x-auto rounded-xl p-0 md:block"><Table><TableHeader><TableRow><TableHead>使用者</TableHead><TableHead>職位</TableHead><TableHead>學年度</TableHead><TableHead>操作</TableHead></TableRow></TableHeader><TableBody>{visible.map((officer) => <TableRow key={officer.id}><TableCell><p className="font-medium">{officer.user.name}</p><p className="text-xs text-(--text-muted)">{officer.user.email}</p></TableCell><TableCell>{officer.title}</TableCell><TableCell>{officer.academic_year?.year ?? "—"}</TableCell><TableCell><div className="flex flex-wrap gap-2"><Button variant="outline" size="sm" onClick={() => open(officer)}>編輯</Button><Button variant="danger" size="sm" onClick={() => setDeleting(officer)}>移除</Button></div></TableCell></TableRow>)}</TableBody></Table></Card>
    </>}
    <Modal open={editing !== null} onClose={() => !busy && setEditing(null)} title={editing === "new" ? "新增幹部職位" : "編輯幹部職位"}><form onSubmit={save} className="space-y-4"><Field label="使用者" htmlFor="officer-user" required><Select id="officer-user" required value={values.user_id} onChange={(event) => setValues((current) => ({ ...current, user_id: event.target.value }))}><option value="">請選擇使用者</option>{users.map((user) => <option key={user.id} value={user.id}>{user.name}（{user.email}）</option>)}</Select></Field><Field label="學年度" htmlFor="officer-year" required><Select id="officer-year" required value={values.academic_year_id} onChange={(event) => setValues((current) => ({ ...current, academic_year_id: event.target.value }))}><option value="">請選擇學年度</option>{years.map((year) => <option key={year.id} value={year.id}>{year.year} 學年度</option>)}</Select></Field><Field label="職位名稱" htmlFor="officer-title" required><Input id="officer-title" autoFocus required value={values.title} onChange={(event) => setValues((current) => ({ ...current, title: event.target.value }))} /></Field><FormFeedback error={error} /><div className="flex flex-wrap justify-end gap-2"><Button type="button" variant="outline" disabled={busy} onClick={() => setEditing(null)}>取消</Button><Button type="submit" isLoading={busy}>儲存</Button></div></form></Modal>
    <ConfirmDialog open={deleting !== null} onClose={() => !busy && setDeleting(null)} onConfirm={remove} isSubmitting={busy} title="移除幹部職位？" description={deleting ? `確定移除 ${deleting.user.name} 的「${deleting.title}」職位嗎？此操作會移除這筆歷史職位紀錄。` : ""} confirmLabel="移除" />
  </div>;
}
