"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import SahakariEmblem from "@/components/SahakariEmblem";

type RoleType = "citizen" | "member" | "admin";

const ROLE_DETAILS = {
  citizen: {
    name: "Customer",
    subName: "Citizen / Household",
    desc: "Book verified cooperative trades, transparent wage estimates.",
    badge: "Default",
    icon: "person_pin_circle",
    apiRole: "customer",
    defaultPhone: "9100000001",
    defaultPass: "password123",
    authTitle: "Citizen Verification",
    authSubtitle: "Verify identity via Government UID or Registered Mobile",
    btnLabel: "Enter Citizen Portal",
  },
  member: {
    name: "Service Provider",
    subName: "Member-Owner",
    desc: "Direct member ledger, job dispatch & collective dividend rights.",
    badge: "Union Card",
    icon: "handyman",
    apiRole: "provider",
    defaultPhone: "9200000001",
    defaultPass: "password123",
    authTitle: "Member-Owner Verification",
    authSubtitle: "Authenticate with Union Registration or Registered Phone",
    btnLabel: "Enter Member Portal",
  },
  admin: {
    name: "Federation Official",
    subName: "Verified Society Access",
    desc: "Quorum auditing, society rate-setting & dispute governance.",
    badge: "Gov / Coop",
    icon: "policy",
    apiRole: "federation_admin",
    defaultPhone: "9000000001",
    defaultPass: "admin123",
    authTitle: "Federation Official Gateway",
    authSubtitle: "Secure access for district stewards & society administrators",
    btnLabel: "Enter Governance Gateway",
  },
};

export default function LandingPage() {
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState<RoleType>("citizen");
  const [phone, setPhone] = useState(ROLE_DETAILS.citizen.defaultPhone);
  const [password, setPassword] = useState(ROLE_DETAILS.citizen.defaultPass);
  const [useOtp, setUseOtp] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const activeRoleData = ROLE_DETAILS[selectedRole];

  const handleRoleChange = (role: RoleType) => {
    setSelectedRole(role);
    setPhone(ROLE_DETAILS[role].defaultPhone);
    setPassword(ROLE_DETAILS[role].defaultPass);
    setError("");
    setOtpSent(false);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: phone.trim(),
          password: password.trim() || activeRoleData.defaultPass,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Authentication failed. Please verify credentials.");
        return;
      }

      if (data.user?.role === "customer") {
        router.push("/customer");
      } else if (data.user?.role === "provider") {
        router.push("/provider");
      } else {
        router.push("/admin");
      }
    } catch {
      setError("Network connectivity error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = () => {
    setOtpSent(true);
    setOtpCode("1234");
  };

  return (
    <div className="min-h-screen bg-surface font-body text-body text-on-surface antialiased pt-safe pb-safe flex flex-col items-center">
      <main className="flex-1 flex flex-col relative w-full max-w-md mx-auto px-4 py-6">
        <div className="flex flex-col w-full gap-5">
          {/* Top Civic Brand Header */}
          <header className="pt-2 flex flex-col items-center text-center">
            <div className="relative flex items-center justify-center mb-3">
              <div className="w-16 h-16 rounded-2xl bg-white shadow-md p-1.5 flex items-center justify-center border border-[#d1ddd8]">
                <SahakariEmblem size={52} />
              </div>
              <span className="absolute -bottom-1 -right-1 bg-[#fe932c] text-[#663500] rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase shadow-sm flex items-center gap-0.5">
                <span className="material-symbols-outlined text-[13px]">verified</span>
                Civic
              </span>
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#eaedff] text-[#134e3f] text-[12px] font-semibold mb-2">
              <span className="material-symbols-outlined text-[15px] text-[#316858]">account_balance</span>
              Ministry of Co-operation Initiative
            </div>

            <h1 className="text-[26px] font-bold text-on-surface tracking-tight leading-tight">
  Shram Setu
</h1>
            <p className="text-[13px] text-on-surface-variant max-w-xs mt-1 leading-relaxed">
              Cooperative-Owned Digital Service Marketplace. Empowering verified skilled labour, transparent fair pricing, and civic trust.
            </p>
          </header>

          {/* Role Selection Gateway Section */}
          <section aria-label="Select Gateway Role" className="flex flex-col gap-2">
            <div className="flex items-center justify-between px-1">
              <span className="text-[12px] font-bold uppercase tracking-wider text-on-surface-variant">
                Select Gateway Portal
              </span>
              <span className="font-mono text-[11px] text-[#707975] flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">lock</span>
                256-Bit Escrow
              </span>
            </div>

            <div className="grid grid-cols-1 gap-2.5" id="role-selector-group">
              {(["citizen", "member", "admin"] as RoleType[]).map((r) => {
                const info = ROLE_DETAILS[r];
                const isSelected = selectedRole === r;
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => handleRoleChange(r)}
                    className={`role-card w-full text-left p-3.5 rounded-xl transition-all duration-200 relative border ${
                      isSelected
                        ? "bg-[#134e3f] text-white border-[#00362a] shadow-md scale-[1.01]"
                        : "bg-white text-on-surface border-[#d1ddd8] hover:bg-[#f2f3ff] shadow-xs"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                            isSelected ? "bg-white/15 text-[#85f8c4]" : "bg-[#f2f3ff] text-[#134e3f]"
                          }`}
                        >
                          <span className="material-symbols-outlined text-[24px]">{info.icon}</span>
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className={`text-[15px] font-bold ${isSelected ? "text-white" : "text-[#131b2e]"}`}>
                              {info.name}
                            </span>
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                                isSelected
                                  ? "bg-[#b5efda] text-[#002018]"
                                  : "bg-[#e2e7ff] text-[#155041]"
                              }`}
                            >
                              {info.subName}
                            </span>
                          </div>
                          <p className={`text-[12px] mt-0.5 ${isSelected ? "text-[#86beab]" : "text-[#404945]"}`}>
                            {info.desc}
                          </p>
                        </div>
                      </div>

                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                          isSelected ? "bg-[#b5efda] text-[#002018]" : "bg-[#eaedff] text-[#707975]"
                        }`}
                      >
                        <span className="material-symbols-outlined text-[16px] font-bold">
                          {isSelected ? "check" : "radio_button_unchecked"}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Dynamic Authentication Surface Card */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#d1ddd8] flex flex-col gap-4">
            {/* Header with Dynamic Role Indicator */}
            <div className="flex items-center justify-between border-b border-[#eaedff] pb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#134e3f] text-[22px]">how_to_reg</span>
                <div>
                  <h2 className="text-[15px] font-bold text-on-surface leading-tight">
                    {activeRoleData.authTitle}
                  </h2>
                  <p className="text-[11px] text-on-surface-variant">
                    {activeRoleData.authSubtitle}
                  </p>
                </div>
              </div>
              <span className="bg-[#f2f3ff] text-[#134e3f] font-mono text-[10px] px-2 py-0.5 rounded font-semibold">
                UIDAI / SMS
              </span>
            </div>

            {/* Quick Demo Autofill Pills */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] font-medium text-on-surface-variant">Quick Demo:</span>
              <button
                type="button"
                onClick={() => handleRoleChange("citizen")}
                className={`text-[11px] px-2 py-0.5 rounded-md font-semibold transition-colors ${
                  selectedRole === "citizen"
                    ? "bg-[#134e3f] text-white"
                    : "bg-[#eaedff] text-[#134e3f] hover:bg-[#d2d9f4]"
                }`}
              >
                👤 Citizen
              </button>
              <button
                type="button"
                onClick={() => handleRoleChange("member")}
                className={`text-[11px] px-2 py-0.5 rounded-md font-semibold transition-colors ${
                  selectedRole === "member"
                    ? "bg-[#134e3f] text-white"
                    : "bg-[#eaedff] text-[#134e3f] hover:bg-[#d2d9f4]"
                }`}
              >
                🔧 Provider
              </button>
              <button
                type="button"
                onClick={() => handleRoleChange("admin")}
                className={`text-[11px] px-2 py-0.5 rounded-md font-semibold transition-colors ${
                  selectedRole === "admin"
                    ? "bg-[#134e3f] text-white"
                    : "bg-[#eaedff] text-[#134e3f] hover:bg-[#d2d9f4]"
                }`}
              >
                🏛️ Admin
              </button>
            </div>

            {error && (
              <div className="p-2.5 rounded-xl bg-[#ffdad6] text-[#ba1a1a] text-[12px] flex items-center gap-1.5 font-medium">
                <span className="material-symbols-outlined text-[18px]">error</span>
                {error}
              </div>
            )}

            <form onSubmit={handleLogin} className="flex flex-col gap-3">
              {/* Phone / Member ID Input */}
              <div className="flex flex-col gap-1">
                <label className="text-[12px] font-semibold text-on-surface flex items-center justify-between">
                  <span>Registered Mobile or Member ID</span>
                  <span className="font-mono text-[11px] text-[#707975]">e.g. 98765 43210</span>
                </label>
                <div className="flex items-center rounded-xl bg-white border border-[#bfc9c3] overflow-hidden focus-within:border-[#134e3f] focus-within:ring-2 focus-within:ring-[#134e3f]/20 transition-all">
                  <div className="flex items-center gap-1 px-3 bg-[#f2f3ff] py-2.5 border-r border-[#bfc9c3] shrink-0 text-[13px] font-bold text-on-surface">
                    <span>+91</span>
                    <span className="material-symbols-outlined text-[16px] text-[#134e3f]">flag</span>
                  </div>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Enter 10-digit mobile or Aadhaar"
                    className="flex-1 px-3 py-2.5 bg-transparent text-[14px] text-on-surface placeholder:text-[#707975] focus:outline-none"
                  />
                </div>
              </div>

              {/* Password or OTP Option */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <label className="text-[12px] font-semibold text-on-surface">
                    {useOtp ? "Enter 4-digit OTP" : "Passcode / Password"}
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setUseOtp(!useOtp);
                      setError("");
                    }}
                    className="text-[11px] text-[#904d00] hover:underline font-semibold"
                  >
                    {useOtp ? "Use Passcode instead" : "Use OTP Verification"}
                  </button>
                </div>

                {useOtp ? (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      maxLength={6}
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value)}
                      placeholder="1234"
                      className="flex-1 px-3 py-2.5 rounded-xl border border-[#bfc9c3] bg-white text-[14px] text-on-surface focus:outline-none focus:border-[#134e3f]"
                    />
                    <button
                      type="button"
                      onClick={handleSendOtp}
                      className="px-3 py-2 rounded-xl bg-[#f2f3ff] text-[#134e3f] text-[12px] font-semibold border border-[#d1ddd8] hover:bg-[#eaedff] shrink-0"
                    >
                      {otpSent ? "Resend OTP" : "Get OTP"}
                    </button>
                  </div>
                ) : (
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password (default: password123)"
                    className="w-full px-3 py-2.5 rounded-xl border border-[#bfc9c3] bg-white text-[14px] text-on-surface focus:outline-none focus:border-[#134e3f]"
                  />
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-2 pt-1">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 bg-[#134e3f] text-white rounded-xl text-[14px] font-bold flex items-center justify-center gap-2 shadow-md hover:bg-[#00362a] active:scale-[0.99] transition-all disabled:opacity-60"
                >
                  {loading ? (
                    <span className="material-symbols-outlined animate-spin text-[20px]">sync</span>
                  ) : (
                    <span className="material-symbols-outlined text-[20px]">login</span>
                  )}
                  <span>{loading ? "Authenticating..." : activeRoleData.btnLabel}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleLogin({ preventDefault: () => {} } as any)}
                  className="w-full h-11 bg-[#f2f3ff] text-[#131b2e] rounded-xl text-[13px] font-semibold flex items-center justify-center gap-2 border border-[#d1ddd8] hover:bg-[#eaedff] active:scale-[0.99] transition-all"
                >
                  <span className="material-symbols-outlined text-[18px] text-[#904d00]">verified_user</span>
                  <span>Login with DigiLocker</span>
                </button>
              </div>
            </form>

            {/* Trust Indicator Bar */}
            <div className="flex items-center gap-2.5 p-2.5 bg-[#f2f3ff] rounded-xl border border-[#d1ddd8]">
              <div className="w-8 h-8 rounded-full bg-[#ffdcc3] text-[#904d00] flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[18px]">verified</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-bold text-on-surface leading-tight">
                  100% Aadhaar-Verified & Cooperative Certified Workforce
                </p>
                <p className="text-[10px] text-on-surface-variant leading-tight mt-0.5">
                  Direct civic escrow protection & zero arbitrary commission markups.
                </p>
              </div>
            </div>
          </div>

          {/* Micro-Indicators / Cooperative Trust Counters */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-white p-3 rounded-xl border border-[#d1ddd8] shadow-xs text-center">
              <div className="font-mono text-[16px] font-bold text-on-surface">42,850+</div>
              <div className="text-[10px] text-on-surface-variant mt-0.5">Federation Artisans</div>
            </div>
            <div className="bg-white p-3 rounded-xl border border-[#d1ddd8] shadow-xs text-center">
              <div className="font-mono text-[16px] font-bold text-[#904d00]">₹0 / Free</div>
              <div className="text-[10px] text-on-surface-variant mt-0.5">Citizen Booking Fee</div>
            </div>
            <div className="bg-white p-3 rounded-xl border border-[#d1ddd8] shadow-xs text-center">
              <div className="font-mono text-[16px] font-bold text-[#005036]">100%</div>
              <div className="text-[10px] text-on-surface-variant mt-0.5">Direct Payouts</div>
            </div>
          </div>

          {/* Dedicated Helpline Banner */}
          <div className="flex flex-col items-center gap-2 pt-1 pb-4">
            <a
              href="tel:18004198800"
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#e2e7ff] rounded-full text-[#131b2e] hover:bg-[#dae2fd] transition-colors shadow-xs"
            >
              <span className="material-symbols-outlined text-[18px] text-[#904d00]">support_agent</span>
              <span className="text-[12px] font-semibold">
                Cooperative Society Helpdesk: <strong className="text-[#904d00]">1800-419-8800</strong> (Toll Free)
              </span>
            </a>
            <p className="font-mono text-[10px] text-[#707975] text-center max-w-xs">
              Regulated under the Multi-State Co-operative Societies Act. Digital Public Goods Infrastructure.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
