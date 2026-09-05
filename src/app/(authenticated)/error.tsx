"use client";

import { useEffect } from "react";
import { CircleAlert } from "lucide-react";

import { Button, ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

export default function AuthenticatedError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[AuthenticatedRouteError]", error);
  }, [error]);

  return (
    <section className="container max-w-3xl py-8">
      <Card className="p-5 sm:p-6">
        <div role="alert" className="flex min-w-0 items-start gap-3">
          <CircleAlert
            aria-hidden="true"
            className="mt-0.5 size-5 shrink-0 text-(--status-danger)"
          />
          <div className="min-w-0">
            <h1 className="break-words text-xl font-bold text-(--text-primary)">
              頁面暫時無法載入
            </h1>
            <p className="mt-2 break-words text-sm leading-6 text-(--text-muted)">
              系統目前無法取得這個頁面的資料。你可以重新載入，或先返回儀表板。
            </p>
          </div>
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          <Button type="button" variant="primary" onClick={() => reset()}>
            重新載入
          </Button>
          <ButtonLink href="/dashboard" variant="outline">
            返回儀表板
          </ButtonLink>
        </div>
      </Card>
    </section>
  );
}
