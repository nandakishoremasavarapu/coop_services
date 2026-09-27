import React from "react";
import Link from "next/link";
import { ShramSetuLogo } from "@/components/ShramSetuLogo";
import { cn } from "@/lib/cn";

export interface BrandProps {
  href?: string;
  sub?: string;
  size?: number;
  dark?: boolean;
  className?: string;
  compact?: boolean;
  priority?: boolean;
}

/** Shram Setu wordmark — official logo + name + portal context. */
export function Brand({
  href = "/",
  sub,
  size = 36,
  dark = false,
  className,
  compact = false,
  priority = false,
}: BrandProps) {
  const inner = (
    <span className={cn("inline-flex items-center gap-2.5 min-w-0", className)}>
      <ShramSetuLogo size={size} priority={priority} />
      {!compact && (
        <span className="flex flex-col min-w-0 leading-tight">
          <span className={cn("font-extrabold tracking-tight text-[17px]", dark ? "text-white" : "text-ink-900")}>
            Shram&nbsp;Setu
          </span>
          {sub && (
            <span className={cn("text-2xs font-semibold truncate", dark ? "text-brand-200" : "text-ink-400")}>
              {sub}
            </span>
          )}
        </span>
      )}
    </span>
  );

  if (!href) return inner;
  return (
    <Link href={href} aria-label="Shram Setu home" className="shrink-0 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20">
      {inner}
    </Link>
  );
}
