"use client";

import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/Button";

type EmailVerificationConfirmFormProps = {
  token: string;
};

export function EmailVerificationConfirmForm({
  token,
}: EmailVerificationConfirmFormProps) {
  const [isPending, setIsPending] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    if (isPending) {
      event.preventDefault();
      return;
    }

    setIsPending(true);
  }

  return (
    <form
      action="/api/auth/email-verification/confirm"
      method="post"
      onSubmit={handleSubmit}
    >
      <input type="hidden" name="token" value={token} />
      <Button
        type="submit"
        variant="primary"
        isLoading={isPending}
        disabled={isPending}
        className="w-full sm:w-auto"
      >
        確認 Email
      </Button>
    </form>
  );
}
