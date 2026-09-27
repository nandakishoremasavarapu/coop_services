"use client";
import { Star } from "lucide-react";

interface StarRatingProps {
  rating: number;
  max?: number;
  size?: number;
  showNumber?: boolean;
  onRate?: (rating: number) => void;
}

export function StarRating({ rating, max = 5, size = 16, showNumber = false, onRate }: StarRatingProps) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: max }).map((_, i) => (
        <button
          key={i}
          type="button"
          onClick={() => onRate?.(i + 1)}
          className={`${onRate ? "cursor-pointer hover:scale-110" : "cursor-default"} transition-transform`}
          style={{ padding: 0, background: "none", border: "none" }}
        >
          <Star
            size={size}
            className={i < Math.floor(rating) ? "text-amber-400 fill-amber-400" : "text-slate-200 fill-slate-200"}
          />
        </button>
      ))}
      {showNumber && (
        <span className="text-sm font-semibold text-slate-700 ml-1">
          {typeof rating === "number" ? rating.toFixed(1) : rating}
        </span>
      )}
    </div>
  );
}
