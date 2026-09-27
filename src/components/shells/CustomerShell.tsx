"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutGrid,
  ClipboardList,
  MessageSquare,
  UserRound,
  Bell,
  Plus,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/cn";
import { Brand } from "./brand";
import { AccountMenu } from "./account-menu";
import { MobileNavBar } from "./mobile-nav";
import { buttonClasses } from "@/components/ui/button";

const NAV_ITEMS = [
  { href: "/customer", label: "Home", icon: LayoutGrid, exact: true },
  { href: "/customer/orders", label: "Orders", icon: ClipboardList },
  { href: "/customer/messages", label: "Messages", icon: MessageSquare },
  { href: "/customer/profile", label: "Profile", icon: UserRound },
];

/**
 * Customer portal shell:
 * - Desktop: sticky top bar with pill navigation + prominent Book action.
 * - Mobile: compact top bar + bottom navigation with raised Book action.
 */
export function CustomerShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [name, setName] = useState("Account");

  useEffect(() => {
    apiFetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.user?.profileName) setName(d.user.profileName);
      })
      .catch(() => {});
  }, []);

  const fullBleed = pathname.startsWith("/customer/messages"); // chat owns its frame

  return (
    <div className="min-h-dvh flex flex-col bg-canvas">
      {/* ------------------------------------------------ Desktop + mobile top bar */}
      <header className="sticky top-0 z-50 bg-panel/95 backdrop-blur-md border-b border-line">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <Brand href="/customer" sub="Citizen Portal" size={34} />

          {/* Desktop navigation */}
          <nav aria-label="Primary" className="hidden md:flex items-center gap-1 rounded-full bg-ink-100/80 p-1">
            {NAV_ITEMS.map(({ href, label, icon: Icon, exact }) => {
              const active = exact ? pathname === href : pathname === href || pathname.startsWith(href + "/");
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-full px-4 h-9 text-sm font-semibold transition-colors",
                    active ? "bg-white text-brand-800 shadow-xs" : "text-ink-500 hover:text-ink-900"
                  )}
                >
                  <Icon className="size-4" aria-hidden />
                  {label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-1.5 sm:gap-3">
            <Link
              href="/customer/book"
              className={buttonClasses({ variant: "accent", size: "sm", className: "hidden md:inline-flex rounded-full px-4" })}
            >
              <Plus className="size-4" aria-hidden />
              Book Service
            </Link>
            <Link
              href="/customer/notifications"
              aria-label="Notifications"
              className={cn(
                "size-10 rounded-full inline-flex items-center justify-center transition-colors",
                pathname === "/customer/notifications"
                  ? "bg-brand-50 text-brand-700"
                  : "text-ink-500 hover:text-ink-900 hover:bg-ink-100"
              )}
            >
              <Bell className="size-5" aria-hidden />
            </Link>
            <AccountMenu
              name={name}
              roleLabel="Customer"
              profileHref="/customer/profile"
              notificationsHref="/customer/notifications"
            />
          </div>
        </div>
      </header>

      {/* ------------------------------------------------ Content */}
      <main className={cn("flex-1 flex flex-col min-h-0", fullBleed ? "" : "pb-24 md:pb-10")}>
        {children}
      </main>

      {/* ------------------------------------------------ Mobile bottom nav */}
      <div className="md:hidden">
        <MobileNavBar
          pathname={pathname}
          items={NAV_ITEMS.map(({ exact, ...rest }) => ({ ...rest, exact }))}
          centerAction={{ href: "/customer/book", label: "Book Service", icon: Plus }}
        />
      </div>
    </div>
  );
}
