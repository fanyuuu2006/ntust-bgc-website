"use client";

import { useState } from "react";
import { Modal } from "@/components/Modal";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { FormFeedback } from "@/components/FormFeedback";
import { apiClient } from "@/libs/api/client";

/** 註銷僅以 Server 成功回應為準；成功後整頁離開，避免重新讀取已撤銷的身份。 */
export function AccountClosureSection() {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [complete, setComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function close() {
    if (busy) return;
    setOpen(false);
    setPassword("");
    setConfirmation("");
    setError(null);
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await apiClient("/api/users/me/closure", { method: "POST", body: { currentPassword: password, confirmation } });
      setPassword("");
      setComplete(true);
      window.setTimeout(() => window.location.replace("/"), 1200);
    } catch (reason) {
      setPassword("");
      setError(reason instanceof Error ? reason.message : "註銷暫時無法完成，請稍後再試");
      setBusy(false);
    }
  }

  return <section aria-labelledby="account-closure-title" className="border-t border-(--border-default) pt-5">
    <h3 id="account-closure-title" className="font-semibold text-(--text-primary)">註銷帳號</h3>
    <p className="mt-2 text-sm leading-6 text-(--text-muted)">永久停用此帳號，並清除可移除的個人資料。若仍有待處理或尚未歸還的桌遊，將無法註銷。</p>
    <Button type="button" variant="danger" className="mt-3" onClick={() => setOpen(true)}>註銷帳號</Button>
    <Modal open={open} onClose={close} closeDisabled={busy} title="註銷帳號">
      {complete ? <FormFeedback success="帳號已註銷，即將返回首頁。" /> : <form onSubmit={submit} className="space-y-4" aria-busy={busy}>
        <p className="text-sm leading-6">此操作無法復原。完成後你將無法再登入，所有登入工作階段也會失效。</p>
        <p className="text-sm leading-6 text-(--text-muted)">必要的社員、幹部與借用歷史會以「已註銷使用者」保留。</p>
        <Field label="目前密碼" htmlFor="closure-password" required>
          <Input id="closure-password" autoFocus type="password" autoComplete="current-password" required maxLength={128} disabled={busy} value={password} onChange={(event) => setPassword(event.target.value)} />
        </Field>
        <Field label="請輸入「註銷帳號」確認" htmlFor="closure-confirmation" required>
          <Input id="closure-confirmation" autoComplete="off" required disabled={busy} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} />
        </Field>
        <FormFeedback error={error} />
        <div className="flex flex-wrap justify-end gap-2">
          <Button type="button" variant="outline" disabled={busy} onClick={close}>取消</Button>
          <Button type="submit" variant="danger" isLoading={busy} disabled={busy || !password || confirmation !== "註銷帳號"}>確認註銷</Button>
        </div>
      </form>}
    </Modal>
  </section>;
}
