"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import SahakariEmblem from "@/components/SahakariEmblem";

const navItems = [
  { href: "/customer", icon: "grid_view", label: "Home" },
  { href: "/customer/orders", icon: "receipt_long", label: "Orders" },
  { href: "/customer/messages", icon: "chat", label: "Messages" },
  { href: "/customer/profile", icon: "badge", label: "Profile" },
];

export default function CustomerNav() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/");
    } catch (err) {
      console.error("Logout error:", err);
      router.push("/");
    }
  };

  return (
    <>
      {/* =========================================================================
          1. DESKTOP TOP NAVIGATION BAR (Visible on screens >= 768px)
          ========================================================================= */}
      <header className="hidden md:block sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-[#d1ddd8] shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* Left: Brand Identity */}
          <Link href="/customer" className="flex items-center gap-3 group">
            <SahakariEmblem size={34} />
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-[10px] font-bold text-[#134e3f] uppercase tracking-wider">
                  Shram Setu
                </span>
                <span className="bg-[#b5efda] text-[#002018] font-mono text-[9px] px-1.5 py-0.2 rounded font-bold uppercase">
                  Co-op Society #14
                </span>
              </div>
              <span className="text-[14px] font-bold text-[#131b2e] leading-tight group-hover:text-[#134e3f] transition-colors">
                Public Service Portal
              </span>
            </div>
          </Link>

          {/* Center: Navigation Links */}
          <nav className="flex items-center gap-1 bg-[#f2f3ff] p-1 rounded-xl border border-[#eaedff]">
            {navItems.map(({ href, icon, label }) => {
              const isActive = href === "/customer" ? pathname === "/customer" : pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-[13px] font-bold transition-all ${
                    isActive
                      ? "bg-[#134e3f] text-white shadow-xs"
                      : "text-[#707975] hover:text-[#131b2e] hover:bg-white/60"
                  }`}
                >
                  <span
                    className="material-symbols-outlined text-[18px]"
                    style={isActive ? { fontVariationSettings: "'FILL' 1" } : undefined}
                  >
                    {icon}
                  </span>
                  <span>{label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Right: Location, Quick Book Button & Sign Out */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs text-[#707975] bg-[#faf8ff] border border-[#d1ddd8] px-3 py-1.5 rounded-xl">
              <span className="material-symbols-outlined text-[#904d00] text-[16px]">location_on</span>
              <span className="font-medium text-[#131b2e]">Indiranagar, Bengaluru</span>
            </div>

            <Link
              href="/customer/book"
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#904d00] hover:bg-[#663500] text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">add_circle</span>
              <span>Book Service</span>
            </Link>

            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors border border-rose-200"
              title="Sign Out"
            >
              <span className="material-symbols-outlined text-[16px]">logout</span>
              <span>Exit</span>
            </button>
          </div>
        </div>
      </header>

      {/* =========================================================================
          2. MOBILE BOTTOM NAVIGATION BAR (Visible only on screens < 768px)
          ========================================================================= */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 pb-safe bg-white/95 backdrop-blur-xl border-t border-[#d1ddd8] shadow-[0_-2px_12px_rgba(11,28,48,0.06)]">
        <div className="flex items-center justify-around h-16 max-w-md mx-auto px-2">
          {navItems.map(({ href, icon, label }) => {
            const isActive = href === "/customer" ? pathname === "/customer" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex flex-col items-center justify-center w-16 h-12 transition-all active:scale-95 ${
                  isActive ? "text-[#904d00] font-bold" : "text-[#707975] hover:text-on-surface"
                }`}
              >
                <span
                  className="material-symbols-outlined text-[24px]"
                  style={isActive ? { fontVariationSettings: "'FILL' 1" } : undefined}
                >
                  {icon}
                </span>
                <span className="text-[11px] mt-0.5 tracking-tight">{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
