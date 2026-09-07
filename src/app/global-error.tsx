"use client";
import { useEffect } from "react";
import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[GlobalError] Root-level render failed");
  }, [error]);

  return (
    <html lang="zh-Hant">
      <body className="m-0 min-h-dvh bg-(--surface-page) text-(--text-primary)">
        <main className="flex min-h-dvh items-center justify-center px-4 py-10 sm:px-6">
          <section
            aria-labelledby="global-error-title"
            className="w-full max-w-xl rounded-2xl border border-(--border-default) bg-(--surface-default) p-6 shadow-(--shadow-card) sm:p-8"
          >
            <h1
              id="global-error-title"
              className="text-2xl font-semibold tracking-tight text-(--text-primary)"
            >
              網站暫時發生問題
            </h1>
            <p className="mt-3 text-sm leading-6 text-(--text-muted) sm:text-base">
              目前無法正常載入這個頁面，請稍後再試。
            </p>

            <div className="mt-6 flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                className="btn primary inline-flex min-h-10 items-center justify-center rounded-lg px-4 py-2 text-sm font-medium"
                onClick={() => reset()}
              >
                再試一次
              </button>
              <Link
                href="/"
                className="btn outline inline-flex min-h-10 items-center justify-center rounded-lg px-4 py-2 text-sm font-medium"
              >
                回首頁
              </Link>
            </div>
          </section>
        </main>
      </body>
    </html>
  );
}
