"use client";

import { useState } from "react";
import Link from "next/link";
import { apiClient } from "@/libs/api/client";
import { FieldInput } from "@/components/FieldInput";
import { Button } from "@/components/ui/Button";
import { FormFeedback } from "@/components/FormFeedback";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      await apiClient("/api/auth/password-recovery/request", { method: "POST", body: { email } });
      setDone(true);
    } catch {
      setError("暫時無法處理請求，請稍後再試。");
    } finally { setPending(false); }
  }

  return <div className="space-y-5">
    {done ? <p role="status" className="text-sm">如果此 Email 對應可恢復的帳號，我們會寄出密碼重設信件。</p> :
      <form onSubmit={submit} className="space-y-5">
        <FieldInput
          field={{ id: "email", label: "Email", type: "email", autoComplete: "email", required: true, disabled: pending }}
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <FormFeedback error={error} />
        <Button type="submit" variant="primary" disabled={pending} isLoading={pending} className="w-full">寄送重設連結</Button>
      </form>}
    <Link href="/login" className="inline-block text-sm text-(--interactive-primary) hover:underline">返回登入</Link>
  </div>;
}
