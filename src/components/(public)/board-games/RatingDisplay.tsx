import { Star } from "lucide-react";

export function RatingDisplay({ rating, label }: { rating: number; label?: string }) {
  const accessibleLabel = label ?? `${rating} / 5`;

  return (
    <span className="inline-flex min-w-0 items-center gap-1.5" aria-label={accessibleLabel}>
      <Star aria-hidden="true" className="size-4 shrink-0 fill-(--game-yellow) text-(--game-yellow)" />
      <span className="font-medium text-(--text-primary)">{rating} / 5</span>
    </span>
  );
}
