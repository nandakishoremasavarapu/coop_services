"use client";

import React from "react";
import { cn } from "@/lib/cn";

interface TooltipHintProps {
  label: string;
  side?: "top" | "right";
  children: React.ReactNode;
}

/** Lightweight CSS-only tooltip wrapper (desktop hover affordance). */
export function TooltipHint({ label, side = "top", children }: TooltipHintProps) {
  return (
    <span className="relative inline-flex group/tt">
      {children}
      <span
        role="tooltip"
        className={cn(
          "pointer-events-none absolute z-70 whitespace-nowrap rounded-lg bg-ink-900 px-2.5 py-1.5 text-xs font-semibold text-white opacity-0 shadow-raised transition-opacity duration-100 group-hover/tt:opacity-100",
          side === "top" && "bottom-full left-1/2 -translate-x-1/2 mb-2",
          side === "right" && "left-full top-1/2 -translate-y-1/2 ml-2"
        )}
      >
        {label}
      </span>
    </span>
  );
}
