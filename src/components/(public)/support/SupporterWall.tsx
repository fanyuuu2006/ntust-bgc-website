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
        <p className="mt-4 text-sm leading-6 text-(--text-muted)">
          目前還沒有公開的支持者，仍然謝謝每一份心意。
        </p>
      ) : (
        <ul className="mt-4 flex min-w-0 flex-wrap gap-2" aria-label="支持本站的朋友">
          {supporters.map((supporter, index) => (
            <li
              key={`${index}-${supporter.displayName}`}
              className="max-w-full rounded-xl border border-(--border-default) bg-(--surface-default) px-3 py-1.5 text-sm leading-5 text-(--text-primary) wrap-anywhere"
              style={{ maxInlineSize: "13rem" }}
            >
              {supporter.displayName}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
