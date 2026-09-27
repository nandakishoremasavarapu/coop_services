"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  ClipboardList,
  CreditCard,
  Star,
  HeartHandshake,
  BarChart3,
  Settings,
  LogOut,
  Building2,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/cn";
import { Brand } from "./brand";
import { MobileNavBar } from "./mobile-nav";
import { TooltipHint } from "@/components/ui/tooltip";
import { roleLabel } from "@/lib/status";

const NAV_ITEMS = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/admin/providers", label: "Providers & Members", icon: Users },
  { href: "/admin/bookings", label: "Bookings", icon: ClipboardList },
  { href: "/admin/transactions", label: "Transactions", icon: CreditCard },
  { href: "/admin/ratings", label: "Ratings & Complaints", icon: Star },
  { href: "/admin/welfare", label: "Welfare & Insurance", icon: HeartHandshake },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

const MOBILE_NAV = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/admin/providers", label: "Members", icon: Users },
  { href: "/admin/bookings", label: "Bookings", icon: ClipboardList },
  { href: "/admin/welfare", label: "Welfare", icon: HeartHandshake },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

interface AdminShellProps {
  role: string;
  children: React.ReactNode;
}

/**
 * Administration shell:
 * - Desktop: persistent left sidebar with collapse-to-icons (persisted).
 * - Mobile: compact header + slide-over drawer + bottom nav for key areas.
 */
export function AdminShell({ role, children }: AdminShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Hydrate the persisted sidebar preference after mount (intentional).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCollapsed(localStorage.getItem("ss.admin.sidebar") === "collapsed");
  }, []);

  // Close the drawer on navigation (render-adjust pattern).
  const [prevPath, setPrevPath] = useState(pathname);
  if (prevPath !== pathname) {
    setPrevPath(pathname);
    if (drawerOpen) setDrawerOpen(false);
  }

  // Lock body scroll while drawer is open.
  useEffect(() => {
    if (!drawerOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [drawerOpen]);

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("ss.admin.sidebar", next ? "collapsed" : "expanded");
      return next;
    });
  };

  const handleLogout = async () => {
    try {
      await apiFetch("/api/auth/logout", { method: "POST" });
    } catch {}
    router.push("/");
    router.refresh();
  };

  const jurisdiction =
    role === "federation_admin" ? "District Labour Federation" : role === "society_admin" ? "Society Administration" : "Platform Governance";

  const renderNav = (mode: "expanded" | "collapsed" | "drawer") =>
    NAV_ITEMS.map(({ href, label, icon: Icon, exact }) => {
      const active = exact ? pathname === href : pathname === href || pathname.startsWith(href + "/");
      const link = (
        <Link
          key={href}
          href={href}
          aria-current={active ? "page" : undefined}
          onClick={() => setDrawerOpen(false)}
          className={cn(
            "flex items-center gap-3 rounded-xl px-3 h-11 text-sm font-semibold transition-colors",
            mode === "collapsed" && "justify-center px-0",
            active ? "bg-white text-brand-900 shadow-xs" : "text-brand-100/75 hover:text-white hover:bg-white/10"
          )}
        >
          <Icon className="size-5 shrink-0" strokeWidth={active ? 2.4 : 2} aria-hidden />
          {mode !== "collapsed" && <span className="truncate">{label}</span>}
        </Link>
      );
      return mode === "collapsed" ? (
        <TooltipHint key={href} label={label} side="right">
          {link}
        </TooltipHint>
      ) : (
        <React.Fragment key={href}>{link}</React.Fragment>
      );
    });

  return (
    <div className="min-h-dvh bg-canvas lg:flex">
      {/* ================================ Desktop sidebar ================================ */}
      <aside
        className={cn(
          "hidden lg:flex flex-col sticky top-0 h-dvh shrink-0 bg-brand-950 text-white z-40 transition-[width] duration-200",
          collapsed ? "w-[4.5rem]" : "w-64"
        )}
      >
        <div className={cn("h-16 flex items-center border-b border-white/10", collapsed ? "justify-center" : "px-4")}>
          <Brand href="/admin" sub={collapsed ? undefined : "Governance Console"} dark compact={collapsed} size={34} />
        </div>

        {/* Role + jurisdiction */}
        <div className={cn("border-b border-white/10", collapsed ? "p-3" : "p-4")}>
          <div
            className={cn(
              "rounded-2xl bg-white/8 border border-white/12 flex items-center gap-2.5",
              collapsed ? "justify-center p-2.5" : "p-3"
            )}
            title={jurisdiction}
          >
            <Building2 className="size-4.5 text-accent-300 shrink-0" aria-hidden />
            {!collapsed && (
              <div className="min-w-0">
                <p className="text-sm font-bold truncate leading-tight">{roleLabel(role)}</p>
                <p className="text-2xs text-brand-200/80 truncate mt-0.5">{jurisdiction}</p>
              </div>
            )}
          </div>
        </div>

        <nav aria-label="Administration" className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {renderNav(collapsed ? "collapsed" : "expanded")}
        </nav>

        <div className="border-t border-white/10 p-3 space-y-1">
          <button
            type="button"
            onClick={toggleCollapsed}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="w-full flex items-center justify-center gap-2 rounded-xl h-10 text-brand-100/75 hover:text-white hover:bg-white/10 text-sm font-semibold transition-colors"
          >
            {collapsed ? <ChevronRight className="size-4.5" aria-hidden /> : <><ChevronLeft className="size-4.5" aria-hidden /> Collapse</>}
          </button>
          <button
            type="button"
            onClick={handleLogout}
            aria-label="Sign out"
            className={cn(
              "w-full flex items-center gap-3 rounded-xl px-3 h-11 text-sm font-semibold text-brand-100/75 hover:text-white hover:bg-danger-600/90 transition-colors",
              collapsed && "justify-center px-0"
            )}
          >
            <LogOut className="size-5 shrink-0" aria-hidden />
            {!collapsed && "Sign out"}
          </button>
        </div>
      </aside>

      {/* ================================ Mobile top bar ================================ */}
      <header className="lg:hidden sticky top-0 z-50 bg-brand-950 text-white border-b border-white/10">
        <div className="h-16 px-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              aria-label="Open navigation menu"
              className="size-10 rounded-xl inline-flex items-center justify-center text-white/80 hover:text-white hover:bg-white/10 transition-colors shrink-0"
            >
              <Menu className="size-5" aria-hidden />
            </button>
            <Brand href="/admin" sub={roleLabel(role)} dark size={30} />
          </div>
          <span className="rounded-full bg-white/10 border border-white/15 px-3 py-1 text-2xs font-bold text-brand-100 whitespace-nowrap">
            {jurisdiction}
          </span>
        </div>
      </header>

      {/* ================================ Mobile drawer ================================ */}
      {drawerOpen && (
        <div className="lg:hidden fixed inset-0 z-100" role="dialog" aria-modal="true" aria-label="Administration menu">
          <button aria-label="Close menu" onClick={() => setDrawerOpen(false)} className="absolute inset-0 bg-ink-950/50 backdrop-blur-[2px] animate-fade-in cursor-default" />
          <div className="absolute inset-y-0 left-0 w-72 max-w-[85vw] bg-brand-950 text-white flex flex-col animate-drawer-in shadow-overlay">
            <div className="h-16 px-4 flex items-center justify-between border-b border-white/10 shrink-0">
              <Brand href="/admin" sub={roleLabel(role)} dark size={30} />
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                aria-label="Close menu"
                className="size-9 rounded-full inline-flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10"
              >
                <X className="size-5" aria-hidden />
              </button>
            </div>
            <div className="p-4 border-b border-white/10">
              <div className="rounded-2xl bg-white/8 border border-white/12 p-3 flex items-center gap-2.5">
                <Building2 className="size-4.5 text-accent-300 shrink-0" aria-hidden />
                <div className="min-w-0">
                  <p className="text-sm font-bold truncate leading-tight">{roleLabel(role)}</p>
                  <p className="text-2xs text-brand-200/80 truncate mt-0.5">{jurisdiction}</p>
                </div>
              </div>
            </div>
            <nav aria-label="Administration" className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
              {renderNav("drawer")}
            </nav>
            <div className="border-t border-white/10 p-3">
              <button
                type="button"
                onClick={handleLogout}
                className="w-full flex items-center gap-3 rounded-xl px-3 h-11 text-sm font-semibold text-brand-100/75 hover:text-white hover:bg-danger-600/90 transition-colors"
              >
                <LogOut className="size-5" aria-hidden />
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================ Content ================================ */}
      <main className="flex-1 min-w-0 flex flex-col pb-24 lg:pb-10">{children}</main>

      {/* ================================ Mobile bottom nav ================================ */}
      <div className="lg:hidden">
        <MobileNavBar pathname={pathname} items={MOBILE_NAV.map(({ exact, ...rest }) => ({ ...rest, exact }))} />
      </div>
    </div>
  );
}
