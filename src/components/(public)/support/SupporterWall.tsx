import { Heart, Sparkles } from "lucide-react";

import type { PublicSupporter } from "@/services/support/support.types";

export function SupporterWall({ supporters }: { supporters: PublicSupporter[] }) {
  return (
    <section aria-labelledby="supporter-wall-title" className="min-w-0">
      <div className="max-w-2xl">
        <p className="flex items-center gap-2 text-sm font-semibold text-(--interactive-primary)">
          <Sparkles aria-hidden="true" className="size-4" />
          Supporter Wall
        </p>
        <h2 id="supporter-wall-title" className="mt-1 text-2xl font-bold text-(--text-primary) sm:text-3xl">
          感謝支持者
        </h2>
        <p className="mt-2 text-sm leading-6 text-(--text-muted) sm:text-base">
          謝謝你們讓這個網站可以繼續慢慢變得更好 ✨
        </p>
      </div>

      {supporters.length === 0 ? (
        <div className="mt-5 flex min-w-0 items-center gap-3 rounded-2xl border border-dashed border-(--border-default) bg-(--surface-subtle) px-4 py-5 text-sm text-(--text-muted) sm:px-5">
          <span aria-hidden="true" className="flex size-9 shrink-0 items-center justify-center rounded-full bg-(--surface-default) text-base leading-none">
            🧋
          </span>
          <p>第一杯飲料還在等人請 🧋</p>
        </div>
      ) : (
        <div className="mt-5 rounded-2xl bg-(--surface-subtle) p-4 sm:p-5 lg:p-6">
          <ul className="flex min-w-0 flex-wrap gap-2.5 sm:gap-3" aria-label="支持本站的朋友">
            {supporters.map((supporter, index) => (
              <li
                key={`${index}-${supporter.displayName}`}
                className="inline-flex min-h-10 max-w-full items-center gap-2 rounded-xl border border-(--border-muted) bg-(--surface-default) px-3 py-2 text-sm leading-5 text-(--text-primary) shadow-(--shadow-base)"
                style={{ maxInlineSize: "13rem" }}
              >
                <span aria-hidden="true" className="flex size-6 shrink-0 items-center justify-center rounded-full bg-(--interactive-muted) text-(--interactive-primary)">
                  <Heart className="size-3.5 fill-current" />
                </span>
                <span className="min-w-0 wrap-anywhere">{supporter.displayName}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
