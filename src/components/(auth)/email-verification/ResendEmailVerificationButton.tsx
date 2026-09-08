"use client";

import { useState } from "react";

import { FormFeedback } from "@/components/FormFeedback";
import { Button } from "@/components/ui/Button";
import { apiClient } from "@/libs/api/client";
import { ApiError } from "@/libs/api/errors";

type ResendResponse = {
  data: { status: "sent" | "already_verified" };
};

export function ResendEmailVerificationButton() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleResend() {
    if (isLoading) return;
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await apiClient<ResendResponse>(
        "/api/auth/email-verification/resend",
        { method: "POST" },
      );
      setSuccess(
        response.data.status === "already_verified"
          ? "你的 Email 已完成驗證。"
          : "驗證信已重新寄出，請查看信箱。",
      );
    } catch (requestError) {
      setError(
        requestError instanceof ApiError
          ? requestError.message
          : "重新寄送驗證信失敗，請稍後再試",
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex w-full flex-col items-stretch gap-2 sm:w-auto sm:items-start">
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={isLoading}
        isLoading={isLoading}
        onClick={handleResend}
        className="w-full sm:w-auto"
      >
        重新寄送驗證信
      </Button>
      {(error || success) && <FormFeedback error={error} success={success} />}
    </div>
  );
}
