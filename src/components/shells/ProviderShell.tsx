"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Inbox,
  Briefcase,
  MessageSquare,
  Wallet,
  UserRound,
  LogOut,
  ChevronLeft,
  ChevronRight,
  BellRing,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/cn";
import { Brand } from "./brand";
import { MobileNavBar } from "./mobile-nav";
import { Switch } from "@/components/ui/form";
import { TooltipHint } from "@/components/ui/tooltip";
import { Avatar } from "@/components/ui/avatar";

const NAV_ITEMS = [
  { href: "/provider", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/provider/requests", label: "Requests", icon: Inbox },
  { href: "/provider/jobs", label: "My Jobs", icon: Briefcase },
  { href: "/provider/messages", label: "Messages", icon: MessageSquare },
  { href: "/provider/earnings", label: "Earnings", icon: Wallet },
  { href: "/provider/profile", label: "Profile", icon: UserRound },
];

const MOBILE_NAV = [
  { href: "/provider", label: "Home", icon: LayoutDashboard, exact: true },
  { href: "/provider/requests", label: "Requests", icon: Inbox },
  { href: "/provider/jobs", label: "Jobs", icon: Briefcase },
  { href: "/provider/messages", label: "Messages", icon: MessageSquare },
  { href: "/provider/profile", label: "Profile", icon: UserRound },
];

interface ProviderIdentity {
  name: string;
  phone?: string;
  profileId?: string;
  availability: "available" | "unavailable" | "busy";
  verificationStatus?: string;
}

/**
 * Provider portal shell:
 * - Desktop: persistent collapsible left sidebar (icons-only ↔ expanded).
 * - Mobile: top bar with availability switch + bottom navigation.
 */
export function ProviderShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [identity, setIdentity] = useState<ProviderIdentity | null>(null);
  const [updatingAvail, setUpdatingAvail] = useState(false);

  // Hydrate the persisted sidebar preference after mount (intentional).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCollapsed(localStorage.getItem("ss.provider.sidebar") === "collapsed");
  }, []);

  useEffect(() => {
    apiFetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        const p = d?.user?.profile;
        if (p) {
          setIdentity({
            name: p.displayName ?? d.user.profileName ?? "Specialist",
            phone: d.user.phone,
            profileId: p.id,
            availability: p.availability ?? "available",
            verificationStatus: p.verificationStatus,
          });
        }
      })
      .catch(() => {});
  }, []);

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("ss.provider.sidebar", next ? "collapsed" : "expanded");
      return next;
    });
  };

  const setAvailability = async (online: boolean) => {
    if (!identity || updatingAvail) return;
    const next = online ? "available" : "unavailable";
    const prev = identity.availability;
    setIdentity({ ...identity, availability: next });
    setUpdatingAvail(true);
    try {
      if (identity.profileId) {
        const res = await apiFetch(`/api/providers/${identity.profileId}`, {
          method: "PATCH",
          body: JSON.stringify({ availability: next }),
        });
        if (!res.ok) setIdentity({ ...identity, availability: prev });
      }
    } catch {
      setIdentity({ ...identity, availability: prev });
    } finally {
      setUpdatingAvail(false);
    }
  };

  const online = identity?.availability === "available";

  const handleLogout = async () => {
    try {
      await apiFetch("/api/auth/logout", { method: "POST" });
    } catch {}
    router.push("/");
    router.refresh();
  };

  return (
    <div className="min-h-dvh bg-canvas lg:flex">
      {/* ================================ Desktop sidebar ================================ */}
      <aside
        className={cn(
          "hidden lg:flex flex-col sticky top-0 h-dvh shrink-0 bg-brand-950 text-white z-40 transition-[width] duration-200",
          collapsed ? "w-[4.5rem]" : "w-64"
        )}
      >
        {/* Brand */}
        <div className={cn("h-16 flex items-center border-b border-white/10", collapsed ? "justify-center px-0" : "px-4")}>
          <Brand href="/provider" sub={collapsed ? undefined : "Partner Portal"} dark compact={collapsed} size={34} />
        </div>

        {/* Status block */}
        <div className={cn("border-b border-white/10", collapsed ? "p-3" : "p-4")}>
          <div
            className={cn(
              "rounded-2xl bg-white/8 border border-white/12 flex items-center gap-3",
              collapsed ? "flex-col p-2.5 gap-2.5" : "p-3"
            )}
          >
            <span
              aria-hidden
              className={cn(
                "size-2.5 rounded-full ring-4 shrink-0",
                online ? "bg-success-400 ring-success-400/15" : "bg-ink-400 ring-ink-400/10"
              )}
            />
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold leading-tight">{online ? "Online" : "Offline"}</p>
                <p className="text-2xs text-brand-200/80 mt-0.5 leading-tight">
                  {online ? "Receiving job broadcast" : "Hidden from new requests"}
                </p>
              </div>
            )}
            <Switch
              checked={online}
              onCheckedChange={setAvailability}
              label="Toggle availability"
              className={cn(online ? "bg-success-500" : "bg-white/25", updatingAvail && "opacity-60 pointer-events-none")}
            />
          </div>
        </div>

        {/* Navigation */}
        <nav aria-label="Provider" className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {NAV_ITEMS.map(({ href, label, icon: Icon, exact }) => {
            const active = exact ? pathname === href : pathname === href || pathname.startsWith(href + "/");
            const link = (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "group flex items-center gap-3 rounded-xl px-3 h-11 text-sm font-semibold transition-colors relative",
                  collapsed && "justify-center px-0",
                  active ? "bg-white text-brand-900 shadow-xs" : "text-brand-100/75 hover:text-white hover:bg-white/10"
                )}
              >
                <Icon className="size-5 shrink-0" strokeWidth={active ? 2.4 : 2} aria-hidden />
                {!collapsed && <span className="truncate">{label}</span>}
                {active && !collapsed && <span className="ml-auto size-1.5 rounded-full bg-brand-600" aria-hidden />}
              </Link>
            );
            return collapsed ? (
              <TooltipHint key={href} label={label} side="right">
                {link}
              </TooltipHint>
            ) : (
              <React.Fragment key={href}>{link}</React.Fragment>
            );
          })}
        </nav>

        {/* Identity + collapse + logout */}
        <div className="border-t border-white/10 p-3 space-y-1">
          {!collapsed && (
            <div className="flex items-center gap-3 px-2 py-1.5">
              <Avatar name={identity?.name ?? "Specialist"} size="sm" />
              <div className="min-w-0">
                <p className="text-sm font-bold truncate max-w-36">{identity?.name ?? "Specialist"}</p>
                <p className="text-2xs text-brand-200/80 truncate">Cooperative member</p>
              </div>
            </div>
          )}
          <button
            type="button"
            onClick={toggleCollapsed}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="w-full flex items-center justify-center gap-2 rounded-xl h-10 text-brand-100/75 hover:text-white hover:bg-white/10 text-sm font-semibold transition-colors"
          >
            {collapsed ? <ChevronRight className="size-4.5" /> : <><ChevronLeft className="size-4.5" /> Collapse</>}
          </button>
          <button
            type="button"
            onClick={handleLogout}
            className={cn(
              "w-full flex items-center gap-3 rounded-xl px-3 h-11 text-sm font-semibold text-brand-100/75 hover:text-white hover:bg-danger-600/90 transition-colors",
              collapsed && "justify-center px-0"
            )}
            aria-label="Sign out"
          >
            <LogOut className="size-5 shrink-0" aria-hidden />
            {!collapsed && "Sign out"}
          </button>
        </div>
      </aside>

      {/* ================================ Mobile top bar ================================ */}
      <header className="lg:hidden sticky top-0 z-50 bg-panel/95 backdrop-blur-md border-b border-line">
        <div className="h-16 px-4 flex items-center justify-between gap-3">
          <Brand href="/provider" sub="Partner Portal" size={32} />
          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-2 rounded-full bg-ink-100 pl-3 pr-2 py-1.5">
              <span className={cn("size-2 rounded-full", online ? "bg-success-500 animate-pulse" : "bg-ink-400")} aria-hidden />
              <span className="text-xs font-bold text-ink-700">{online ? "Online" : "Offline"}</span>
              <Switch
                checked={online}
                onCheckedChange={setAvailability}
                label="Toggle availability"
                className={cn("scale-90", online ? "bg-success-500" : "bg-ink-300", updatingAvail && "opacity-60 pointer-events-none")}
              />
            </div>
            <Link href="/provider/profile" aria-label="My profile">
              <Avatar name={identity?.name ?? "Specialist"} size="sm" />
            </Link>
          </div>
        </div>
      </header>

      {/* ================================ Content ================================ */}
      <main className="flex-1 min-w-0 flex flex-col pb-24 lg:pb-10">
        {pathname === "/provider" && identity?.verificationStatus === "pending" && (
          <div className="bg-warning-50 border-b border-warning-200 px-4 py-2.5 text-center">
            <p className="text-xs font-semibold text-warning-800">
              <BellRing className="inline size-3.5 -mt-0.5 mr-1" aria-hidden />
              Your member verification is under society review. You can still receive leads.
            </p>
          </div>
        )}
        {children}
      </main>

      {/* ================================ Mobile bottom nav ================================ */}
      <div className="lg:hidden">
        <MobileNavBar pathname={pathname} items={MOBILE_NAV.map(({ exact, ...rest }) => ({ ...rest, exact }))} />
      </div>
    </div>
  );
}
