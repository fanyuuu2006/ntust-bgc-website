"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/Modal";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { FormFeedback } from "@/components/FormFeedback";
import { apiClient } from "@/libs/api/client";
import { updateUserAccountSchema } from "@/services/users/users.schema";
import type { User } from "@/types/database";

/** 僅管理帳號外觀欄位；Email、驗證與生命週期不屬於此表單的寫入範圍。 */
export function UserAccountEditButton({ user }: { user: Pick<User, "id" | "name" | "avatar" | "closed_at"> }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(user.name);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<{ name?: string }>({});
  if (user.closed_at) return null;

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const parsed = updateUserAccountSchema.safeParse({ name });
    if (!parsed.success) {
      setFields(Object.fromEntries(parsed.error.issues.map((issue) => [issue.path[0], issue.message])));
      return;
    }
    setFields({}); setError(null); setBusy(true);
    try {
      await apiClient(`/api/admin/users/${user.id}/account`, { method: "PATCH", body: parsed.data });
      setOpen(false); router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "更新帳號資料失敗");
    } finally { setBusy(false); }
  }

  return <>
    <Button type="button" variant="outline" onClick={() => { setName(user.name); setFields({}); setError(null); setOpen(true); }}>編輯帳號資料</Button>
    <Modal open={open} closeDisabled={busy} onClose={() => { if (!busy) setOpen(false); }} title="編輯帳號資料">
      <form onSubmit={submit} className="space-y-4" aria-busy={busy}>
        <Field label="顯示名稱" htmlFor="admin-account-name" required error={fields.name}>
          <Input id="admin-account-name" autoFocus value={name} onChange={(event) => setName(event.target.value)} required maxLength={50} disabled={busy} aria-invalid={!!fields.name} />
        </Field>
        <FormFeedback error={error} />
        <div className="flex flex-wrap justify-end gap-2">
          <Button type="button" variant="outline" disabled={busy} onClick={() => setOpen(false)}>取消</Button>
          <Button type="submit" isLoading={busy} disabled={busy}>儲存</Button>
        </div>
      </form>
    </Modal>
  </>;
}
