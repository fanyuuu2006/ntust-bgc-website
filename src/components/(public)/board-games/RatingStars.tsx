import { Star } from "lucide-react";

import { cn } from "@/utils/className";

const MAX_RATING = 5;

export function formatAverageRating(rating: number) {
  return rating.toFixed(1);
}

export function RatingStars({
  rating,
  label,
  size = "md",
  className,
}: {
  rating: number;
  label: string;
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
}) {
  const normalizedRating = Math.min(MAX_RATING, Math.max(0, rating));
  const starSize = size === "lg" ? "size-6" : size === "sm" ? "size-4" : size === "xs" ? "size-3" : "size-5";
  const starGap = size === "xs" ? "gap-0" : "gap-0.5";

  return (
    <span role="img" aria-label={label} className={cn("inline-flex shrink-0", className)}>
      <span aria-hidden="true" className={cn("inline-flex text-(--game-yellow)", starGap)}>
        {Array.from({ length: MAX_RATING }, (_, index) => {
          const fillPercentage = Math.round(Math.min(1, Math.max(0, normalizedRating - index)) * 1_000) / 10;

          return (
            <span key={index} className={cn("relative inline-flex shrink-0", starSize)}>
              <Star className={cn("absolute inset-0 text-(--border-strong)", starSize)} strokeWidth={1.75} />
              <span className="absolute inset-y-0 left-0 overflow-hidden" style={{ width: `${fillPercentage}%` }}>
                <Star className={cn("max-w-none fill-current", starSize)} strokeWidth={1.75} />
              </span>
            </span>
          );
        })}
      </span>
    </span>
  );
}
