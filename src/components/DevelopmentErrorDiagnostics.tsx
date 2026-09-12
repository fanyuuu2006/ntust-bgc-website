"use client";

import { CopyAction } from "@/components/CopyAction";
import { getDevelopmentDiagnostics } from "@/libs/observability/development-diagnostics";

export function DevelopmentErrorDiagnostics({ error }: { error: Error }) {
  if (process.env.NODE_ENV === "production") return null;
  const info = getDevelopmentDiagnostics(error);
  if (!info) return null;
  return (
    <section className="mt-4 min-w-0 max-w-full space-y-3 wrap-anywhere">
      <h2 className="text-xs font-semibold text-(--text-muted)">開發模式</h2>
      <div className="space-y-2">
        <p className="font-mono text-xs text-(--text-muted)">{info.name}</p>
        <div className="flex min-w-0 items-start gap-2">
        <h3 className="min-w-0 flex-1 whitespace-pre-wrap text-lg font-semibold leading-snug text-(--text-primary) sm:text-xl">{info.message}</h3>
        <CopyAction label="複製錯誤訊息" text={info.message} />
        </div>
      </div>
      {(info.stack || info.cause || info.code || info.context) && <details className="min-w-0 max-w-full text-sm">
        <summary className="cursor-pointer rounded-sm text-(--text-muted) focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-(--action)">查看技術細節</summary>
      {(info.code || info.context) && <dl className="mt-3 space-y-1 text-xs">
        {info.code && <div className="flex flex-wrap gap-x-3"><dt className="text-xs text-(--text-muted)">Code</dt><dd className="min-w-0 font-mono wrap-anywhere">{info.code}</dd></div>}
        {info.context && <div className="flex flex-wrap gap-x-3"><dt className="text-xs text-(--text-muted)">Context</dt><dd className="min-w-0 wrap-anywhere">{info.context}</dd></div>}
      </dl>}
        <div className="mt-3 min-w-0 space-y-3">
          {[["Stack trace", info.stack], ["Cause", info.cause]].map(([label, content]) => content && <section key={label} className="min-w-0">
            <div className="mb-1 flex min-w-0 items-center justify-between gap-2">
              <h4 className="text-xs font-medium text-(--text-muted)">{label}</h4>
              <CopyAction label={"複製 " + label} text={content} />
            </div>
            {label === "Cause" && !content.includes("\n") ? <p aria-label={label} className="select-text whitespace-pre-wrap font-mono text-xs leading-5 wrap-anywhere">{content}</p> : <pre tabIndex={0} aria-label={label} className="max-h-72 min-w-0 max-w-full overflow-auto rounded-md border border-(--border-muted) bg-(--text-primary) text-(--text-inverse) p-3 select-text whitespace-pre-wrap font-mono text-xs leading-5 wrap-anywhere focus-visible:outline-2 focus-visible:outline-(--action)">{content}</pre>}
          </section>)}
        </div>
      </details>}
    </section>
  );
}
