"use client";

import React from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

export interface MobileNavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
}

interface MobileNavBarProps {
  pathname: string;
  items: MobileNavItem[];
  /** Optional prominent centered action (e.g. Book Service). */
  centerAction?: { href: string; label: string; icon: LucideIcon };
}

/** Shared mobile bottom navigation with optional raised center action. */
export function MobileNavBar({ pathname, items, centerAction }: MobileNavBarProps) {
  // Split items around the center slot.
  const half = Math.ceil(items.length / 2);
  const halves: MobileNavItem[][] = centerAction ? [items.slice(0, half), items.slice(half)] : [items];

  return (
    <nav
      aria-label="Primary"
      className="fixed bottom-0 inset-x-0 z-50 bg-panel/95 backdrop-blur-md border-t border-line shadow-[0_-1px_8px_rgb(11_16_15/0.06)] pb-safe"
    >
      <div className="mx-auto flex h-16 items-stretch justify-around max-w-lg px-1">
        {halves.map((group, gi) => (
          <React.Fragment key={gi}>
            {gi === 1 && (
              <div className="w-16 shrink-0" aria-hidden /> /* spacer under FAB */
            )}
            {group.map(({ href, label, icon: Icon, exact }) => {
              const active = exact ? pathname === href : pathname === href || pathname.startsWith(href + "/");
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex flex-1 flex-col items-center justify-center gap-0.5 min-w-0 rounded-xl transition-colors",
                    active ? "text-brand-700" : "text-ink-400 hover:text-ink-700"
                  )}
                >
                  <span
                    className={cn(
                      "flex items-center justify-center rounded-xl px-3 py-0.5 transition-colors",
                      active && "bg-brand-50"
                    )}
                  >
                    <Icon className="size-5.5" strokeWidth={active ? 2.4 : 2} aria-hidden />
                  </span>
                  <span className={cn("text-2xs font-semibold leading-none pb-0.5", active && "font-bold")}>{label}</span>
                </Link>
              );
            })}
          </React.Fragment>
        ))}
      </div>

      {centerAction && (
        <Link
          href={centerAction.href}
          aria-label={centerAction.label}
          className="absolute left-1/2 -translate-x-1/2 -top-6 flex flex-col items-center group"
        >
          <span className="size-13 rounded-full bg-brand-700 text-white shadow-raised ring-4 ring-canvas flex items-center justify-center transition-transform group-active:scale-95">
            <centerAction.icon className="size-6" strokeWidth={2.2} aria-hidden />
          </span>
        </Link>
      )}
    </nav>
  );
}
