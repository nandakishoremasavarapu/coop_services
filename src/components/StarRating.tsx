"use client";

import { Star } from "lucide-react";
import { cn } from "@/lib/cn";

interface StarRatingProps {
  rating: number;
  max?: number;
  size?: number;
  showNumber?: boolean;
  onRate?: (rating: number) => void;
}

export function StarRating({ rating, max = 5, size = 16, showNumber = false, onRate }: StarRatingProps) {
  return (
    <div className="flex items-center gap-0.5" role={onRate ? "radiogroup" : "img"} aria-label={`Rated ${rating} of ${max}`}>
      {Array.from({ length: max }).map((_, i) => {
        const filled = i < Math.floor(rating);
        const star = (
          <Star
            size={size}
            aria-hidden
            className={filled ? "text-accent-400 fill-accent-400" : "text-ink-200 fill-ink-200"}
          />
        );
        return onRate ? (
          <button
            key={i}
            type="button"
            role="radio"
            aria-checked={rating === i + 1}
            aria-label={`Rate ${i + 1} star${i > 0 ? "s" : ""}`}
            onClick={() => onRate(i + 1)}
            className="cursor-pointer hover:scale-110 transition-transform p-0 bg-transparent border-none"
          >
            {star}
          </button>
        ) : (
          <span key={i}>{star}</span>
        );
      })}
      {showNumber && (
        <span className="text-sm font-semibold text-ink-700 ml-1.5 tabular-nums">
          {typeof rating === "number" ? rating.toFixed(1) : rating}
        </span>
      )}
    </div>
  );
}
