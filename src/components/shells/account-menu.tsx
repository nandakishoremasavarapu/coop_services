"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, Bell, UserRound, ChevronDown } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/cn";

interface AccountMenuProps {
  name: string;
  identifier?: string;
  roleLabel: string;
  profileHref: string;
  notificationsHref?: string;
  align?: "left" | "right";
}

/** Avatar + dropdown containing profile access and logout. */
export function AccountMenu({ name, identifier, roleLabel, profileHref, notificationsHref, align = "right" }: AccountMenuProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const handleLogout = async () => {
    try {
      await apiFetch("/api/auth/logout", { method: "POST" });
    } catch {
      /* session is cleared best-effort */
    }
    window.location.href = "/";
  };

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex items-center gap-2.5 rounded-full pl-1.5 pr-2.5 py-1.5 hover:bg-ink-100 transition-colors"
      >
        <Avatar name={name} size="sm" />
        <span className="hidden lg:block max-w-32 truncate text-sm font-semibold text-ink-800">{name}</span>
        <ChevronDown className={cn("size-4 text-ink-400 transition-transform", open && "rotate-180")} aria-hidden />
      </button>

      {open && (
        <div
          role="menu"
          className={cn(
            "absolute top-[calc(100%+8px)] w-64 rounded-2xl bg-panel border border-line shadow-overlay p-1.5 animate-pop-in z-60",
            align === "right" ? "right-0" : "left-0"
          )}
        >
          <div className="px-3 py-2.5 border-b border-line mb-1">
            <p className="text-sm font-bold text-ink-900 truncate">{name}</p>
            <p className="text-xs text-ink-400 truncate mt-0.5">
              {roleLabel}
              {identifier ? ` • ${identifier}` : ""}
            </p>
          </div>
          <MenuLink href={profileHref} icon={<UserRound className="size-4" />} onSelect={() => setOpen(false)}>
            My profile
          </MenuLink>
          {notificationsHref && (
            <MenuLink href={notificationsHref} icon={<Bell className="size-4" />} onSelect={() => setOpen(false)}>
              Notifications
            </MenuLink>
          )}
          <button
            type="button"
            role="menuitem"
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold text-danger-600 hover:bg-danger-50 transition-colors"
          >
            <LogOut className="size-4" />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}

function MenuLink({ href, icon, children, onSelect }: { href: string; icon: React.ReactNode; children: React.ReactNode; onSelect: () => void }) {
  return (
    <Link
      href={href}
      role="menuitem"
      onClick={onSelect}
      className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold text-ink-700 hover:bg-ink-100 transition-colors"
    >
      {icon}
      {children}
    </Link>
  );
}
