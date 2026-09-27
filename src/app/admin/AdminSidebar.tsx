"use client";

import { apiFetch } from "@/lib/api";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  ClipboardList,
  CreditCard,
  Star,
  Shield,
  BarChart3,
  Settings,
  LogOut,
  Building2,
  ChevronRight,
  Menu,
  X,
  Bell,
} from "lucide-react";

const navItems = [
  { href: "/admin", icon: LayoutDashboard, label: "Overview" },
  { href: "/admin/providers", icon: Users, label: "Providers / Members" },
  { href: "/admin/bookings", icon: ClipboardList, label: "Bookings / Jobs" },
  { href: "/admin/transactions", icon: CreditCard, label: "Transactions" },
  { href: "/admin/ratings", icon: Star, label: "Ratings & Complaints" },
  { href: "/admin/welfare", icon: Shield, label: "Welfare & Insurance" },
  { href: "/admin/analytics", icon: BarChart3, label: "Analytics" },
  { href: "/admin/settings", icon: Settings, label: "Settings" },
];

const mobileBottomNavItems = [
  { href: "/admin", icon: LayoutDashboard, label: "Overview" },
  { href: "/admin/providers", icon: Users, label: "Members" },
  { href: "/admin/bookings", icon: ClipboardList, label: "Bookings" },
  { href: "/admin/welfare", icon: Shield, label: "Welfare" },
  { href: "/admin/settings", icon: Settings, label: "Settings" },
];

interface AdminSidebarProps {
  role: string;
}

export default function AdminSidebar({ role }: AdminSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  // Close drawer on path change
  useEffect(() => {
    setMobileDrawerOpen(false);
  }, [pathname]);

  const handleLogout = async () => {
    await apiFetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  };

  const roleLabel =
    role === "federation_admin"
      ? "Federation Admin"
      : role === "society_admin"
      ? "Society Admin"
      : "Super Admin";

  return (
    <>
      {/* ========================================================================= */}
      {/* 1. MOBILE TOP APP BAR (Visible on < 768px screens) */}
      {/* ========================================================================= */}
      <header className="md:hidden sticky top-0 left-0 right-0 z-40 bg-slate-900 border-b border-slate-800 text-white h-16 px-4 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setMobileDrawerOpen(true)}
            className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 active:scale-95 transition-all"
            aria-label="Open Navigation Menu"
          >
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white text-base shadow-sm">
              C
            </div>
            <div>
              <div className="font-bold text-sm leading-tight">CoopServe</div>
              <div className="text-[10px] text-blue-400 font-semibold">{roleLabel}</div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold bg-blue-900/60 text-blue-300 px-2.5 py-1 rounded-full border border-blue-700/50">
            {role === "federation_admin" ? "KLF Official" : "Society #14"}
          </span>
          <button
            onClick={handleLogout}
            className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-red-400 active:scale-95 transition-all"
            title="Sign Out"
          >
            <LogOut size={16} />
          </button>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* 2. MOBILE SLIDE-OVER DRAWER (Visible when menu button tapped) */}
      {/* ========================================================================= */}
      {mobileDrawerOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            onClick={() => setMobileDrawerOpen(false)}
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm transition-opacity animate-fade-in"
          />

          {/* Drawer content */}
          <div className="relative w-72 max-w-[85vw] bg-slate-900 text-white h-full flex flex-col z-10 shadow-2xl animate-slide-right">
            {/* Drawer Header */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white text-sm">
                  C
                </div>
                <div>
                  <div className="font-bold text-sm">CoopServe Governance</div>
                  <div className="text-[11px] text-slate-400">{roleLabel}</div>
                </div>
              </div>
              <button
                onClick={() => setMobileDrawerOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X size={18} />
              </button>
            </div>

            {/* Jurisdiction Badge */}
            <div className="p-3 mx-3 my-2 bg-blue-950/60 border border-blue-800/40 rounded-xl flex items-center gap-2">
              <Building2 size={16} className="text-blue-400 flex-shrink-0" />
              <div className="text-xs text-blue-200 truncate">
                {role === "federation_admin" ? "Kerala Labour Federation" : "Registered Society Admin"}
              </div>
            </div>

            {/* Nav list */}
            <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
              {navItems.map(({ href, icon: Icon, label }) => {
                const isActive = href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setMobileDrawerOpen(false)}
                    className={`flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-blue-600 text-white font-bold shadow-sm"
                        : "text-slate-300 hover:text-white hover:bg-slate-800"
                    }`}
                  >
                    <Icon size={18} strokeWidth={isActive ? 2.5 : 2} />
                    <span className="flex-1">{label}</span>
                    {isActive && <ChevronRight size={14} className="text-blue-200" />}
                  </Link>
                );
              })}
            </nav>

            {/* Drawer Logout */}
            <div className="p-3 border-t border-slate-800">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-slate-400 hover:text-red-400 hover:bg-slate-800 text-sm font-medium transition-colors"
              >
                <LogOut size={18} />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. MOBILE BOTTOM NAVIGATION BAR (Visible on < 768px screens) */}
      {/* ========================================================================= */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-xl border-t border-slate-800 shadow-[0_-2px_12px_rgba(0,0,0,0.3)] pb-safe">
        <div className="flex items-center justify-around h-16 px-1 max-w-lg mx-auto">
          {mobileBottomNavItems.map(({ href, icon: Icon, label }) => {
            const isActive = href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex flex-col items-center justify-center flex-1 h-12 transition-all active:scale-95 ${
                  isActive ? "text-blue-400 font-bold" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <div className={`p-1 rounded-xl transition-colors ${isActive ? "bg-blue-500/20" : ""}`}>
                  <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                </div>
                <span className="text-[10px] mt-0.5 tracking-tight font-medium">{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* ========================================================================= */}
      {/* 4. PERMANENT DESKTOP SIDEBAR (Visible on >= 768px screens) */}
      {/* ========================================================================= */}
      <aside className="hidden md:flex flex-col w-64 min-h-screen sticky top-0 bg-slate-900 border-r border-slate-800 text-white shrink-0 z-30">
        {/* Logo */}
        <div className="p-5 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center font-bold text-white text-lg shadow-sm">
              C
            </div>
            <div>
              <div className="font-bold text-white text-base leading-none">CoopServe</div>
              <div className="text-slate-400 text-xs mt-1">{roleLabel}</div>
            </div>
          </div>
        </div>

        {/* Role / Jurisdiction Badge */}
        <div className="px-4 py-3 border-b border-slate-800">
          <div className="flex items-center gap-2 bg-blue-900/40 border border-blue-800/40 rounded-xl px-3 py-2">
            <Building2 size={15} className="text-blue-400 flex-shrink-0" />
            <span className="text-blue-200 text-xs font-semibold truncate">
              {role === "federation_admin" ? "Kerala Labour Federation" : "Society Administration"}
            </span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 px-3 space-y-0.5 overflow-y-auto">
          {navItems.map(({ href, icon: Icon, label }) => {
            const isActive = href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                  isActive
                    ? "bg-blue-600 text-white font-semibold shadow-sm"
                    : "text-slate-400 hover:text-white hover:bg-slate-800/80"
                }`}
              >
                <Icon size={18} strokeWidth={isActive ? 2.5 : 2} />
                <span className="text-sm font-medium flex-1">{label}</span>
                {isActive && <ChevronRight size={14} className="text-blue-200 ml-auto" />}
              </Link>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="p-3 border-t border-slate-800">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-all text-sm font-medium"
          >
            <LogOut size={18} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
}
