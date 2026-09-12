"use client";

import { CopyAction } from "@/components/CopyAction";

export function ErrorReference({ errorId }: { errorId: string }) {
  return <div className="mt-2 min-w-0 max-w-full space-y-2 text-sm text-(--text-muted)">
    <p className="text-xs">錯誤追蹤碼</p>
    <div className="flex min-w-0 flex-wrap items-start gap-1">
      <code className="min-w-0 self-center select-all font-mono text-xs leading-5 wrap-anywhere">{errorId}</code>
      <CopyAction label="複製追蹤碼" text={errorId} />
    </div>
    <p className="text-xs leading-5">若問題持續發生，可將此追蹤碼提供給社團幹部。</p>
  </div>;
}
