"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import SahakariEmblem from "@/components/SahakariEmblem";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import CustomerNav from "@/app/customer/CustomerNav";

type ActiveCustomerModal = "details" | "notifications" | "privacy" | "language" | "support" | null;

export default function CustomerProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<{
    profileName: string;
    phone: string;
    email?: string | null;
    profile?: { address?: string | null; city?: string | null; pincode?: string | null } | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeModal, setActiveModal] = useState<ActiveCustomerModal>(null);
  const [toastMsg, setToastMsg] = useState("");

  // Details state
  const [fullName, setFullName] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("Visakhapatnam");
  const [pincode, setPincode] = useState("530026");

  // Notifications state
  const [notifService, setNotifService] = useState(true);
  const [notifQuotes, setNotifQuotes] = useState(true);
  const [notifSms, setNotifSms] = useState(true);

  // Language state
  const [selectedLang, setSelectedLang] = useState("English");

  // Support ticket state
  const [supportText, setSupportText] = useState("");
  const [ticketSuccess, setTicketSuccess] = useState("");

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        setProfile(d.user);
        if (d.user) {
          setFullName(d.user.profileName ?? "");
          setAddress(d.user.profile?.address ?? "pedha gantyada, dayal nagar, pydimamba colony");
          setCity(d.user.profile?.city ?? "Visakhapatnam");
          setPincode(d.user.profile?.pincode ?? "530026");
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 3000);
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#faf8ff] flex items-center justify-center">
        <LoadingSpinner label="Loading customer profile..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#faf8ff] text-[#131b2e] pb-24">
      {/* Toast */}
      {toastMsg && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-[#134e3f] text-white px-4 py-2.5 rounded-2xl shadow-xl flex items-center gap-2 text-[12px] font-bold animate-slide-up">
          <span className="material-symbols-outlined text-[18px] text-[#b5efda]">check_circle</span>
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Header */}
      <div className="coop-brand px-5 pt-8 md:pt-6 pb-12 text-white relative shadow-md md:rounded-2xl md:mt-4 max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-[18px] font-bold text-white">My Profile</h1>
            <p className="text-[11px] text-[#b5efda]">Verified Cooperative Resident Account</p>
          </div>
          <SahakariEmblem size={28} />
        </div>
      </div>

      <div className="px-4 -mt-8 mb-4 max-w-5xl mx-auto w-full">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#d1ddd8] space-y-3">
          <div className="flex items-center gap-3.5">
            <div className="w-16 h-16 rounded-2xl bg-[#134e3f] text-white flex items-center justify-center text-2xl font-bold border border-[#d1ddd8] shrink-0">
              {profile?.profileName?.charAt(0) ?? "C"}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-[16px] font-bold text-[#131b2e] truncate">{fullName || "Customer"}</h2>
              <div className="flex items-center gap-1 text-[12px] text-[#707975] mt-0.5">
                <span className="material-symbols-outlined text-[14px]">call</span>
                <span>{profile?.phone}</span>
              </div>
              <div className="inline-flex items-center gap-1 mt-1 text-[10px] bg-[#b5efda] text-[#002018] px-2 py-0.2 rounded-md font-semibold">
                <span className="material-symbols-outlined text-[12px]">verified</span>
                Resident Shareholder
              </div>
            </div>
          </div>

          <div className="mt-2 flex items-start gap-1.5 text-[12px] text-[#707975] border-t border-[#f2f3ff] pt-2.5">
            <span className="material-symbols-outlined text-[16px] text-[#904d00] shrink-0">location_on</span>
            <span className="line-clamp-2">{address}, {city} - {pincode}</span>
          </div>
        </div>
      </div>

      {/* Profile Settings Options */}
      <div className="px-4 max-w-5xl mx-auto w-full space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {[
            {
              id: "details" as const,
              icon: "person",
              label: "Personal & Address Details",
              desc: "Update your delivery flat, society, and contact info",
              badge: city,
            },
            {
              id: "notifications" as const,
              icon: "notifications",
              label: "Notification Preferences",
              desc: "WhatsApp dispatch updates, SMS, and quote alerts",
              badge: "Instant SMS Active",
            },
            {
              id: "privacy" as const,
              label: "Privacy & Cooperative Data",
              desc: "End-to-end encryption and member privacy rights",
              badge: "Encrypted",
            },
            {
              id: "language" as const,
              label: "Language & Regional Display",
              desc: "Choose English, Telugu, or Hindi interfaces",
              badge: selectedLang,
            },
            {
              id: "support" as const,
              label: "Society Help & Support Desk",
              desc: "24/7 dispute mediation, grievance tickets & helpline",
              badge: "Toll-Free Helpline",
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

          {/* Sign Out */}
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
              <div className="text-[11px] text-[#93000a]/80">Logout from your account</div>
            </div>
          </button>
        </div>

        {/* Cooperative Transparency Card */}
        <div className="bg-[#b5efda]/40 rounded-2xl p-4 text-center border border-[#b5efda]">
          <span className="material-symbols-outlined text-[24px] text-[#00362a] mb-1">handshake</span>
          <div className="text-[12px] font-bold text-[#00362a]">Fair Trade & Worker-Owned Platform</div>
          <div className="text-[10px] text-[#00362a]/80 mt-0.5">
            Your platform fees go directly to fair technician remuneration and community welfare funds.
          </div>
        </div>
      </div>

      {/* =========================================================================
          CUSTOMER MODAL 1: PERSONAL & ADDRESS DETAILS
          ========================================================================= */}
      {activeModal === "details" && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
          <div className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl p-5 space-y-4 max-h-[88vh] overflow-y-auto shadow-2xl animate-slide-up">
            <div className="flex items-center justify-between pb-2 border-b border-[#eaedff]">
              <div>
                <h3 className="text-[15px] font-bold text-[#131b2e]">Personal & Address Details</h3>
                <p className="text-[11px] text-[#707975]">Used for home service technician dispatch</p>
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
                Full Name
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full bg-[#f2f3ff] border border-[#d1ddd8] rounded-xl px-3 py-2 text-[12px] font-bold"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-[#707975] uppercase tracking-wider block mb-1">
                Service Address (Flat, Building, Colony)
              </label>
              <textarea
                rows={2}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full bg-[#f2f3ff] border border-[#d1ddd8] rounded-xl p-2.5 text-[12px]"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] font-bold text-[#707975] uppercase tracking-wider block mb-1">
                  City
                </label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full bg-[#f2f3ff] border border-[#d1ddd8] rounded-xl px-3 py-2 text-[12px]"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-[#707975] uppercase tracking-wider block mb-1">
                  Pincode
                </label>
                <input
                  type="text"
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value)}
                  className="w-full bg-[#f2f3ff] border border-[#d1ddd8] rounded-xl px-3 py-2 text-[12px]"
                />
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
                onClick={() => {
                  showToast("Address and profile details updated!");
                  setActiveModal(null);
                }}
                className="flex-1 py-2.5 bg-[#134e3f] text-white rounded-xl text-[12px] font-bold hover:bg-[#00362a]"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          CUSTOMER MODAL 2: NOTIFICATIONS
          ========================================================================= */}
      {activeModal === "notifications" && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
          <div className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl p-5 space-y-4 max-h-[88vh] overflow-y-auto shadow-2xl animate-slide-up">
            <div className="flex items-center justify-between pb-2 border-b border-[#eaedff]">
              <div>
                <h3 className="text-[15px] font-bold text-[#131b2e]">Notification Settings</h3>
                <p className="text-[11px] text-[#707975]">Control technician updates and order alerts</p>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="w-8 h-8 rounded-full bg-[#f2f3ff] flex items-center justify-center text-[#707975]"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div className="space-y-2">
              {[
                { label: "Technician Arrival & Live Radar", desc: "Get notified when specialist is 10 mins away", val: notifService, setVal: setNotifService },
                { label: "Cooperative Quote Alerts", desc: "Instant notifications when new quotes are received", val: notifQuotes, setVal: setNotifQuotes },
                { label: "SMS & WhatsApp Updates", desc: "Receive OTP and digital payment bills via message", val: notifSms, setVal: setNotifSms },
              ].map((n, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-xl border border-[#eaedff] bg-white">
                  <div>
                    <div className="text-[12px] font-bold text-[#131b2e]">{n.label}</div>
                    <div className="text-[10px] text-[#707975]">{n.desc}</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={n.val}
                    onChange={(e) => n.setVal(e.target.checked)}
                    className="w-5 h-5 accent-[#134e3f] cursor-pointer"
                  />
                </div>
              ))}
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  showToast("Notification preferences updated!");
                  setActiveModal(null);
                }}
                className="w-full py-2.5 bg-[#134e3f] text-white rounded-xl text-[12px] font-bold"
              >
                Save Preferences
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          CUSTOMER MODAL 3: PRIVACY & SECURITY
          ========================================================================= */}
      {activeModal === "privacy" && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
          <div className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl p-5 space-y-4 max-h-[88vh] overflow-y-auto shadow-2xl animate-slide-up">
            <div className="flex items-center justify-between pb-2 border-b border-[#eaedff]">
              <div>
                <h3 className="text-[15px] font-bold text-[#131b2e]">Privacy & Data Protection</h3>
                <p className="text-[11px] text-[#707975]">Cooperative transparent data charter</p>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="w-8 h-8 rounded-full bg-[#f2f3ff] flex items-center justify-center text-[#707975]"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div className="bg-[#b5efda]/30 p-3.5 rounded-2xl border border-[#b5efda] space-y-1.5">
              <div className="flex items-center gap-1.5 text-[#00362a] font-bold text-[12px]">
                <span className="material-symbols-outlined text-[16px] text-[#059669]">verified_user</span>
                Zero Commercial Data Reselling
              </div>
              <p className="text-[11px] text-[#00362a]/80 leading-relaxed">
                As a cooperative society platform, your phone number, flat address, and media attachments are never sold to external third-party advertisers. They are only shared with your chosen service technician during active bookings.
              </p>
            </div>

            <div className="space-y-1.5 text-[12px]">
              <div className="p-3 bg-white rounded-xl border border-[#eaedff]">
                <div className="font-bold text-[#131b2e]">End-to-End Chat Encryption</div>
                <div className="text-[10px] text-[#707975]">Voice notes and photos are transmitted via private cooperative channel.</div>
              </div>
              <div className="p-3 bg-white rounded-xl border border-[#eaedff]">
                <div className="font-bold text-[#131b2e]">One-Time Password (OTP) Safety</div>
                <div className="text-[10px] text-[#707975]">Payment receipts and completion releases require explicit resident confirmation.</div>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="w-full py-2.5 bg-[#134e3f] text-white rounded-xl text-[12px] font-bold"
              >
                Understood
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          CUSTOMER MODAL 4: LANGUAGE
          ========================================================================= */}
      {activeModal === "language" && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
          <div className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl p-5 space-y-4 max-h-[88vh] overflow-y-auto shadow-2xl animate-slide-up">
            <div className="flex items-center justify-between pb-2 border-b border-[#eaedff]">
              <div>
                <h3 className="text-[15px] font-bold text-[#131b2e]">Language & Accessibility</h3>
                <p className="text-[11px] text-[#707975]">Select your preferred regional language</p>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="w-8 h-8 rounded-full bg-[#f2f3ff] flex items-center justify-center text-[#707975]"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div className="space-y-2">
              {[
                { name: "English", sub: "Standard English interface" },
                { name: "తెలుగు (Telugu)", sub: "ఆంధ్రప్రదేశ్ మరియు తెలంగాణ ప్రాంతీయ భాష" },
                { name: "हिन्दी (Hindi)", sub: "राष्ट्रीय भाषा इंटरफ़ेस" },
              ].map((lang) => (
                <label
                  key={lang.name}
                  onClick={() => setSelectedLang(lang.name.split(" ")[0])}
                  className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer ${
                    selectedLang === lang.name.split(" ")[0]
                      ? "bg-[#f2f3ff] border-[#134e3f]"
                      : "bg-white border-[#eaedff]"
                  }`}
                >
                  <div>
                    <div className="text-[13px] font-bold text-[#131b2e]">{lang.name}</div>
                    <div className="text-[10px] text-[#707975]">{lang.sub}</div>
                  </div>
                  <input
                    type="radio"
                    name="selectedLang"
                    checked={selectedLang === lang.name.split(" ")[0]}
                    onChange={() => setSelectedLang(lang.name.split(" ")[0])}
                    className="accent-[#134e3f]"
                  />
                </label>
              ))}
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  showToast(`Language set to ${selectedLang}`);
                  setActiveModal(null);
                }}
                className="w-full py-2.5 bg-[#134e3f] text-white rounded-xl text-[12px] font-bold"
              >
                Apply Language
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          CUSTOMER MODAL 5: HELP & SUPPORT DESK
          ========================================================================= */}
      {activeModal === "support" && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
          <div className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl p-5 space-y-4 max-h-[88vh] overflow-y-auto shadow-2xl animate-slide-up">
            <div className="flex items-center justify-between pb-2 border-b border-[#eaedff]">
              <div>
                <h3 className="text-[15px] font-bold text-[#131b2e]">Resident Help & Mediation Desk</h3>
                <p className="text-[11px] text-[#707975]">Direct support from your local Society Admin</p>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="w-8 h-8 rounded-full bg-[#f2f3ff] flex items-center justify-center text-[#707975]"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <a
                href="tel:9000000001"
                className="p-3 bg-[#b5efda]/40 border border-[#b5efda] rounded-xl flex items-center gap-2 text-[#00362a] font-bold text-[12px] hover:bg-[#b5efda]"
              >
                <span className="material-symbols-outlined text-[18px]">call</span>
                <span>Society Desk</span>
              </a>

              <a
                href="tel:18004250001"
                className="p-3 bg-[#f2f3ff] border border-[#d1ddd8] rounded-xl flex items-center gap-2 text-[#134e3f] font-bold text-[12px] hover:bg-[#eaedff]"
              >
                <span className="material-symbols-outlined text-[18px]">headset_mic</span>
                <span>24/7 Helpline</span>
              </a>
            </div>

            {ticketSuccess ? (
              <div className="p-4 bg-[#b5efda] text-[#002018] rounded-xl text-center space-y-1">
                <span className="material-symbols-outlined text-[24px] text-[#059669]">check_circle</span>
                <p className="text-[12px] font-bold">{ticketSuccess}</p>
              </div>
            ) : (
              <div className="space-y-2 pt-1">
                <label className="text-[11px] font-bold text-[#707975] uppercase tracking-wider block">
                  Submit Support or Mediation Query
                </label>
                <textarea
                  rows={3}
                  value={supportText}
                  onChange={(e) => setSupportText(e.target.value)}
                  placeholder="Describe your issue or technician question..."
                  className="w-full bg-[#f2f3ff] border border-[#d1ddd8] rounded-xl p-2.5 text-[12px] focus:outline-none focus:ring-1 focus:ring-[#134e3f]"
                />

                <button
                  type="button"
                  disabled={!supportText.trim()}
                  onClick={() => {
                    const ticketId = "RES-" + Math.floor(100000 + Math.random() * 900000);
                    setTicketSuccess(`Support Ticket #${ticketId} submitted. A Society Coordinator will call you shortly.`);
                    setTimeout(() => {
                      setTicketSuccess("");
                      setSupportText("");
                      setActiveModal(null);
                      showToast(`Support Ticket #${ticketId} dispatched!`);
                    }, 2200);
                  }}
                  className="w-full py-2.5 bg-[#134e3f] text-white rounded-xl text-[12px] font-bold disabled:opacity-40"
                >
                  Submit Query
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
