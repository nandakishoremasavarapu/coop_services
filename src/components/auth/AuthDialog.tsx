"use client";

import React, { useState, useEffect } from "react";
import { Eye, EyeOff, UserRound, Wrench, Landmark, ShieldCheck, Info } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/cn";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";
import { ErrorNotice } from "@/components/ui/states";
import { ShramSetuLogo } from "@/components/ShramSetuLogo";

export type GatewayRole = "customer" | "provider" | "admin";

export interface AuthDialogProps {
  open: boolean;
  onClose: () => void;
  defaultRole?: GatewayRole;
}

export const ROLE_CONFIG = {
  customer: {
    key: "customer" as GatewayRole,
    apiRole: "customer",
    title: "Citizen Verification",
    subtitle: "Verify identity via Government UID or Registered Mobile",
    portalName: "Citizen Portal",
    btnLabel: "Enter Citizen Portal",
    targetPath: "/customer",
    defaultPhone: "9100000001",
    defaultPass: "password123",
    badge: "Household",
    accentColor: "border-brand-600 bg-brand-50 text-brand-900 ring-1 ring-brand-600/30",
    phoneLabel: "Registered Mobile or Citizen UID",
    phonePlaceholder: "e.g. 91000 00001",
    icon: <UserRound className="size-4.5" />,
    canRegister: true,
  },
  provider: {
    key: "provider" as GatewayRole,
    apiRole: "provider",
    title: "Member-Owner Verification",
    subtitle: "Authenticate with Union Registration or Registered Phone",
    portalName: "Service Provider Portal",
    btnLabel: "Enter Member Portal",
    targetPath: "/provider",
    defaultPhone: "9200000001",
    defaultPass: "password123",
    badge: "Union Card",
    accentColor: "border-accent-600 bg-accent-50 text-accent-950 ring-1 ring-accent-600/30",
    phoneLabel: "Union Registration or Registered Phone",
    phonePlaceholder: "e.g. 92000 00001",
    icon: <Wrench className="size-4.5" />,
    canRegister: true,
  },
  admin: {
    key: "admin" as GatewayRole,
    apiRole: "federation_admin",
    title: "Federation Official Gateway",
    subtitle: "Secure access for district stewards & society administrators",
    portalName: "Governance Console",
    btnLabel: "Enter Governance Gateway",
    targetPath: "/admin",
    defaultPhone: "9000000001",
    defaultPass: "admin123",
    badge: "Gov / Coop",
    accentColor: "border-ink-800 bg-ink-100 text-ink-950 ring-1 ring-ink-800/30",
    phoneLabel: "Official Secretariat ID or Phone",
    phonePlaceholder: "e.g. 90000 00001",
    icon: <Landmark className="size-4.5" />,
    canRegister: false,
  },
};

export function AuthDialog({ open, onClose, defaultRole = "customer" }: AuthDialogProps) {
  const [role, setRole] = useState<GatewayRole>(defaultRole);
  const [mode, setMode] = useState<"login" | "register">("login");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const active = ROLE_CONFIG[role];

  const [form, setForm] = useState({
    phone: active.defaultPhone,
    password: active.defaultPass,
    fullName: "",
    city: "",
    experience: "",
  });

  // Whenever dialog opens or defaultRole changes, ensure fields match the targeted role
  useEffect(() => {
    if (open) {
      setRole(defaultRole);
      setForm({
        phone: ROLE_CONFIG[defaultRole].defaultPhone,
        password: ROLE_CONFIG[defaultRole].defaultPass,
        fullName: "",
        city: "",
        experience: "",
      });
      setError("");
      setMode("login");
    }
  }, [open, defaultRole]);

  const selectRole = (newRole: GatewayRole) => {
    setRole(newRole);
    setForm((prev) => ({
      ...prev,
      phone: ROLE_CONFIG[newRole].defaultPhone,
      password: ROLE_CONFIG[newRole].defaultPass,
    }));
    setError("");
    if (!ROLE_CONFIG[newRole].canRegister) setMode("login");
  };

  const update = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [key]: e.target.value }));
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/register";
      const submitPhone = form.phone.trim() || active.defaultPhone;
      const submitPassword = form.password.trim() || active.defaultPass;

      const body =
        mode === "login"
          ? { phone: submitPhone, password: submitPassword }
          : {
              phone: submitPhone,
              password: submitPassword,
              fullName: form.fullName.trim(),
              role: active.apiRole,
              city: form.city.trim() || undefined,
              experience: form.experience || undefined,
            };

      const res = await apiFetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Authentication failed. Please verify credentials.");
        return;
      }

      onClose();
      // Route immediately and directly to the correct role portal
      const targetRole = data.user?.role ?? active.apiRole;
      const destination =
        targetRole === "customer"
          ? "/customer"
          : targetRole === "provider"
          ? "/provider"
          : "/admin";

      window.location.href = destination;
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (targetRole: GatewayRole) => {
    selectRole(targetRole);
    setMode("login");
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        <div className="flex items-center gap-3">
          <ShramSetuLogo size={36} priority />
          <div>
            <h2 className="text-lg font-bold text-ink-900 leading-tight">
              {mode === "login" ? active.title : `Register with ${active.portalName}`}
            </h2>
            <p className="text-xs text-ink-500 mt-0.5">{active.subtitle}</p>
          </div>
        </div>
      }
      size="lg"
    >
      {/* Role selector tabs */}
      <div role="radiogroup" aria-label="Select Gateway Role" className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        {(["customer", "provider", "admin"] as GatewayRole[]).map((rKey) => {
          const cfg = ROLE_CONFIG[rKey];
          const isSelected = role === rKey;
          return (
            <button
              key={rKey}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => selectRole(rKey)}
              className={cn(
                "rounded-2xl border p-3.5 text-left transition-all cursor-pointer relative",
                isSelected
                  ? cfg.accentColor
                  : "border-line bg-white hover:border-line-strong hover:bg-ink-50/60"
              )}
            >
              <div className="flex items-center justify-between mb-2">
                <span
                  aria-hidden
                  className={cn(
                    "size-9 rounded-xl inline-flex items-center justify-center [&>svg]:size-4.5",
                    isSelected ? "bg-brand-700 text-white" : "bg-ink-100 text-ink-600"
                  )}
                >
                  {cfg.icon}
                </span>
                <span className="text-2xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-ink-200/60 text-ink-700">
                  {cfg.badge}
                </span>
              </div>
              <span className="block text-sm font-bold text-ink-900">{cfg.portalName.split(" ")[0]}</span>
              <span className="block text-2xs text-ink-500 mt-0.5 truncate">{cfg.subtitle}</span>
            </button>
          );
        })}
      </div>

      {/* Quick Demo Autofill Bar */}
      <div className="mt-3.5 p-2.5 rounded-xl bg-ink-50 border border-line flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="font-semibold text-ink-500">Quick Credentials:</span>
          {(["customer", "provider", "admin"] as GatewayRole[]).map((rKey) => (
            <button
              key={rKey}
              type="button"
              onClick={() => fillDemo(rKey)}
              className={cn(
                "px-2.5 py-1 rounded-lg text-xs font-bold transition-all",
                role === rKey
                  ? "bg-brand-700 text-white shadow-xs"
                  : "bg-white text-ink-700 border border-line hover:bg-ink-100"
              )}
            >
              {rKey === "customer" ? "👤 Customer" : rKey === "provider" ? "🔧 Provider" : "🏛️ Admin"}
            </button>
          ))}
        </div>
        <span className="font-mono text-2xs text-ink-600 bg-white border border-line px-2 py-0.5 rounded">
          {active.defaultPhone} • {active.defaultPass}
        </span>
      </div>

      {/* Mode switch (if registration available for this role) */}
      {active.canRegister ? (
        <div className="grid grid-cols-2 gap-1 rounded-xl bg-ink-100 p-1 mt-4" role="tablist">
          {(["login", "register"] as const).map((m) => (
            <button
              key={m}
              role="tab"
              aria-selected={mode === m}
              type="button"
              onClick={() => {
                setMode(m);
                setError("");
              }}
              className={cn(
                "h-9 rounded-lg text-sm font-semibold transition-all",
                mode === m ? "bg-white text-ink-900 shadow-xs" : "text-ink-500 hover:text-ink-800"
              )}
            >
              {m === "login" ? "Sign in" : "Register"}
            </button>
          ))}
        </div>
      ) : (
        <div className="mt-4 flex items-start gap-2.5 rounded-xl bg-info-50 border border-info-200 px-3.5 py-2.5">
          <Info className="size-4.5 text-info-600 shrink-0 mt-0.5" aria-hidden />
          <p className="text-xs text-info-800 leading-relaxed">
            <strong>Official society &amp; federation accounts</strong> are provisioned by the cooperative secretariat.
            Authenticate with your registered administrative phone number.
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        {error && <ErrorNotice message={error} />}

        {mode === "register" && (
          <Field label={role === "provider" ? "Full name / Trade name" : "Full name"} required>
            <Input
              required
              value={form.fullName}
              onChange={update("fullName")}
              placeholder={role === "provider" ? "e.g. Ramesh Electrical Works" : "e.g. Meera Krishnan"}
              autoComplete="name"
            />
          </Field>
        )}

        <div className={cn("grid gap-4", mode === "register" ? "sm:grid-cols-2" : "grid-cols-1")}>
          <Field label={active.phoneLabel} required>
            <Input
              required
              type="tel"
              value={form.phone}
              onChange={update("phone")}
              placeholder={active.phonePlaceholder}
              autoComplete="tel"
            />
          </Field>

          <Field label="Passcode / Password" required>
            <div className="relative">
              <Input
                required
                type={showPassword ? "text" : "password"}
                value={form.password}
                onChange={update("password")}
                placeholder={`Enter password (default: ${active.defaultPass})`}
                autoComplete={mode === "register" ? "new-password" : "current-password"}
                className="pr-11"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-700 transition-colors"
              >
                {showPassword ? <EyeOff className="size-4.5" /> : <Eye className="size-4.5" />}
              </button>
            </div>
          </Field>
        </div>

        {mode === "register" && (
          <div className={cn("grid gap-4", role === "provider" ? "sm:grid-cols-2" : "grid-cols-1")}>
            <Field label="City / Town" hint="Optional">
              <Input value={form.city} onChange={update("city")} placeholder="e.g. Visakhapatnam" />
            </Field>
            {role === "provider" && (
              <Field label="Years of experience" hint="Optional">
                <Input type="number" min={0} max={60} value={form.experience} onChange={update("experience")} placeholder="e.g. 8" />
              </Field>
            )}
          </div>
        )}

        <Button type="submit" loading={loading} size="lg" className="w-full">
          {loading ? "Authenticating..." : mode === "login" ? active.btnLabel : `Register as ${active.portalName.split(" ")[0]}`}
        </Button>

        {/* Security / trust badge */}
        <div className="flex items-center gap-2 pt-1 text-2xs text-ink-500 justify-center">
          <ShieldCheck className="size-3.5 text-brand-600" aria-hidden />
          <span>256-Bit Escrow Security • Multi-State Co-operative Societies Framework</span>
        </div>
      </form>
    </Modal>
  );
}
