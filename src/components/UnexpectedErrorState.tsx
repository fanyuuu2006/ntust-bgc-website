"use client";

import { useEffect, useState } from "react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { DevelopmentErrorDiagnostics } from "@/components/DevelopmentErrorDiagnostics";
import { ErrorReference } from "@/components/ErrorReference";
import { reportUnexpectedError } from "@/libs/observability/report";
import { isErrorId } from "@/libs/observability/reference";

export function UnexpectedErrorState({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [reference, setReference] = useState<{
    error: Error;
    id: string;
  } | null>(() => {
    const id = error.digest?.startsWith("app-error:")
      ? error.digest.slice(10)
      : undefined;
    return isErrorId(id) ? { error, id } : null;
  });
  useEffect(() => {
    // Only our explicitly mapped UUID digest is a support ID; opaque Next digests are not.
    const transported = error.digest?.startsWith("app-error:")
      ? error.digest.slice(10)
      : undefined;
    const id = isErrorId(transported)
      ? transported
      : reportUnexpectedError(error, { context: "render" });
    // Error props may change on retry; synchronize the support reference after hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReference({ error, id });
  }, [error]);
  return (
    <Card className="mx-auto w-full max-w-xl p-4 sm:p-6">
      <h1 role="alert" className="text-2xl font-semibold">
        網站暫時發生問題
      </h1>
      <p className="mt-2 text-sm leading-6 text-(--text-muted)">
        目前無法正常載入這個頁面，請稍後再試。
      </p>
      {process.env.NODE_ENV !== "production" && <DevelopmentErrorDiagnostics error={error} />}
      {reference?.error === error ? (
        <div className="mt-4">
          <ErrorReference key={reference.id} errorId={reference.id} />
        </div>
      ) : (
        <p role="status" className="mt-3 text-sm">
          正在準備錯誤資訊…
        </p>
      )}
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <Button type="button" onClick={reset}>
          再試一次
        </Button>
        <ButtonLink href="/" variant="outline">
          回首頁
        </ButtonLink>
      </div>
    </Card>
  );
}
