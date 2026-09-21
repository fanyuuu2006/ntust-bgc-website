"use client";

import { useState } from "react";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export function ResetPasswordForm({ invalidPassword }: { invalidPassword: boolean }) {
  const [pending, setPending] = useState(false);
  return <form action="/api/auth/password-recovery/reset" method="post" onSubmit={() => setPending(true)} className="space-y-5">
    <Field label="新密碼" htmlFor="new-password" required hint="8～128 字元，含大小寫英文、數字與符號">
      <Input id="new-password" name="newPassword" type="password" autoComplete="new-password" required minLength={8} maxLength={128} disabled={pending} />
    </Field>
    <Field label="確認新密碼" htmlFor="confirm-password" required>
      <Input id="confirm-password" name="confirmPassword" type="password" autoComplete="new-password" required disabled={pending} />
    </Field>
    {invalidPassword ? <p role="alert" className="text-sm text-(--status-danger)">密碼格式不正確或兩次輸入不一致，請重新輸入。</p> : null}
    <Button type="submit" variant="primary" disabled={pending} isLoading={pending} className="w-full">重設密碼</Button>
  </form>;
}
