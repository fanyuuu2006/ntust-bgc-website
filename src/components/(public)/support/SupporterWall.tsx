import { Card } from "@/components/ui/Card";
import type { PublicSupporter } from "@/services/support/support.types";

export function SupporterWall({ supporters }: { supporters: PublicSupporter[] }) {
  return (
    <section aria-labelledby="supporter-wall-title">
      <h2 id="supporter-wall-title" className="text-lg font-semibold text-(--text-primary) sm:text-xl">
        感謝支持者
      </h2>
      {supporters.length === 0 ? (
        <p className="mt-3 text-sm leading-6 text-(--text-muted)">謝謝每一位願意支持本站的人。</p>
      ) : (
        <Card surface="subtle" className="mt-3 p-3 sm:p-4">
          <ul className="flex min-w-0 flex-wrap gap-2" aria-label="同意公開暱稱的支持者">
            {supporters.map((supporter, index) => (
              <li
                key={`${index}-${supporter.displayName}`}
                className="max-w-full rounded-full border border-(--border-default) bg-(--surface-default) px-3 py-1.5 text-sm leading-5 text-(--text-primary) wrap-anywhere"
              >
                {supporter.displayName}
              </li>
            ))}
          </ul>
        </Card>
      )}
    </section>
  );
}
