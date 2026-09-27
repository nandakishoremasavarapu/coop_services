"use client";

import React from "react";
import { cn } from "@/lib/cn";

interface TabsProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: React.ReactNode; count?: number }[];
  "aria-label"?: string;
  className?: string;
}

/** Segmented control used for list filters. */
export function SegmentedTabs<T extends string>({ value, onChange, options, className, ...rest }: TabsProps<T>) {
  return (
    <div
      role="tablist"
      className={cn("inline-flex items-center gap-1 rounded-xl bg-ink-100 p-1 w-full sm:w-auto", className)}
      {...rest}
    >
      {options.map((opt) => {
        const selected = opt.value === value;
        return (
          <button
            key={opt.value}
            role="tab"
            aria-selected={selected}
            type="button"
            onClick={() => onChange(opt.value)}
            className={cn(
              "flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 rounded-lg px-3.5 h-9 text-sm font-semibold transition-all",
              selected ? "bg-white text-ink-900 shadow-xs" : "text-ink-500 hover:text-ink-800"
            )}
          >
            {opt.label}
            {opt.count != null && (
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-2xs font-bold tabular-nums",
                  selected ? "bg-brand-100 text-brand-800" : "bg-white text-ink-500"
                )}
              >
                {opt.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/** Underline-style tabs for in-page sections. */
export function UnderlineTabs<T extends string>({ value, onChange, options, className, ...rest }: TabsProps<T>) {
  return (
    <div role="tablist" className={cn("flex items-center gap-1 border-b border-line overflow-x-auto no-scrollbar", className)} {...rest}>
      {options.map((opt) => {
        const selected = opt.value === value;
        return (
          <button
            key={opt.value}
            role="tab"
            aria-selected={selected}
            type="button"
            onClick={() => onChange(opt.value)}
            className={cn(
              "relative px-3.5 py-2.5 text-sm font-semibold whitespace-nowrap transition-colors",
              selected ? "text-brand-800" : "text-ink-500 hover:text-ink-800"
            )}
          >
            <span className="inline-flex items-center gap-1.5">
              {opt.label}
              {opt.count != null && (
                <span className={cn("rounded-full px-1.5 py-0.5 text-2xs font-bold tabular-nums", selected ? "bg-brand-100 text-brand-800" : "bg-ink-100 text-ink-500")}>
                  {opt.count}
                </span>
              )}
            </span>
            <span
              aria-hidden
              className={cn(
                "absolute inset-x-2 bottom-0 h-0.5 rounded-full transition-colors",
                selected ? "bg-brand-600" : "bg-transparent"
              )}
            />
          </button>
        );
      })}
    </div>
  );
}
