"use client";

import { UnexpectedErrorState } from "@/components/UnexpectedErrorState";

export default function GlobalError({ error, reset, retry }: { error: Error & { digest?: string }; reset: () => void; retry?: () => void }) {
  return <html lang="zh-Hant"><body className="m-0 h-auto min-h-dvh bg-(--surface-page) text-(--text-primary)">
    <main className="flex min-h-dvh min-w-0 shrink-0 flex-col px-4 py-10 sm:px-6">
      <div className="my-auto w-full min-w-0">
        <UnexpectedErrorState error={error} reset={retry ?? reset} />
      </div>
    </main>
  </body></html>;
}
