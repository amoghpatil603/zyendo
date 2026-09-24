"use client";

import { Star } from "lucide-react";

export function StarRating({
  value,
  onChange,
  readonly = false,
}: {
  value: number;
  onChange?: (value: number) => void;
  readonly?: boolean;
}) {
  return (
    <div className="flex items-center gap-1" role="radiogroup" aria-label="Rating">
      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((star) => {
        const filled = value >= star;
        return (
          <button
            key={star}
            type="button"
            aria-checked={readonly ? undefined : value === star}
            disabled={readonly}
            onClick={() => onChange?.(star)}
            className={[
              "rounded-full p-0.5 transition",
              readonly ? "cursor-default" : "cursor-pointer hover:scale-110",
              filled ? "text-yellow-400" : "text-muted-foreground",
            ].join(" ")}
          >
            <Star
              className="size-5"
              fill={filled ? "currentColor" : "none"}
              strokeWidth={filled ? 0 : 2}
            />
          </button>
        );
      })}
    </div>
  );
}