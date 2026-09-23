import { EmptyState } from "@/components/ui/EmptyState";
import type { PublicSupporter } from "@/services/support/support.types";

export function SupporterWall({ supporters }: { supporters: PublicSupporter[] }) {
  return (
    <section aria-labelledby="supporter-wall-title" className="min-w-0">
      <div className="max-w-2xl">
        <h2 id="supporter-wall-title" className="text-2xl font-bold text-(--text-primary) sm:text-3xl">
          感謝支持者
        </h2>
        <p className="mt-2 text-sm leading-6 text-(--text-muted) sm:text-base">
          謝謝每一位願意支持本站的人。
        </p>
      </div>

      {supporters.length === 0 ? (
        <EmptyState
          compact
          className="mt-5 max-w-2xl text-left"
          description="目前沒有公開的支持者名單，仍然謝謝每一份支持本站的心意。"
        />
      ) : (
        <ul className="mt-5 grid min-w-0 gap-2.5 sm:grid-cols-2 lg:grid-cols-3" aria-label="支持本站的朋友">
          {supporters.map((supporter, index) => (
            <li
              key={`${index}-${supporter.displayName}`}
              className="flex min-h-12 min-w-0 items-center rounded-xl border border-(--border-default) bg-(--surface-default) px-4 py-3 text-sm leading-5 font-medium text-(--text-primary) shadow-(--shadow-base) wrap-anywhere"
            >
              {supporter.displayName}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
