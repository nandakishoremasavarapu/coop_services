"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import SahakariEmblem from "@/components/SahakariEmblem";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { apiFetch } from "@/lib/api";

type Role = "customer" | "provider" | "admin";

interface LoginModalProps {
  defaultRole: Role;
  onClose: () => void;
}

const ROLE_CONFIG = {
  customer: { label: "Customer", icon: "person_pin_circle", color: "#134e3f", desc: "Citizen / Household services" },
  provider: { label: "Service Provider", icon: "handyman", color: "#904d00", desc: "Union member-owner jobs" },
  admin: { label: "Cooperative Admin", icon: "policy", color: "#003724", desc: "Federation & society governance" },
};

export default function LoginModal({ defaultRole, onClose }: LoginModalProps) {
  const router = useRouter();
  const [role, setRole] = useState<Role>(defaultRole);
  const [mode, setMode] = useState<"login" | "register">("login");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    phone: "",
    password: "",
    fullName: "",
    email: "",
    address: "",
    city: "",
    pincode: "",
    experience: "",
    bio: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const apiRole = role === "admin" ? "federation_admin" : role;
      const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/register";
      const body =
        mode === "login"
          ? { phone: form.phone, password: form.password }
          : { ...form, role: apiRole };

      const res = await apiFetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Something went wrong");
        return;
      }

      const userRole = data.user?.role ?? apiRole;
      if (userRole === "customer") router.push("/customer");
      else if (userRole === "provider") router.push("/provider");
      else router.push("/admin");

      onClose();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (r: Role) => {
    const demos: Record<Role, { phone: string; password: string }> = {
      customer: { phone: "9100000001", password: "password123" },
      provider: { phone: "9200000001", password: "password123" },
      admin: { phone: "9000000001", password: "admin123" },
    };
    setForm((prev) => ({ ...prev, ...demos[r] }));
    setRole(r);
    setMode("login");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto border border-[#d1ddd8]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#eaedff]">
          <div className="flex items-center gap-2">
            <SahakariEmblem size={30} />
            <div>
              <div className="font-bold text-[15px] text-on-surface">Sahakari Gateway</div>
              <div className="text-[11px] text-on-surface-variant font-mono">Civic Access Portal</div>
            </div>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-[#f2f3ff]"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Role Selector Tabs */}
        <div className="p-4 pb-0">
          <div className="grid grid-cols-3 gap-1.5 p-1 bg-[#f2f3ff] rounded-xl border border-[#d1ddd8]">
            {(["customer", "provider", "admin"] as Role[]).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => {
                  setRole(r);
                  setError("");
                }}
                className={`py-1.5 rounded-lg text-[11px] font-bold transition-all flex items-center justify-center gap-1 ${
                  role === r ? "bg-[#134e3f] text-white shadow-xs" : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                <span className="material-symbols-outlined text-[14px]">{ROLE_CONFIG[r].icon}</span>
                <span>{ROLE_CONFIG[r].label.split(" ")[0]}</span>
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between mt-3 text-[11px]">
            <span className="text-on-surface-variant">Quick fill demo:</span>
            <button
              type="button"
              onClick={() => fillDemo(role)}
              className="text-[#904d00] hover:underline font-bold"
            >
              Autofill {ROLE_CONFIG[role].label}
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          {error && (
            <div className="p-2.5 rounded-xl bg-[#ffdad6] text-[#ba1a1a] text-[12px] font-semibold flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[16px]">error</span>
              {error}
            </div>
          )}

          {mode === "register" && (
            <div>
              <label className="text-[11px] font-bold text-on-surface block mb-1">Full Name / Trade Name</label>
              <input
                type="text"
                name="fullName"
                required
                value={form.fullName}
                onChange={handleChange}
                placeholder="Enter full name"
                className="w-full px-3 py-2 text-[13px] border border-[#d1ddd8] rounded-xl focus:outline-none focus:border-[#134e3f]"
              />
            </div>
          )}

          <div>
            <label className="text-[11px] font-bold text-on-surface block mb-1">Registered Mobile Number</label>
            <input
              type="tel"
              name="phone"
              required
              value={form.phone}
              onChange={handleChange}
              placeholder="e.g. 9876543210"
              className="w-full px-3 py-2 text-[13px] border border-[#d1ddd8] rounded-xl focus:outline-none focus:border-[#134e3f]"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-on-surface block mb-1">Password</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                required
                value={form.password}
                onChange={handleChange}
                placeholder="••••••••"
                className="w-full px-3 py-2 text-[13px] border border-[#d1ddd8] rounded-xl focus:outline-none focus:border-[#134e3f]"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2 text-[#707975] hover:text-on-surface"
              >
                <span className="material-symbols-outlined text-[18px]">
                  {showPassword ? "visibility_off" : "visibility"}
                </span>
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-[#134e3f] text-white rounded-xl text-[13px] font-bold shadow-md hover:bg-[#00362a] active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
          >
            {loading ? <LoadingSpinner size={16} /> : <span>{mode === "login" ? "Enter Gateway" : "Register with Cooperative"}</span>}
          </button>

          <div className="text-center pt-1 text-[11px] text-on-surface-variant">
            {mode === "login" ? (
              <span>
                New member or citizen?{" "}
                <button
                  type="button"
                  onClick={() => setMode("register")}
                  className="text-[#904d00] font-bold hover:underline"
                >
                  Create Account
                </button>
              </span>
            ) : (
              <span>
                Already registered?{" "}
                <button
                  type="button"
                  onClick={() => setMode("login")}
                  className="text-[#904d00] font-bold hover:underline"
                >
                  Sign In
                </button>
              </span>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
