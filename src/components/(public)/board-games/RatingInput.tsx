"use client";

import { useState } from "react";
import { Star } from "lucide-react";

import type { ReviewRating } from "@/services/reviews/reviews.types";
import { cn } from "@/utils/className";

const RATINGS: ReviewRating[] = [1, 2, 3, 4, 5];

export function RatingInput({
  value,
  onChange,
  disabled = false,
  invalid = false,
}: {
  value: ReviewRating | null;
  onChange: (rating: ReviewRating) => void;
  disabled?: boolean;
  invalid?: boolean;
}) {
  const [preview, setPreview] = useState<ReviewRating | null>(null);
  const displayedRating = preview ?? value ?? 0;

  return (
    <fieldset aria-invalid={invalid}>
      <legend className="text-sm font-medium text-(--text-primary)">你的評分（必填）</legend>
      <div className="mt-2 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
        <div className="flex" onMouseLeave={() => setPreview(null)}>
          {RATINGS.map((rating) => (
            <label
              key={rating}
              className="relative inline-flex size-11 cursor-pointer items-center justify-center rounded-full has-focus-visible:outline-2 has-focus-visible:outline-offset-1 has-focus-visible:outline-(--interactive-primary)"
              onMouseEnter={() => setPreview(rating)}
            >
              <input
                className="sr-only"
                type="radio"
                name="rating"
                value={rating}
                checked={value === rating}
                onChange={() => onChange(rating)}
                onFocus={() => setPreview(rating)}
                onBlur={() => setPreview(null)}
                disabled={disabled}
                aria-label={`${rating} 分`}
              />
              <Star
                aria-hidden="true"
                className={cn(
                  "size-8 transition-transform duration-150",
                  rating <= displayedRating
                    ? "fill-(--game-yellow) text-(--game-yellow)"
                    : "text-(--border-strong)",
                  !disabled && "hover:scale-105",
                )}
                strokeWidth={1.75}
              />
            </label>
          ))}
        </div>
        <p className="min-w-24 text-sm font-medium text-(--text-secondary)" aria-live="polite">
          {value === null ? "尚未選擇" : `你的評分：${value} 分`}
        </p>
      </div>
    </fieldset>
  );
}
