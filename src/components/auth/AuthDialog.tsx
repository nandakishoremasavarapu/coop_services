"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, UserRound, Wrench, Landmark, ShieldCheck, Info } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/cn";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";
import { ErrorNotice } from "@/components/ui/states";

export type GatewayRole = "customer" | "provider" | "admin";

interface AuthDialogProps {
  open: boolean;
  onClose: () => void;
  defaultRole?: GatewayRole;
}

const ROLES: {
  key: GatewayRole;
  apiRole: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  canRegister: boolean;
}[] = [
  {
    key: "customer",
    apiRole: "customer",
    label: "Customer",
    description: "Book trusted home services",
    icon: <UserRound />,
    canRegister: true,
  },
  {
    key: "provider",
    apiRole: "provider",
    label: "Service Provider",
    description: "Manage service requests & jobs",
    icon: <Wrench />,
    canRegister: true,
  },
  {
    key: "admin",
    apiRole: "federation_admin",
    label: "Administration",
    description: "Run cooperative operations",
    icon: <Landmark />,
    canRegister: false,
  },
];

/** Demo environment identities (seeded). */
const DEMO: Record<GatewayRole, { phone: string; password: string }> = {
  customer: { phone: "9100000001", password: "password123" },
  provider: { phone: "9200000001", password: "password123" },
  admin: { phone: "9000000001", password: "admin123" },
};

export function AuthDialog({ open, onClose, defaultRole = "customer" }: AuthDialogProps) {
  const router = useRouter();
  const [role, setRole] = useState<GatewayRole>(defaultRole);
  const [mode, setMode] = useState<"login" | "register">("login");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    phone: "",
    password: "",
    fullName: "",
    city: "",
    experience: "",
  });

  // Reset the selected role when the dialog opens (render-adjust pattern).
  const openKey = `${open}:${defaultRole}`;
  const [prevOpenKey, setPrevOpenKey] = useState(openKey);
  if (prevOpenKey !== openKey) {
    setPrevOpenKey(openKey);
    if (role !== defaultRole) setRole(defaultRole);
  }

  const activeRole = ROLES.find((r) => r.key === role)!;

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
      const body =
        mode === "login"
          ? { phone: form.phone.trim(), password: form.password }
          : {
              phone: form.phone.trim(),
              password: form.password,
              fullName: form.fullName.trim(),
              role: activeRole.apiRole,
              city: form.city.trim() || undefined,
              experience: form.experience || undefined,
            };

      const res = await apiFetch(endpoint, { method: "POST", body: JSON.stringify(body) });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        return;
      }

      const userRole = data.user?.role ?? activeRole.apiRole;
      onClose();
      if (userRole === "customer") router.push("/customer");
      else if (userRole === "provider") router.push("/provider");
      else router.push("/admin");
      router.refresh();
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = () => {
    setMode("login");
    setForm((prev) => ({ ...prev, ...DEMO[role] }));
    setError("");
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={mode === "login" ? "Sign in to Shram Setu" : "Create your account"}
      description="One cooperative account for services, work and governance."
      size="lg"
    >
      {/* Role gateway */}
      <div role="radiogroup" aria-label="Choose how you use Shram Setu" className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        {ROLES.map((r) => {
          const selected = role === r.key;
          return (
            <button
              key={r.key}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => {
                setRole(r.key);
                if (!r.canRegister) setMode("login");
                setError("");
              }}
              className={cn(
                "rounded-2xl border p-3.5 text-left transition-all cursor-pointer",
                selected
                  ? "border-brand-600 bg-brand-50 ring-1 ring-brand-600/30"
                  : "border-line bg-white hover:border-line-strong hover:bg-ink-50/60"
              )}
            >
              <span
                aria-hidden
                className={cn(
                  "size-9 rounded-xl inline-flex items-center justify-center mb-2 [&>svg]:size-4.5",
                  selected ? "bg-brand-700 text-white" : "bg-ink-100 text-ink-600"
                )}
              >
                {r.icon}
              </span>
              <span className={cn("block text-sm font-bold", selected ? "text-brand-900" : "text-ink-900")}>{r.label}</span>
              <span className="block text-xs text-ink-500 mt-0.5 leading-snug">{r.description}</span>
            </button>
          );
        })}
      </div>

      {/* Mode switch */}
      {activeRole.canRegister ? (
        <div className="grid grid-cols-2 gap-1 rounded-xl bg-ink-100 p-1 mt-5" role="tablist">
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
        <div className="mt-5 flex items-start gap-2.5 rounded-xl bg-info-50 border border-info-200 px-3.5 py-3">
          <Info className="size-4.5 text-info-600 shrink-0 mt-0.5" aria-hidden />
          <p className="text-xs text-info-800 leading-relaxed">
            <strong>Society &amp; federation accounts are provisioned by the cooperative secretariat.</strong>{" "}
            Sign in with the credentials issued to your office — public registration is not available for
            administrative roles.
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-5 space-y-4">
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
          <Field label="Registered mobile number" required>
            <Input
              required
              type="tel"
              inputMode="numeric"
              pattern="[0-9]*"
              value={form.phone}
              onChange={update("phone")}
              placeholder="10-digit mobile number"
              autoComplete="tel"
            />
          </Field>

          <Field label="Password" required>
            <div className="relative">
              <Input
                required
                type={showPassword ? "text" : "password"}
                value={form.password}
                onChange={update("password")}
                placeholder={mode === "register" ? "Create a password" : "Your password"}
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
            <Field label="City / Town" hint="Optional — you can update it later">
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
          {mode === "login" ? `Sign in as ${activeRole.label}` : `Register as ${activeRole.label}`}
        </Button>

        {/* Seeded demo identities (development convenience) */}
        <div className="rounded-xl bg-ink-50 border border-line px-3.5 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <ShieldCheck className="size-4.5 text-brand-600 shrink-0" aria-hidden />
            <p className="text-xs text-ink-500 leading-snug">
              Demo {activeRole.label} login:{" "}
              <span className="font-mono font-semibold text-ink-700">{DEMO[role].phone}</span> /{" "}
              <span className="font-mono font-semibold text-ink-700">{DEMO[role].password}</span>
            </p>
          </div>
          <button type="button" onClick={fillDemo} className="text-xs font-bold text-brand-700 hover:underline underline-offset-2 shrink-0">
            Autofill
          </button>
        </div>
      </form>
    </Modal>
  );
}
