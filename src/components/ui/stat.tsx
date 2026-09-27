import React from "react";
import { cn } from "@/lib/cn";
import { Card } from "./card";

interface StatCardProps {
  icon?: React.ReactNode;
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  trend?: React.ReactNode;
  className?: string;
}

/** KPI metric card — one strong number, quiet supporting detail. */
export function StatCard({ icon, label, value, sub, trend, className }: StatCardProps) {
  return (
    <Card className={cn("p-4.5 sm:p-5", className)}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-[13px] font-semibold text-ink-500 leading-snug">{label}</p>
        {icon && (
          <span aria-hidden className="size-9 rounded-xl bg-brand-50 text-brand-700 inline-flex items-center justify-center [&>svg]:size-4.5 shrink-0">
            {icon}
          </span>
        )}
      </div>
      <div className="text-2xl sm:text-[1.75rem] font-extrabold text-ink-900 tracking-tight mt-1.5 tabular-nums">{value}</div>
      {(sub || trend) && (
        <div className="mt-1.5 flex items-center gap-2 text-xs text-ink-400 leading-snug">
          {trend}
          {sub}
        </div>
      )}
    </Card>
  );
}
