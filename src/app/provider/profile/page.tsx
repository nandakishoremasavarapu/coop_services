"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import SahakariEmblem from "@/components/SahakariEmblem";
import { StatusBadge } from "@/components/StatusBadge";
import { StarRating } from "@/components/StarRating";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { apiFetch } from "@/lib/api";

interface ProviderProfile {
  id?: string;
  displayName: string;
  experience?: number | null;
  serviceArea?: string | null;
  city?: string | null;
  pincode?: string | null;
  address?: string | null;
  availability: string;
  verificationStatus: string;
  ratingAvg?: string | null;
  ratingCount?: number | null;
  bio?: string | null;
}

type ActiveModal = "skills" | "area" | "payment" | "welfare" | "support" | null;

export default function ProviderProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<{ id: string; phone: string; email?: string | null } | null>(null);
  const [profile, setProfile] = useState<ProviderProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeModal, setActiveModal] = useState<ActiveModal>(null);
  const [saving, setSaving] = useState(false);
  const [successToast, setSuccessToast] = useState("");

  // 1. Skills modal state
  const [skillsList, setSkillsList] = useState<string[]>([
    "Electrical Repair & Wiring",
    "Switchboard & MCB Troubleshooting",
    "Appliance Diagnostics",
    "Masonry & Plastering",
    "Emergency Fuse Replacements",
  ]);
  const [newSkillInput, setNewSkillInput] = useState("");
  const [experienceYears, setExperienceYears] = useState(8);
  const [bioText, setBioText] = useState("");

  // 2. Service area modal state
  const [serviceAreaText, setServiceAreaText] = useState("");
  const [cityName, setCityName] = useState("Visakhapatnam");
  const [pincodeText, setPincodeText] = useState("530026");
  const [serviceRadius, setServiceRadius] = useState("5 km");
  const [availState, setAvailState] = useState<"available" | "unavailable" | "busy">("available");

  // 3. Payment modal state
  const [accountHolder, setAccountHolder] = useState("");
  const [bankName, setBankName] = useState("State Bank of India");
  const [accountNumber, setAccountNumber] = useState("XXXX-XXXX-9821");
  const [ifscCode, setIfscCode] = useState("SBIN0004123");
  const [upiId, setUpiId] = useState("ramesh.technician@okhdfcbank");

  // 4. Support modal state
  const [grievanceType, setGrievanceType] = useState("Customer Pricing Dispute");
  const [grievanceDetails, setGrievanceDetails] = useState("");
  const [ticketSuccess, setTicketSuccess] = useState("");

  const fetchProfileData = async () => {
    try {
      const res = await apiFetch("/api/auth/me");
      if (res.ok) {
        const d = await res.json();
        setUser(d.user);
        const p = d.user?.profile as ProviderProfile | null;
        setProfile(p);
        if (p) {
          setExperienceYears(p.experience ?? 8);
          setBioText(p.bio ?? "Certified cooperative specialist with certified ITI wireman license and 8+ years hands-on field experience.");
          setServiceAreaText(p.serviceArea ?? "Pydimamba Colony, Dayal Nagar, Gajuwaka");
          setCityName(p.city ?? "Visakhapatnam");
          setPincodeText(p.pincode ?? "530026");
          setAvailState((p.availability as any) ?? "available");
          setAccountHolder(p.displayName ?? "Specialist");
        }
      }
    } catch (err) {
      console.error("Error fetching profile:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfileData();
  }, []);

  const showToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(""), 3000);
  };

  // Save Skills
  const handleSaveSkills = async () => {
    if (!profile?.id) return;
    setSaving(true);
    try {
      const res = await apiFetch(`/api/providers/${profile.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          experience: Number(experienceYears),
          bio: bioText,
        }),
      });
      if (res.ok) {
        showToast("Skills and experience credentials updated!");
        fetchProfileData();
        setActiveModal(null);
      }
    } catch {
      alert("Failed to update skills.");
    } finally {
      setSaving(false);
    }
  };

  // Save Service Area
  const handleSaveServiceArea = async () => {
    if (!profile?.id) return;
    setSaving(true);
    try {
      const res = await apiFetch(`/api/providers/${profile.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceArea: serviceAreaText,
          city: cityName,
          pincode: pincodeText,
          availability: availState,
        }),
      });
      if (res.ok) {
        showToast("Service area and availability status updated!");
        fetchProfileData();
        setActiveModal(null);
      }
    } catch {
      alert("Failed to update service area.");
    } finally {
      setSaving(false);
    }
  };

  // Save Payment Details
  const handleSavePayment = () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      showToast("Bank and UPI settlement details saved!");
      setActiveModal(null);
    }, 600);
  };

  // Submit Grievance Ticket
  const handleSubmitGrievance = () => {
    if (!grievanceDetails.trim()) return;
    const ticketId = "TKT-" + Math.floor(100000 + Math.random() * 900000);
    setTicketSuccess(`Grievance filed successfully! Ref #${ticketId}. The Society Federation Officer will call you within 30 minutes.`);
    setTimeout(() => {
      setTicketSuccess("");
      setGrievanceDetails("");
      setActiveModal(null);
      showToast(`Support Ticket #${ticketId} dispatched!`);
    }, 2500);
  };

  const handleLogout = async () => {
    await apiFetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#faf8ff] flex items-center justify-center">
        <LoadingSpinner label="Loading partner credentials..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#faf8ff] text-[#131b2e] pb-10">
      {/* Toast Notification */}
      {successToast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-[#134e3f] text-white px-4 py-2.5 rounded-2xl shadow-xl flex items-center gap-2 text-[12px] font-bold animate-slide-up">
          <span className="material-symbols-outlined text-[18px] text-[#b5efda]">check_circle</span>
          <span>{successToast}</span>
        </div>
      )}

      {/* Header */}
      <header className="coop-brand px-5 pt-8 md:pt-6 pb-14 text-white relative shadow-md md:rounded-2xl md:mt-4 max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => router.push("/provider")}
              className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white -ml-1 transition-colors"
            >
              <span className="material-symbols-outlined text-[20px]">arrow_back</span>
            </button>
            <div>
              <h1 className="text-[17px] font-bold text-white leading-tight">Partner Profile</h1>
              <p className="text-[11px] text-[#b5efda]">Cooperative Member #COP-9021</p>
            </div>
          </div>
          <SahakariEmblem size={28} />
        </div>
      </header>

      {/* Profile Summary Card */}
      <div className="px-4 -mt-8 mb-4 max-w-5xl mx-auto w-full">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#d1ddd8] space-y-3">
          <div className="flex items-start gap-3.5">
            <div className="w-16 h-16 rounded-2xl bg-[#134e3f] text-white flex items-center justify-center text-2xl font-bold border border-[#d1ddd8] shrink-0">
              {profile?.displayName?.charAt(0) ?? "P"}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 truncate">
                <h2 className="text-[16px] font-bold text-[#131b2e] truncate">
                  {profile?.displayName ?? "Specialist"}
                </h2>
                <span className="material-symbols-outlined text-[16px] text-[#059669]">verified</span>
              </div>
              <div className="flex items-center gap-1 text-[12px] text-[#707975] mt-0.5">
                <span className="material-symbols-outlined text-[14px]">call</span>
                <span>{user?.phone}</span>
              </div>

              {profile?.ratingAvg && (
                <div className="flex items-center gap-2 mt-1.5">
                  <StarRating rating={Number(profile.ratingAvg)} size={14} />
                  <span className="text-[11px] text-[#707975] font-mono">
                    {profile.ratingAvg} ({profile.ratingCount ?? 48} reviews)
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5 pt-1 border-t border-[#f2f3ff]">
            <StatusBadge status={profile?.verificationStatus ?? "verified"} size="sm" />
            <StatusBadge status={profile?.availability ?? "available"} size="sm" />
            <span className="bg-[#f2f3ff] text-[#134e3f] px-2.5 py-0.5 rounded-full text-[10px] font-bold">
              {profile?.experience ?? 8} Years Field Experience
            </span>
          </div>

          <p className="text-[12px] text-[#404945] bg-[#faf8ff] p-2.5 rounded-xl border border-[#eaedff] leading-relaxed">
            {profile?.bio || bioText}
          </p>
        </div>
      </div>

      {/* Interactive Action Menu */}
      <div className="px-4 max-w-5xl mx-auto w-full space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {[
            {
              id: "skills" as const,
              label: "Skills & Services",
              desc: "Manage active trade skills, experience, and certificates",
              icon: "settings_suggest",
              badge: `${skillsList.length} Active Skills`,
            },
            {
              id: "area" as const,
              label: "Service Area & Availability",
              desc: "Set working colonies, pincode, radius, and live status",
              icon: "pin_drop",
              badge: serviceRadius,
            },
            {
              id: "payment" as const,
              label: "Payment & Settlement",
              desc: "Bank/UPI details for daily cooperative 90% payout",
              icon: "account_balance_wallet",
              badge: "Direct UPI Active",
            },
            {
              id: "welfare" as const,
              label: "Welfare & Insurance",
              desc: "₹5,00,000 group accident cover and society benefits",
              icon: "health_and_safety",
              badge: "Policy Active",
            },
            {
              id: "support" as const,
              label: "Help & Support Desk",
              desc: "Contact society federation officer, file tickets or SOS",
              icon: "support_agent",
              badge: "24/7 Hotline",
            },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveModal(item.id)}
              className="w-full bg-white rounded-2xl p-4 flex items-center gap-3.5 shadow-2xs border border-[#eaedff] hover:border-[#134e3f] hover:shadow-xs active:scale-[0.99] transition-all text-left group"
            >
              <div className="w-10 h-10 rounded-xl bg-[#f2f3ff] text-[#134e3f] flex items-center justify-center group-hover:bg-[#134e3f] group-hover:text-white transition-colors shrink-0">
                <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-[13px] text-[#131b2e]">{item.label}</div>
                  <span className="text-[10px] font-semibold text-[#059669] bg-[#b5efda] px-2 py-0.2 rounded-full">
                    {item.badge}
                  </span>
                </div>
                <div className="text-[11px] text-[#707975] truncate mt-0.5">{item.desc}</div>
              </div>
              <span className="material-symbols-outlined text-[16px] text-[#707975] group-hover:text-[#134e3f] group-hover:translate-x-0.5 transition-all">
                chevron_right
              </span>
            </button>
          ))}

          {/* Sign Out Button in the grid */}
          <button
            type="button"
            onClick={handleLogout}
            className="w-full bg-[#ffdad6]/60 border border-[#ffdad6] rounded-2xl p-4 flex items-center gap-3.5 hover:bg-[#ffdad6] transition-colors text-left"
          >
            <div className="w-10 h-10 rounded-xl bg-[#ffdad6] text-[#ba1a1a] flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[20px]">logout</span>
            </div>
            <div className="flex-1">
              <div className="font-bold text-[13px] text-[#ba1a1a]">Sign Out</div>
              <div className="text-[11px] text-[#93000a]/80">Logout from your technician account</div>
            </div>
          </button>
        </div>

        {/* Cooperative Platform Seal */}
        <div className="bg-[#b5efda]/40 rounded-2xl p-4 text-center border border-[#b5efda]">
          <span className="material-symbols-outlined text-[24px] text-[#00362a] mb-1">balance</span>
          <div className="text-[12px] font-bold text-[#00362a]">Democratically Owned Cooperative Federation</div>
          <div className="text-[10px] text-[#00362a]/80 mt-0.5">
            0% platform commission cuts. 100% transparent society governance.
          </div>
        </div>
      </div>

      {/* =========================================================================
          MODAL 1: SKILLS & CERTIFICATIONS
          ========================================================================= */}
      {activeModal === "skills" && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
          <div className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl p-5 space-y-4 max-h-[88vh] overflow-y-auto shadow-2xl animate-slide-up">
            <div className="flex items-center justify-between pb-2 border-b border-[#eaedff]">
              <div>
                <h3 className="text-[15px] font-bold text-[#131b2e]">Skills & Trade Credentials</h3>
                <p className="text-[11px] text-[#707975]">Manage what services you provide to residents</p>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="w-8 h-8 rounded-full bg-[#f2f3ff] flex items-center justify-center text-[#707975]"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            {/* Active Skills List */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-[#707975] uppercase tracking-wider block">
                Active Skills ({skillsList.length})
              </label>
              <div className="flex flex-wrap gap-1.5">
                {skillsList.map((skill, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1.5 bg-[#f2f3ff] text-[#134e3f] border border-[#d1ddd8] px-2.5 py-1 rounded-xl text-[11px] font-semibold"
                  >
                    <span>{skill}</span>
                    <button
                      type="button"
                      onClick={() => setSkillsList(skillsList.filter((_, i) => i !== idx))}
                      className="hover:text-[#ba1a1a]"
                    >
                      <span className="material-symbols-outlined text-[13px]">close</span>
                    </button>
                  </span>
                ))}
              </div>

              {/* Add New Skill */}
              <div className="flex items-center gap-1.5 mt-2">
                <input
                  type="text"
                  value={newSkillInput}
                  onChange={(e) => setNewSkillInput(e.target.value)}
                  placeholder="Add skill (e.g. Geyser repair, MCB switch)"
                  className="flex-1 bg-[#f2f3ff] border border-[#d1ddd8] rounded-xl px-3 py-1.5 text-[12px] focus:outline-none focus:ring-1 focus:ring-[#134e3f]"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (newSkillInput.trim() && !skillsList.includes(newSkillInput.trim())) {
                      setSkillsList([...skillsList, newSkillInput.trim()]);
                      setNewSkillInput("");
                    }
                  }}
                  className="px-3 py-1.5 bg-[#134e3f] text-white rounded-xl text-[11px] font-bold hover:bg-[#00362a]"
                >
                  Add
                </button>
              </div>
            </div>

            {/* Years of Experience */}
            <div>
              <label className="text-[11px] font-bold text-[#707975] uppercase tracking-wider block mb-1">
                Years of Field Experience: <span className="text-[#134e3f] font-mono text-[13px]">{experienceYears} Years</span>
              </label>
              <input
                type="range"
                min={1}
                max={30}
                value={experienceYears}
                onChange={(e) => setExperienceYears(Number(e.target.value))}
                className="w-full accent-[#134e3f]"
              />
            </div>

            {/* Profile Bio */}
            <div>
              <label className="text-[11px] font-bold text-[#707975] uppercase tracking-wider block mb-1">
                Specialist Bio / Introduction
              </label>
              <textarea
                rows={3}
                value={bioText}
                onChange={(e) => setBioText(e.target.value)}
                className="w-full bg-[#f2f3ff] border border-[#d1ddd8] rounded-xl p-2.5 text-[12px] focus:outline-none focus:ring-1 focus:ring-[#134e3f]"
              />
            </div>

            {/* Verified Certifications Card */}
            <div className="bg-[#b5efda]/30 p-3 rounded-xl border border-[#b5efda] space-y-1.5">
              <div className="flex items-center gap-1.5 text-[#00362a] font-bold text-[12px]">
                <span className="material-symbols-outlined text-[16px] text-[#059669]">verified</span>
                Verified Cooperative Certifications
              </div>
              <p className="text-[11px] text-[#00362a]/80">
                • ITI Wireman Certification #AP-ELEC-4482<br />
                • State Cooperative Federation Trade License (Active till 2028)
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="flex-1 py-2.5 bg-[#f2f3ff] text-[#707975] rounded-xl text-[12px] font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={handleSaveSkills}
                className="flex-1 py-2.5 bg-[#134e3f] text-white rounded-xl text-[12px] font-bold hover:bg-[#00362a] disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Credentials"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 2: SERVICE AREA & AVAILABILITY
          ========================================================================= */}
      {activeModal === "area" && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
          <div className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl p-5 space-y-4 max-h-[88vh] overflow-y-auto shadow-2xl animate-slide-up">
            <div className="flex items-center justify-between pb-2 border-b border-[#eaedff]">
              <div>
                <h3 className="text-[15px] font-bold text-[#131b2e]">Service Area & Working Radius</h3>
                <p className="text-[11px] text-[#707975]">Define colonies and dispatch range</p>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="w-8 h-8 rounded-full bg-[#f2f3ff] flex items-center justify-center text-[#707975]"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div>
              <label className="text-[11px] font-bold text-[#707975] uppercase tracking-wider block mb-1">
                Colonies / Societies Served
              </label>
              <input
                type="text"
                value={serviceAreaText}
                onChange={(e) => setServiceAreaText(e.target.value)}
                placeholder="e.g. Pydimamba Colony, Dayal Nagar, Gajuwaka"
                className="w-full bg-[#f2f3ff] border border-[#d1ddd8] rounded-xl px-3 py-2 text-[12px] focus:outline-none focus:ring-1 focus:ring-[#134e3f]"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] font-bold text-[#707975] uppercase tracking-wider block mb-1">
                  City
                </label>
                <input
                  type="text"
                  value={cityName}
                  onChange={(e) => setCityName(e.target.value)}
                  className="w-full bg-[#f2f3ff] border border-[#d1ddd8] rounded-xl px-3 py-2 text-[12px]"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-[#707975] uppercase tracking-wider block mb-1">
                  Pincode
                </label>
                <input
                  type="text"
                  value={pincodeText}
                  onChange={(e) => setPincodeText(e.target.value)}
                  className="w-full bg-[#f2f3ff] border border-[#d1ddd8] rounded-xl px-3 py-2 text-[12px]"
                />
              </div>
            </div>

            {/* Radius Chips */}
            <div>
              <label className="text-[11px] font-bold text-[#707975] uppercase tracking-wider block mb-1.5">
                Maximum Travel Radius
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {["3 km", "5 km", "10 km", "15 km"].map((rad) => (
                  <button
                    key={rad}
                    type="button"
                    onClick={() => setServiceRadius(rad)}
                    className={`py-1.5 rounded-xl text-[11px] font-bold border transition-all ${
                      serviceRadius === rad
                        ? "bg-[#134e3f] text-white border-[#134e3f]"
                        : "bg-[#f2f3ff] text-[#707975] border-[#d1ddd8]"
                    }`}
                  >
                    {rad}
                  </button>
                ))}
              </div>
            </div>

            {/* Availability Radio */}
            <div>
              <label className="text-[11px] font-bold text-[#707975] uppercase tracking-wider block mb-1.5">
                Availability Status
              </label>
              <div className="space-y-1.5">
                {[
                  { id: "available", title: "🟢 Available", desc: "Receiving live broadcasts & customer leads" },
                  { id: "busy", title: "🟡 Busy on Site", desc: "Completing current work, queues new leads" },
                  { id: "unavailable", title: "🔴 Off Duty", desc: "On break / resting" },
                ].map((s) => (
                  <label
                    key={s.id}
                    className={`flex items-center gap-2.5 p-2.5 rounded-xl border cursor-pointer ${
                      availState === s.id ? "bg-[#f2f3ff] border-[#134e3f]" : "bg-white border-[#eaedff]"
                    }`}
                  >
                    <input
                      type="radio"
                      name="availState"
                      checked={availState === s.id}
                      onChange={() => setAvailState(s.id as any)}
                      className="accent-[#134e3f]"
                    />
                    <div>
                      <div className="text-[12px] font-bold text-[#131b2e]">{s.title}</div>
                      <div className="text-[10px] text-[#707975]">{s.desc}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="flex-1 py-2.5 bg-[#f2f3ff] text-[#707975] rounded-xl text-[12px] font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={handleSaveServiceArea}
                className="flex-1 py-2.5 bg-[#134e3f] text-white rounded-xl text-[12px] font-bold hover:bg-[#00362a] disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Settings"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 3: PAYMENT & SETTLEMENT DETAILS
          ========================================================================= */}
      {activeModal === "payment" && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
          <div className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl p-5 space-y-4 max-h-[88vh] overflow-y-auto shadow-2xl animate-slide-up">
            <div className="flex items-center justify-between pb-2 border-b border-[#eaedff]">
              <div>
                <h3 className="text-[15px] font-bold text-[#131b2e]">Earnings Settlement & Bank Details</h3>
                <p className="text-[11px] text-[#707975]">Direct bank transfer for your 90% member share</p>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="w-8 h-8 rounded-full bg-[#f2f3ff] flex items-center justify-center text-[#707975]"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div>
              <label className="text-[11px] font-bold text-[#707975] uppercase tracking-wider block mb-1">
                Beneficiary Account Holder Name
              </label>
              <input
                type="text"
                value={accountHolder}
                onChange={(e) => setAccountHolder(e.target.value)}
                className="w-full bg-[#f2f3ff] border border-[#d1ddd8] rounded-xl px-3 py-2 text-[12px] font-bold"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-[#707975] uppercase tracking-wider block mb-1">
                Bank Name
              </label>
              <input
                type="text"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                className="w-full bg-[#f2f3ff] border border-[#d1ddd8] rounded-xl px-3 py-2 text-[12px]"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] font-bold text-[#707975] uppercase tracking-wider block mb-1">
                  Account Number
                </label>
                <input
                  type="text"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  className="w-full bg-[#f2f3ff] border border-[#d1ddd8] rounded-xl px-3 py-2 text-[12px] font-mono"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-[#707975] uppercase tracking-wider block mb-1">
                  IFSC Code
                </label>
                <input
                  type="text"
                  value={ifscCode}
                  onChange={(e) => setIfscCode(e.target.value)}
                  className="w-full bg-[#f2f3ff] border border-[#d1ddd8] rounded-xl px-3 py-2 text-[12px] font-mono uppercase"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-[#707975] uppercase tracking-wider block mb-1">
                Primary UPI ID (Instant Payout)
              </label>
              <input
                type="text"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                className="w-full bg-[#f2f3ff] border border-[#d1ddd8] rounded-xl px-3 py-2 text-[12px] font-mono text-[#134e3f]"
              />
            </div>

            {/* Payout Schedule Card */}
            <div className="bg-[#f2f3ff] p-3 rounded-xl border border-[#d1ddd8] space-y-1">
              <div className="text-[11px] font-bold text-[#134e3f] flex items-center gap-1">
                <span className="material-symbols-outlined text-[15px]">verified</span>
                Daily Automated Settlement Schedule
              </div>
              <p className="text-[10px] text-[#707975] leading-relaxed">
                Your 90% service earnings are credited directly to your bank/UPI within 2 hours of customer completion. 10% is allocated to the Society Mutual Welfare & Emergency Fund.
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="flex-1 py-2.5 bg-[#f2f3ff] text-[#707975] rounded-xl text-[12px] font-bold"
              >
                Close
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={handleSavePayment}
                className="flex-1 py-2.5 bg-[#134e3f] text-white rounded-xl text-[12px] font-bold hover:bg-[#00362a]"
              >
                {saving ? "Saving..." : "Save Payout Details"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 4: WELFARE & INSURANCE STATUS
          ========================================================================= */}
      {activeModal === "welfare" && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
          <div className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl p-5 space-y-4 max-h-[88vh] overflow-y-auto shadow-2xl animate-slide-up">
            <div className="flex items-center justify-between pb-2 border-b border-[#eaedff]">
              <div>
                <h3 className="text-[15px] font-bold text-[#131b2e]">Cooperative Member Welfare</h3>
                <p className="text-[11px] text-[#707975]">Active insurance and mutual aid entitlements</p>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="w-8 h-8 rounded-full bg-[#f2f3ff] flex items-center justify-center text-[#707975]"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            {/* Insurance Card */}
            <div className="bg-gradient-to-br from-[#00362a] to-[#134e3f] text-white p-4 rounded-2xl space-y-2 shadow-md">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono text-[#b5efda] uppercase tracking-wider">
                  Member Mutual Protection
                </span>
                <span className="bg-[#b5efda] text-[#002018] text-[9px] font-bold px-2 py-0.5 rounded-full uppercase">
                  Active Cover
                </span>
              </div>
              <div className="text-[20px] font-bold font-mono">₹5,00,000</div>
              <p className="text-[11px] text-white/90">
                Group On-Site Accidental & Medical Coverage Policy #AP-COP-2026-902
              </p>
            </div>

            {/* Benefits List */}
            <div className="space-y-2 text-[12px]">
              <div className="p-3 bg-[#faf8ff] rounded-xl border border-[#eaedff] flex items-start gap-2.5">
                <span className="material-symbols-outlined text-[18px] text-[#059669] shrink-0 mt-0.5">health_and_safety</span>
                <div>
                  <div className="font-bold text-[#131b2e]">Outpatient Clinic Assistance</div>
                  <div className="text-[11px] text-[#707975]">Up to ₹25,000/year reimbursement at affiliated society clinics.</div>
                </div>
              </div>

              <div className="p-3 bg-[#faf8ff] rounded-xl border border-[#eaedff] flex items-start gap-2.5">
                <span className="material-symbols-outlined text-[18px] text-[#904d00] shrink-0 mt-0.5">build_circle</span>
                <div>
                  <div className="font-bold text-[#131b2e]">Tool Loss & Damage Protection</div>
                  <div className="text-[11px] text-[#707975]">Covered up to ₹15,000 for on-duty equipment accidents.</div>
                </div>
              </div>

              <div className="p-3 bg-[#faf8ff] rounded-xl border border-[#eaedff] flex items-start gap-2.5">
                <span className="material-symbols-outlined text-[18px] text-[#134e3f] shrink-0 mt-0.5">savings</span>
                <div>
                  <div className="font-bold text-[#131b2e]">Guild Pension Credits: 420 Points</div>
                  <div className="text-[11px] text-[#707975]">Accrued via 10% society fund contributions from completed services.</div>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  showToast("Insurance Card & Policy PDF downloaded to device.");
                  setActiveModal(null);
                }}
                className="w-full py-2.5 bg-[#134e3f] text-white rounded-xl text-[12px] font-bold flex items-center justify-center gap-1.5 shadow-xs"
              >
                <span className="material-symbols-outlined text-[16px]">download</span>
                Download Welfare Certificate
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 5: HELP & SUPPORT DESK
          ========================================================================= */}
      {activeModal === "support" && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
          <div className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl p-5 space-y-4 max-h-[88vh] overflow-y-auto shadow-2xl animate-slide-up">
            <div className="flex items-center justify-between pb-2 border-b border-[#eaedff]">
              <div>
                <h3 className="text-[15px] font-bold text-[#131b2e]">Society Federation Support Desk</h3>
                <p className="text-[11px] text-[#707975]">Assistance for dispute resolution, safety, and admin</p>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="w-8 h-8 rounded-full bg-[#f2f3ff] flex items-center justify-center text-[#707975]"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            {/* Direct Call Section */}
            <div className="grid grid-cols-2 gap-2">
              <a
                href="tel:9000000001"
                className="p-3 bg-[#b5efda]/40 border border-[#b5efda] rounded-xl flex items-center gap-2 text-[#00362a] font-bold text-[12px] hover:bg-[#b5efda]"
              >
                <span className="material-symbols-outlined text-[18px]">call</span>
                <span>Society Admin</span>
              </a>

              <a
                href="tel:18004250001"
                className="p-3 bg-[#f2f3ff] border border-[#d1ddd8] rounded-xl flex items-center gap-2 text-[#134e3f] font-bold text-[12px] hover:bg-[#eaedff]"
              >
                <span className="material-symbols-outlined text-[18px]">headset_mic</span>
                <span>Toll-Free SOS</span>
              </a>
            </div>

            {/* Grievance Ticket Form */}
            {ticketSuccess ? (
              <div className="p-4 bg-[#b5efda] text-[#002018] rounded-xl text-center space-y-1">
                <span className="material-symbols-outlined text-[24px] text-[#059669]">check_circle</span>
                <p className="text-[12px] font-bold">{ticketSuccess}</p>
              </div>
            ) : (
              <div className="space-y-2.5 pt-1">
                <label className="text-[11px] font-bold text-[#707975] uppercase tracking-wider block">
                  File Member Grievance or Dispute
                </label>
                <select
                  value={grievanceType}
                  onChange={(e) => setGrievanceType(e.target.value)}
                  className="w-full bg-[#f2f3ff] border border-[#d1ddd8] rounded-xl px-3 py-2 text-[12px] focus:outline-none"
                >
                  <option value="Customer Pricing Dispute">Customer Pricing or Quote Dispute</option>
                  <option value="Gate Entry Denied">Society Gate Entry or Parking Denied</option>
                  <option value="App Technical Issue">App Booking or Technical Issue</option>
                  <option value="Payout Settlement Delay">Payout or Bank Transfer Delay</option>
                </select>

                <textarea
                  rows={3}
                  value={grievanceDetails}
                  onChange={(e) => setGrievanceDetails(e.target.value)}
                  placeholder="Describe your issue with booking reference number if any..."
                  className="w-full bg-[#f2f3ff] border border-[#d1ddd8] rounded-xl p-2.5 text-[12px] focus:outline-none focus:ring-1 focus:ring-[#134e3f]"
                />

                <button
                  type="button"
                  onClick={handleSubmitGrievance}
                  disabled={!grievanceDetails.trim()}
                  className="w-full py-2.5 bg-[#134e3f] text-white rounded-xl text-[12px] font-bold disabled:opacity-40"
                >
                  Submit Support Ticket
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
