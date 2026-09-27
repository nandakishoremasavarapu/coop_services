"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import SahakariEmblem from "@/components/SahakariEmblem";
import { ServiceCategory } from "@/lib/types";

interface CustomerHomeClientProps {
  userId: string;
}

// 8 primary guilds shown on the trade wheel
const DEFAULT_TRADES = [
  { name: "Electrical Services", icon: "bolt", workers: 48, avgTime: "8 mins", quote: "₹149 Base" },
  { name: "Plumbing Services", icon: "plumbing", workers: 34, avgTime: "6 mins", quote: "₹129 Base" },
  { name: "Carpentry Services", icon: "carpenter", workers: 29, avgTime: "12 mins", quote: "₹199 Base" },
  { name: "Painting Services", icon: "format_paint", workers: 21, avgTime: "15 mins", quote: "₹249 Base" },
  { name: "Cleaning Services", icon: "cleaning_services", workers: 56, avgTime: "5 mins", quote: "₹179 Base" },
  { name: "Masonry & Construction", icon: "construction", workers: 19, avgTime: "20 mins", quote: "₹349 Base" },
  { name: "AC & Cooling Services", icon: "mode_fan", workers: 42, avgTime: "9 mins", quote: "₹299 Base" },
  { name: "Technical & Appliance", icon: "home_repair_service", workers: 31, avgTime: "10 mins", quote: "₹199 Base" },
];

// Coordinate offsets for 8 nodes (Radius = 120px)
const NODE_OFFSETS = [
  { x: 0, y: -120 },    // Top: 0
  { x: 85, y: -85 },   // Top-Right: 1
  { x: 120, y: 0 },    // Right: 2
  { x: 85, y: 85 },    // Bottom-Right: 3
  { x: 0, y: 120 },    // Bottom: 4
  { x: -85, y: 85 },   // Bottom-Left: 5
  { x: -120, y: 0 },   // Left: 6
  { x: -85, y: -85 },  // Top-Left: 7
];

export default function CustomerHomeClient({ userId }: CustomerHomeClientProps) {
  const router = useRouter();
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [selectedTradeIndex, setSelectedTradeIndex] = useState(0);
  const [isBouncing, setIsBouncing] = useState(false);
  const [isEmergency, setIsEmergency] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [profileName, setProfileName] = useState("Citizen Member");
  const [activeBooking, setActiveBooking] = useState<any>(null);

  const fetchCategories = async () => {
    try {
      const res = await fetch("/api/services/categories");
      const data = await res.json();
      if (data.categories?.length > 0) {
        setCategories(data.categories);
      }
    } catch (e) {
      console.error("Failed to fetch categories", e);
    }
  };

  const fetchProfile = async () => {
    try {
      const res = await fetch("/api/auth/me");
      const data = await res.json();
      if (data.user?.profileName) {
        setProfileName(data.user.profileName);
      }
    } catch {}
  };

  const fetchActiveBooking = async () => {
    try {
      const res = await fetch("/api/bookings?role=customer");
      const data = await res.json();
      if (data.bookings && data.bookings.length > 0) {
        // Look for active in-progress booking
        const active = data.bookings.find(
          (b: any) => !["completed", "cancelled", "paid", "rated"].includes(b.booking.status)
        );
        if (active) setActiveBooking(active);
      }
    } catch {}
  };

  useEffect(() => {
    fetchCategories();
    fetchProfile();
    fetchActiveBooking();
  }, []);

  const handleSelectTrade = (index: number) => {
    setIsBouncing(true);
    setSelectedTradeIndex(index);
    setTimeout(() => setIsBouncing(false), 200);
  };

  const activeTrade = DEFAULT_TRADES[selectedTradeIndex];

  // Match active trade with backend category
  const matchedCategory = categories.find((c) =>
    c.name.toLowerCase().includes(activeTrade.name.toLowerCase().split(" ")[0])
  );

  const handleExploreService = () => {
    const catId = matchedCategory ? matchedCategory.id : "";
    const catName = matchedCategory ? matchedCategory.name : activeTrade.name;
    const url = `/customer/book?categoryId=${catId}&categoryName=${encodeURIComponent(catName)}${
      isEmergency ? "&emergency=true" : ""
    }`;
    router.push(url);
  };

  return (
    <div className="min-h-screen bg-surface font-body text-on-surface antialiased flex flex-col pb-24">
      {/* Fixed Civic Header (Visible on Mobile only, since Desktop TopNav handles desktop) */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-40 bg-white/90 backdrop-blur-xl border-b border-[#d1ddd8] shadow-[0_1px_8px_rgba(0,0,0,0.04)] pt-safe">
        <div className="h-16 max-w-md mx-auto px-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <SahakariEmblem size={32} />
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1">
                <span className="font-mono text-[10px] font-bold text-[#134e3f] uppercase tracking-wider">
                  Shram setu
                </span>
                <span className="bg-[#b5efda] text-[#002018] font-mono text-[9px] px-1.5 py-0.2 rounded font-bold uppercase">
                  Co-op
                </span>
              </div>
              <button
                type="button"
                className="flex items-center gap-0.5 text-left group"
                onClick={() => router.push("/customer/profile")}
              >
                <span className="material-symbols-outlined text-[#904d00] text-[15px]">location_on</span>
                <span className="text-[12px] font-semibold text-on-surface truncate group-hover:text-[#134e3f]">
                  Indiranagar, Bengaluru
                </span>
                <span className="material-symbols-outlined text-[#707975] text-[14px]">expand_more</span>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              aria-label="Notifications"
              onClick={() => router.push("/customer/notifications")}
              className="w-10 h-10 relative flex items-center justify-center rounded-full text-on-surface hover:bg-[#f2f3ff] transition-colors"
            >
              <span className="material-symbols-outlined text-[22px]">notifications</span>
              <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#904d00] ring-2 ring-white"></span>
            </button>

            <button
              type="button"
              onClick={() => router.push("/customer/profile")}
              className="w-9 h-9 rounded-full overflow-hidden border border-[#d1ddd8] shrink-0 bg-[#e2e7ff] flex items-center justify-center font-bold text-[#134e3f] text-[13px]"
            >
              {profileName.charAt(0)}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area: Responsive Container & 2-column Grid */}
      <main className="flex-1 flex flex-col w-full max-w-md md:max-w-6xl lg:max-w-7xl mx-auto px-4 sm:px-6 pt-20 md:pt-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column on Desktop (Col 7): Search, Emergency Banner, Service Wheel */}
          <div className="lg:col-span-7 space-y-4">
            {/* Society Status Micro-Bar */}
            <div className="py-2.5 px-3.5 rounded-xl bg-[#f2f3ff] border border-[#d1ddd8] flex items-center justify-between shadow-2xs">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="w-2 h-2 rounded-full bg-[#059669] animate-pulse shrink-0"></span>
                <p className="font-mono text-[11px] text-on-surface-variant truncate">
                  Bangalore East Labour Co-op Society <strong className="text-[#134e3f]">#14</strong>
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0 bg-[#eaedff] px-2 py-0.5 rounded-full">
                <span className="material-symbols-outlined text-[#904d00] text-[13px]">verified</span>
                <span className="text-[10px] text-[#904d00] font-bold">Federation Certified</span>
              </div>
            </div>

            {/* Emergency Dispatch Toggle Banner */}
            <div className="relative overflow-hidden bg-[#ffdcc3] text-[#2f1500] rounded-2xl p-4 shadow-sm border border-[#fe932c]/40">
              <div className="flex items-center justify-between gap-3 relative z-10">
                <div className="flex items-start gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-[#fe932c] text-[#663500] flex items-center justify-center shrink-0 shadow-xs">
                    <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                      bolt
                    </span>
                  </div>
                  <div className="min-w-0">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-[#904d00]">Immediate Dispatch</div>
                    <h2 className="text-[13px] font-bold text-[#2f1500] leading-tight">Urgent Cooperative Response</h2>
                    <p className="text-[11px] text-[#6e3900] mt-0.5 truncate">Verified technician on-site within 30-45 mins</p>
                  </div>
                </div>

                <button
                  type="button"
                  role="switch"
                  aria-checked={isEmergency}
                  onClick={() => setIsEmergency(!isEmergency)}
                  className={`w-12 h-6.5 rounded-full p-0.5 transition-colors relative shrink-0 focus:outline-none ${
                    isEmergency ? "bg-[#904d00]" : "bg-[#bfc9c3]"
                  }`}
                >
                  <span
                    className={`w-5.5 h-5.5 rounded-full bg-white shadow-md block transition-transform duration-200 ${
                      isEmergency ? "translate-x-5.5" : "translate-x-0"
                    }`}
                  ></span>
                </button>
              </div>
            </div>

            {/* Smart Search Bar */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-on-surface-variant">
                <span className="material-symbols-outlined text-[20px]">search</span>
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    router.push(`/customer/book?search=${encodeURIComponent(searchQuery)}`);
                  }
                }}
                placeholder="Search repairs, deep cleaning, wiring, carpentry..."
                className="w-full h-11 pl-10 pr-11 rounded-xl bg-white border border-[#d1ddd8] text-on-surface text-[13px] placeholder:text-[#707975] focus:outline-none focus:border-[#134e3f] focus:ring-2 focus:ring-[#134e3f]/20 shadow-xs transition-all"
              />
              <button
                type="button"
                aria-label="Filter"
                onClick={() => router.push("/customer/book")}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#134e3f] hover:text-[#00362a]"
              >
                <span className="material-symbols-outlined text-[20px]">tune</span>
              </button>
            </div>

            {/* Interactive Circular Service Wheel Section */}
            <section aria-label="Democratic Service Wheel" className="civic-card p-5 flex flex-col items-center select-none overflow-hidden relative shadow-xs">
              <div className="w-full flex items-center justify-between mb-1 z-10">
                <div>
                  <span className="font-mono text-[10px] uppercase tracking-wider text-[#134e3f] font-bold">
                    Trade Collective
                  </span>
                  <h2 className="text-[16px] font-bold text-on-surface">Explore Craft Guilds</h2>
                </div>
                <div className="flex items-center gap-1 text-on-surface-variant bg-[#f2f3ff] px-2.5 py-0.5 rounded-full">
                  <span className="material-symbols-outlined text-[14px] text-[#904d00]">touch_app</span>
                  <span className="text-[10px] font-semibold text-[#904d00]">Tap node to switch</span>
                </div>
              </div>

              {/* Wheel Container (310px x 310px) */}
              <div className="relative w-[300px] h-[300px] my-2 flex items-center justify-center">
                {/* SVG Orbit Ring */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 300 300">
                  <circle
                    cx="150"
                    cy="150"
                    r="120"
                    fill="none"
                    stroke="#dae2fd"
                    strokeWidth="1.5"
                    strokeDasharray="4 4"
                  />
                  <circle
                    cx="150"
                    cy="150"
                    r="120"
                    fill="none"
                    stroke="#fe932c"
                    strokeWidth="1.5"
                    strokeOpacity="0.3"
                  />
                </svg>

                {/* Orbiting Service Nodes (8 nodes) */}
                {DEFAULT_TRADES.map((trade, idx) => {
                  const offset = NODE_OFFSETS[idx];
                  const isSelected = selectedTradeIndex === idx;
                  return (
                    <button
                      key={trade.name}
                      type="button"
                      onClick={() => handleSelectTrade(idx)}
                      className={`absolute w-11 h-11 rounded-full -translate-x-1/2 -translate-y-1/2 shadow-sm flex flex-col items-center justify-center transition-all duration-200 active:scale-90 ${
                        isSelected
                          ? "bg-[#134e3f] text-white ring-3 ring-[#85f8c4] z-30 scale-110 shadow-md"
                          : "bg-white text-on-surface border border-[#d1ddd8] hover:bg-[#e2e7ff] z-20"
                      }`}
                      style={{
                        left: `calc(50% + ${offset.x}px)`,
                        top: `calc(50% + ${offset.y}px)`,
                      }}
                      title={trade.name}
                    >
                      <span className="material-symbols-outlined text-[19px]">{trade.icon}</span>
                    </button>
                  );
                })}

                {/* Central Hub */}
                <div
                  id="centralHub"
                  className={`relative z-20 w-[172px] h-[172px] rounded-full bg-white border-2 border-[#d1ddd8] shadow-lg flex flex-col items-center justify-center p-3 text-center transition-transform duration-200 ${
                    isBouncing ? "scale-95" : "scale-100"
                  }`}
                >
                  <div className="w-10 h-10 rounded-full bg-[#134e3f] text-white flex items-center justify-center shadow-xs mb-1">
                    <span className="material-symbols-outlined text-[22px]">{activeTrade.icon}</span>
                  </div>

                  <div className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-[#ffdcc3] mb-1">
                    <span className="material-symbols-outlined text-[11px] text-[#904d00]">verified</span>
                    <span className="text-[9px] font-bold text-[#904d00] uppercase tracking-wider">Union Certified</span>
                  </div>

                  <h3 className="text-[13px] font-bold text-on-surface leading-tight px-1 truncate w-full">
                    {activeTrade.name}
                  </h3>

                  <span className="font-mono text-[10px] text-[#134e3f] font-semibold mt-0.5">
                    {activeTrade.workers} Specialists on duty
                  </span>

                  <span className="text-[9px] text-on-surface-variant">
                    Avg quote: {activeTrade.avgTime}
                  </span>
                </div>
              </div>

              {/* Action CTA directly below wheel */}
              <button
                type="button"
                onClick={handleExploreService}
                className="w-full mt-2 h-11 rounded-xl bg-[#134e3f] text-white text-[13px] font-bold flex items-center justify-center gap-2 shadow-md hover:bg-[#00362a] active:scale-[0.99] transition-all"
              >
                <span className="material-symbols-outlined text-[18px]">engineering</span>
                <span>Explore {activeTrade.name}</span>
              </button>
            </section>
          </div>

          {/* Right Column on Desktop (Col 5): Active Tracker, Society Charter & Helpline */}
          <div className="lg:col-span-5 space-y-4">
            {/* Active Order Preview Card */}
            <div className="civic-card p-4 shadow-sm border border-[#d1ddd8] bg-white rounded-2xl">
              <div className="flex items-center justify-between mb-2.5">
                <div className="flex items-center gap-1.5">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#904d00] opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#904d00]"></span>
                  </span>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#904d00]">
                    {activeBooking ? "Active Engagement" : "Featured Engagement"}
                  </span>
                </div>
                <span className="font-mono text-[10px] text-on-surface-variant bg-[#f2f3ff] px-2 py-0.5 rounded border border-[#d1ddd8]">
                  {activeBooking ? `#BK-${activeBooking.booking.id.slice(0, 6).toUpperCase()}` : "#BK-8492"}
                </span>
              </div>

              <div
                className="flex items-center gap-3 cursor-pointer"
                onClick={() => {
                  if (activeBooking) {
                    router.push(`/customer/orders/${activeBooking.booking.id}`);
                  } else {
                    router.push("/customer/orders");
                  }
                }}
              >
                <div className="w-12 h-12 rounded-xl bg-[#134e3f] text-white flex items-center justify-center font-bold text-lg shrink-0">
                  <span className="material-symbols-outlined text-[24px]">build</span>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-[13px] font-bold text-on-surface truncate">
                    {activeBooking ? activeBooking.booking.serviceDescription : "Switchboard & Wiring Diagnostics"}
                  </h3>
                  <p className="text-[11px] text-on-surface-variant truncate">
                    {activeBooking
                      ? `Status: ${activeBooking.booking.status.replace(/_/g, " ")}`
                      : "Worker: Ramesh Gowda • Senior Wireman"}
                  </p>
                </div>
                <button
                  type="button"
                  className="w-8 h-8 rounded-lg bg-[#f2f3ff] flex items-center justify-center text-[#904d00] shrink-0 hover:bg-[#eaedff]"
                >
                  <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                </button>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-[#eaedff] rounded-full h-1.5 mt-3 overflow-hidden">
                <div className="bg-[#904d00] h-full rounded-full w-2/3"></div>
              </div>
              <div className="flex items-center justify-between text-[10px] text-on-surface-variant font-mono mt-1.5">
                <span>Step 2 of 3: Diagnosing Subpanel</span>
                <span className="text-[#904d00] font-bold">ETA 25m</span>
              </div>
            </div>

            {/* Cooperative Guarantee Micro-Strip */}
            <div className="w-full bg-[#f2f3ff] text-on-surface-variant border border-[#d1ddd8] rounded-2xl p-4 shadow-xs">
              <div className="flex items-center gap-1.5 text-[#134e3f] mb-1.5">
                <span className="material-symbols-outlined text-[18px]">shield_with_heart</span>
                <span className="text-[11px] font-bold uppercase tracking-wider">Democratic Cooperative Charter</span>
              </div>
              <p className="text-[11px] text-on-surface-variant leading-relaxed">
                Direct fair wages to certified local workers <span className="text-[#904d00] font-bold">•</span> 0% predatory markups <span className="text-[#904d00] font-bold">•</span> Milestone-locked escrow protection.
              </p>
              <div className="grid grid-cols-3 gap-2 pt-3 text-center">
                <div className="bg-white p-2 rounded-xl border border-[#d1ddd8]">
                  <span className="material-symbols-outlined text-[#904d00] text-[18px]">handshake</span>
                  <div className="text-[10px] font-bold text-on-surface mt-0.5">100% Direct Pay</div>
                </div>
                <div className="bg-white p-2 rounded-xl border border-[#d1ddd8]">
                  <span className="material-symbols-outlined text-[#904d00] text-[18px]">verified</span>
                  <div className="text-[10px] font-bold text-on-surface mt-0.5">Union Insured</div>
                </div>
                <div className="bg-white p-2 rounded-xl border border-[#d1ddd8]">
                  <span className="material-symbols-outlined text-[#904d00] text-[18px]">lock_clock</span>
                  <div className="text-[10px] font-bold text-on-surface mt-0.5">Escrow Safety</div>
                </div>
              </div>
            </div>

            {/* Federation Society Customer Helpline Card */}
            <div className="bg-white border border-[#d1ddd8] rounded-2xl p-4 shadow-xs flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#ffdcc3] text-[#904d00] flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[20px]">support_agent</span>
                </div>
                <div>
                  <h4 className="text-[13px] font-bold text-[#131b2e]">Society Helpline</h4>
                  <p className="text-[11px] text-[#707975]">Direct desk at Bangalore East #14</p>
                </div>
              </div>
              <a
                href="tel:1800123456"
                className="px-3 py-1.5 bg-[#134e3f] text-white rounded-xl text-[11px] font-bold hover:bg-[#00362a] transition-colors"
              >
                Call Desk
              </a>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
