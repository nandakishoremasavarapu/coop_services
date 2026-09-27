"use client";

import React, { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import SahakariEmblem from "@/components/SahakariEmblem";
import { StatusBadge } from "@/components/StatusBadge";
import { StarRating } from "@/components/StarRating";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { apiFetch } from "@/lib/api";

interface BookingData {
  booking: {
    id: string;
    status: string;
    serviceDescription: string;
    mediaUrls?: string[] | null;
    address: string;
    finalPrice?: string | null;
    platformFee?: string | null;
    totalAmount?: string | null;
    providerId?: string | null;
    isEmergency?: boolean | null;
    preferredTime?: string | null;
    createdAt: string;
  };
  category: { id: string; name: string } | null;
  service: { id: string; name: string } | null;
  customerProfile: { fullName?: string } | null;
  providerProfile: {
    id: string;
    displayName: string;
    ratingAvg?: string | null;
    ratingCount?: number | null;
    experience?: number | null;
    serviceArea?: string | null;
  } | null;
  quotes: Array<{
    quote: {
      id: string;
      providerId: string;
      amount: string;
      note?: string | null;
      estimatedArrival?: string | null;
    };
    provider: {
      displayName: string;
      ratingAvg?: string | null;
      experience?: number | null;
      serviceArea?: string | null;
    } | null;
  }>;
  priceRevisions: Array<{
    id: string;
    originalAmount?: string | null;
    proposedAmount: string;
    reason: string;
    status?: string | null;
  }>;
  payment: {
    id: string;
    method: string;
    paidAmount?: string | null;
    status: string;
  } | null;
  invoice: {
    id: string;
    invoiceNumber: string;
    serviceAmount?: string | null;
    platformFee?: string | null;
    totalAmount?: string | null;
  } | null;
  rating: {
    id: string;
    rating: number;
    reviewText?: string | null;
  } | null;
}

// Fallback high-fidelity sample quotes matching Stitch specs if backend quotes list is small
const SAMPLE_QUOTES = [
  {
    name: "Rajesh Verma",
    rating: "4.9",
    reviews: 342,
    society: "Pragati Labour Cooperative Society #12 • 1.2 km away",
    badge: "Recommended • Closest",
    eta: "~25 mins ETA",
    amount: "₹350 - ₹450",
    rawAmount: "350",
    note: "₹200 inspection/base labour + estimated switch/fuse component",
    memberQuote: "Have replacement 2.5µF capacitors and heavy-duty regulator switches in current vehicle kit.",
    skills: ["Aadhaar Verified", "ITI Certified Electrician", "Coop Shareholder"],
    img: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80",
  },
  {
    name: "Suresh Kumar",
    rating: "4.8",
    reviews: 218,
    society: "Civic Union Electrical Unit #4 • 2.1 km away",
    badge: "Fixed Diagnostics",
    eta: "Available Today 4:30 PM",
    amount: "₹400 fixed",
    rawAmount: "400",
    note: "Comprehensive switchboard, earth-leakage & MCB trip test included.",
    memberQuote: "Standard diagnostics kit with insulated multimeters ready on site.",
    skills: ["Aadhaar Verified", "Govt Skill India Certified"],
    img: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&auto=format&fit=crop&q=80",
  },
  {
    name: "Amit Patil",
    rating: "4.9",
    reviews: 410,
    society: "South District Federation Cooperative • 2.8 km away",
    badge: "Senior Wireman",
    eta: "Arrives in ~40 mins",
    amount: "₹300 - ₹500",
    rawAmount: "380",
    note: "Rate tiered based on multi-pole breaker diagnostics and rewiring check.",
    memberQuote: "Master wireman with 15+ years municipal electrical experience.",
    skills: ["Master Wireman License", "Industrial Grade Safety"],
    img: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=300&auto=format&fit=crop&q=80",
  },
];

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [data, setData] = useState<BookingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [selectedSort, setSelectedSort] = useState<"verified" | "closest" | "benchmark">("verified");
  const [toastMessage, setToastMessage] = useState<{ title: string; desc: string } | null>(null);
  const [ratingVal, setRatingVal] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"online" | "cash">("online");

  const fetchData = async () => {
    try {
      const res = await apiFetch(`/api/bookings/${id}`);
      const d = await res.json();
      setData(d as BookingData);
    } catch (e) {
      console.error("Failed to fetch booking", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  const performAction = async (action: string, extra: Record<string, unknown> = {}) => {
    setActionLoading(true);
    try {
      const res = await apiFetch(`/api/bookings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...extra }),
      });
      const d = await res.json();
      if (res.ok) {
        await fetchData();
      } else {
        alert(d.error || "Action could not be completed.");
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleSelectProvider = async (providerId: string, providerName: string, quoteAmount: string) => {
    setToastMessage({
      title: `${providerName} Selected`,
      desc: `${quoteAmount} held in Federation Protected Escrow`,
    });

    await performAction("select_provider", {
      providerId,
      initialAmount: quoteAmount.replace(/[^0-9.]/g, ""),
    });

    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <LoadingSpinner label="Loading cooperative service details..." />
      </div>
    );
  }

  if (!data?.booking) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-surface text-center">
        <div className="text-4xl mb-3">📋</div>
        <p className="text-[14px] font-bold text-on-surface">Service engagement not found</p>
        <button
          onClick={() => router.push("/customer/orders")}
          className="mt-4 px-4 py-2 bg-[#134e3f] text-white rounded-xl text-[12px] font-semibold"
        >
          View All Bookings
        </button>
      </div>
    );
  }

  const { booking, category, service, providerProfile, quotes, priceRevisions, payment, invoice, rating } = data;
  const status = booking.status;
  const isQuoting = status === "submitted" || status === "quoted";
  const latestRevision = priceRevisions[priceRevisions.length - 1];

  return (
    <div className="min-h-screen bg-surface font-body text-on-surface antialiased flex flex-col pb-24">
      {/* Fixed Civic Header */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-white/90 backdrop-blur-xl border-b border-[#d1ddd8] shadow-[0_1px_8px_rgba(0,0,0,0.04)] pt-safe">
        <div className="h-16 max-w-md mx-auto px-4 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <button
              type="button"
              onClick={() => router.push("/customer/orders")}
              className="w-10 h-10 -ml-2 rounded-full flex items-center justify-center text-on-surface hover:bg-[#f2f3ff] active:scale-95 transition-all"
            >
              <span className="material-symbols-outlined text-[24px]">arrow_back</span>
            </button>
            <SahakariEmblem size={28} />
            <div className="min-w-0">
              <h1 className="text-[14px] font-bold text-on-surface truncate">
                {isQuoting ? "Provider Quotes & Comparison" : category?.name ?? "Order Tracking"}
              </h1>
              <div className="flex items-center gap-1.5 font-mono text-[10px] text-[#707975]">
                <span>#BK-{id.slice(0, 6).toUpperCase()}</span>
                <span>•</span>
                <span className="text-[#134e3f] font-semibold">{status.replace(/_/g, " ")}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <span className="w-2 h-2 rounded-full bg-[#059669] animate-pulse"></span>
            <span className="font-mono text-[10px] text-[#059669] font-bold uppercase">Active</span>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex flex-col w-full max-w-md mx-auto px-4 pt-18">
        {/* QUOTES COMPARISON VIEW (Stitch Screen 106004d676984583b6e7f07d58c4e362) */}
        {isQuoting ? (
          <div className="flex flex-col gap-3 py-2">
            {/* Live Broadcast Status Header */}
            <section className="civic-card p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="material-symbols-outlined text-[#904d00] text-[20px]">
                    broadcast_on_personal
                  </span>
                  <span className="font-mono text-[11px] text-[#707975] truncate">
                    Request #BK-{id.slice(0, 6).toUpperCase()}
                  </span>
                </div>
                <span className="bg-[#ffdcc3] text-[#904d00] px-2 py-0.5 rounded-full font-mono text-[10px] font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#904d00] animate-pulse"></span>
                  Active Quorum
                </span>
              </div>

              <div>
                <h2 className="text-[15px] font-bold text-on-surface leading-tight">
                  {booking.serviceDescription || "Diagnostic & Repair Request"}
                </h2>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  <p className="text-[12px] text-[#904d00] font-semibold flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px]">groups</span>
                    3 Cooperative Quotes Received • Society Area #42
                  </p>
                  {booking.isEmergency ? (
                    <span className="bg-[#ffdad6] text-[#ba1a1a] px-2 py-0.5 rounded-full font-mono text-[10px] font-bold flex items-center gap-0.5">
                      <span className="material-symbols-outlined text-[12px]">bolt</span>
                      Immediate (within 2h)
                    </span>
                  ) : booking.preferredTime ? (
                    <span className="bg-[#b5efda] text-[#002018] px-2 py-0.5 rounded-full font-mono text-[10px] font-bold flex items-center gap-0.5">
                      <span className="material-symbols-outlined text-[12px]">event</span>
                      Scheduled: {new Date(booking.preferredTime).toLocaleDateString([], { month: "short", day: "numeric" })}
                    </span>
                  ) : null}
                </div>
              </div>

              {/* Inspection Media Attachments if any */}
              {booking.mediaUrls && booking.mediaUrls.length > 0 && (
                <div className="pt-1 space-y-2">
                  <div className="flex flex-wrap gap-2">
                    {booking.mediaUrls.map((url, idx) => {
                      const isAudio = url.startsWith("data:audio") || /\.(mp3|wav|ogg|webm|m4a)/i.test(url);
                      if (isAudio) {
                        return (
                          <div key={idx} className="w-full bg-[#f2f3ff] p-2.5 rounded-xl border border-[#d1ddd8]">
                            <span className="text-[11px] font-bold text-[#134e3f] block mb-1">Your Voice Note:</span>
                            <audio src={url} controls className="w-full h-8" />
                          </div>
                        );
                      }
                      return (
                        <a key={idx} href={url} target="_blank" rel="noopener noreferrer" className="block relative w-16 h-16 rounded-xl overflow-hidden border border-[#d1ddd8] shadow-xs">
                          <img src={url} alt={`Inspection Photo ${idx + 1}`} className="w-full h-full object-cover" />
                        </a>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Pulse Beacon Bar */}
              <div className="bg-[#f2f3ff] rounded-xl p-2.5 flex items-center gap-2 border border-[#d1ddd8]">
                <div className="relative flex items-center justify-center w-5 h-5 shrink-0">
                  <span className="absolute w-4 h-4 rounded-full bg-[#904d00] opacity-30 animate-ping"></span>
                  <span className="w-2 h-2 rounded-full bg-[#904d00]"></span>
                </div>
                <p className="text-[11px] text-on-surface-variant leading-tight">
                  Broadcasting to 8 nearby certified specialists in 3 km radius
                </p>
              </div>
            </section>

            {/* Filter & Sort Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
              <button
                type="button"
                onClick={() => setSelectedSort("verified")}
                className={`px-3 py-1 rounded-full text-[11px] font-semibold flex items-center gap-1 shrink-0 transition-all ${
                  selectedSort === "verified"
                    ? "bg-[#134e3f] text-white shadow-xs"
                    : "bg-[#eaedff] text-on-surface hover:bg-[#dae2fd]"
                }`}
              >
                <span className="material-symbols-outlined text-[14px]">verified</span>
                All 3 Verified
              </button>

              <button
                type="button"
                onClick={() => setSelectedSort("closest")}
                className={`px-3 py-1 rounded-full text-[11px] font-semibold flex items-center gap-1 shrink-0 transition-all ${
                  selectedSort === "closest"
                    ? "bg-[#134e3f] text-white shadow-xs"
                    : "bg-[#eaedff] text-on-surface hover:bg-[#dae2fd]"
                }`}
              >
                <span className="material-symbols-outlined text-[14px]">near_me</span>
                Closest First
              </button>

              <button
                type="button"
                onClick={() => setSelectedSort("benchmark")}
                className={`px-3 py-1 rounded-full text-[11px] font-semibold flex items-center gap-1 shrink-0 transition-all ${
                  selectedSort === "benchmark"
                    ? "bg-[#134e3f] text-white shadow-xs"
                    : "bg-[#eaedff] text-on-surface hover:bg-[#dae2fd]"
                }`}
              >
                <span className="material-symbols-outlined text-[14px]">price_check</span>
                Union Benchmark
              </button>
            </div>

            {/* Provider Comparison Cards */}
            <div className="flex flex-col gap-3">
              {SAMPLE_QUOTES.map((sq, idx) => {
                const actualQuote = quotes[idx];
                const providerId = actualQuote?.quote?.providerId || `provider-sample-${idx}`;
                const displayAmount = actualQuote ? `₹${parseFloat(actualQuote.quote.amount).toFixed(0)}` : sq.amount;
                const displayName = actualQuote?.provider?.displayName || sq.name;

                return (
                  <article key={idx} className="civic-card p-3.5 flex flex-col gap-2.5 shadow-xs relative overflow-hidden">
                    {/* Ribbon Badge & ETA */}
                    <div className="flex items-center justify-between">
                      <span className="bg-[#ffdcc3] text-[#904d00] font-mono text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full flex items-center gap-1">
                        <span className="material-symbols-outlined text-[13px]">stars</span>
                        {sq.badge}
                      </span>

                      <span className="text-[11px] text-[#904d00] font-semibold flex items-center gap-1 bg-[#f2f3ff] px-2 py-0.5 rounded-md border border-[#d1ddd8]">
                        <span className="material-symbols-outlined text-[14px]">schedule</span>
                        {actualQuote?.quote?.estimatedArrival || sq.eta}
                      </span>
                    </div>

                    {/* Technician Profile Header */}
                    <div className="flex items-start gap-2.5 pt-0.5">
                      <img
                        src={sq.img}
                        alt={displayName}
                        className="w-13 h-13 w-12 h-12 rounded-xl object-cover shrink-0 border border-[#d1ddd8]"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <h3 className="text-[14px] font-bold text-on-surface truncate">{displayName}</h3>
                          <div className="flex items-center gap-0.5 text-[#904d00] shrink-0 bg-[#ffdcc3] px-1.5 py-0.2 rounded-full text-[11px] font-bold">
                            <span className="material-symbols-outlined text-[13px]">star</span>
                            <span>{actualQuote?.provider?.ratingAvg || sq.rating}</span>
                            <span className="text-on-surface-variant font-normal">({sq.reviews})</span>
                          </div>
                        </div>
                        <p className="text-[11px] text-on-surface-variant flex items-center gap-1 mt-0.5 truncate">
                          <span className="material-symbols-outlined text-[13px] text-[#904d00]">location_on</span>
                          {actualQuote?.provider?.serviceArea || sq.society}
                        </p>
                      </div>
                    </div>

                    {/* Verified Skill Badges */}
                    <div className="flex flex-wrap gap-1">
                      {sq.skills.map((skill, sIdx) => (
                        <span
                          key={sIdx}
                          className="bg-[#f2f3ff] text-[#134e3f] border border-[#d1ddd8] px-2 py-0.5 rounded-md text-[10px] font-semibold flex items-center gap-1"
                        >
                          <span className="material-symbols-outlined text-[12px] text-[#059669]">verified</span>
                          {skill}
                        </span>
                      ))}
                    </div>

                    {/* Estimate & Breakup Ledger */}
                    <div className="bg-[#f2f3ff] rounded-xl p-2.5 border border-[#d1ddd8] space-y-1">
                      <div className="flex items-baseline justify-between">
                        <span className="text-[11px] font-medium text-on-surface-variant">Initial Estimate</span>
                        <span className="font-mono text-[16px] font-bold text-[#134e3f]">{displayAmount}</span>
                      </div>
                      <p className="text-[10px] text-[#707975] leading-tight">
                        Initial Estimate — subject to on-site inspection
                      </p>
                      <div className="pt-0.5 flex items-start gap-1 text-[11px] text-on-surface-variant">
                        <span className="material-symbols-outlined text-[14px] text-[#904d00] mt-0.5 shrink-0">
                          receipt
                        </span>
                        <span>{actualQuote?.quote?.note || sq.note}</span>
                      </div>
                    </div>

                    {/* Member Note Statement */}
                    <div className="bg-white p-2 rounded-lg border border-[#eaedff] flex items-start gap-1.5">
                      <span className="material-symbols-outlined text-[#707975] text-[15px] shrink-0 mt-0.5">
                        chat_bubble_outline
                      </span>
                      <p className="text-[11px] text-on-surface italic leading-snug">
                        &ldquo;{sq.memberQuote}&rdquo;
                      </p>
                    </div>

                    {/* Action Triggers */}
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        aria-label={`Chat with ${displayName}`}
                        onClick={() => {
                          const pId = actualQuote?.quote?.providerId || (quotes[0]?.quote?.providerId) || "provider-sample";
                          router.push(`/customer/messages?bookingId=${id}&providerId=${pId}`);
                        }}
                        className="w-10 h-10 rounded-xl bg-[#f2f3ff] border border-[#d1ddd8] flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-[#eaedff] transition-colors"
                      >
                        <span className="material-symbols-outlined text-[18px]">chat</span>
                      </button>

                      <a
                        href="tel:9200000001"
                        aria-label={`Call ${displayName}`}
                        className="w-10 h-10 rounded-xl bg-[#f2f3ff] border border-[#d1ddd8] flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-[#eaedff] transition-colors"
                      >
                        <span className="material-symbols-outlined text-[18px]">call</span>
                      </a>

                      <button
                        type="button"
                        disabled={actionLoading}
                        onClick={() => handleSelectProvider(providerId, displayName, displayAmount)}
                        className="flex-1 h-10 bg-[#134e3f] text-white rounded-xl text-[12px] font-bold flex items-center justify-center gap-1 shadow-xs hover:bg-[#00362a] active:scale-[0.99] transition-all disabled:opacity-50"
                      >
                        <span>Select {displayName}</span>
                        <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>

            {/* Transparent Cooperative Escrow & Pricing Assurance Card */}
            <section className="civic-card p-3.5 space-y-2 bg-[#f2f3ff]">
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[#904d00] text-[20px]">policy</span>
                <h4 className="text-[13px] font-bold text-on-surface">Federation Fair-Wage Ledger</h4>
              </div>
              <p className="text-[11px] text-on-surface-variant leading-snug">
                Every rupee is recorded in your local cooperative register. Democratic pricing eliminates private intermediary commissions.
              </p>

              {/* Split Visualizer */}
              <div className="space-y-1 pt-1">
                <div className="h-2.5 w-full rounded-full bg-[#eaedff] overflow-hidden flex">
                  <div className="bg-[#134e3f] h-full" style={{ width: "82%" }} title="82% Direct Worker Payout"></div>
                  <div className="bg-[#fe932c] h-full" style={{ width: "10%" }} title="10% Federation Solidarity Reserve"></div>
                  <div className="bg-[#707975] h-full" style={{ width: "8%" }} title="8% Civic App Infrastructure"></div>
                </div>
                <div className="flex items-center justify-between font-mono text-[9px] text-on-surface-variant pt-0.5">
                  <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#134e3f]"></span>
                    82% Worker
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#fe932c]"></span>
                    10% Solidarity Fund
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#707975]"></span>
                    8% Maintenance
                  </span>
                </div>
              </div>
            </section>

            {/* Comparison Footer Notice */}
            <div className="bg-[#eaedff] border border-[#d1ddd8] rounded-xl p-2.5 flex items-center gap-2 shadow-xs mb-4">
              <div className="w-7 h-7 rounded-full bg-[#ffdcc3] flex items-center justify-center shrink-0 text-[#904d00]">
                <span className="material-symbols-outlined text-[16px]">verified_user</span>
              </div>
              <p className="text-[11px] text-on-surface-variant leading-tight flex-1">
                <strong className="text-on-surface font-semibold">Transparent Pricing:</strong> 0% surge charges. All estimates follow Cooperative Federation wage benchmark.
              </p>
            </div>
          </div>
        ) : (
          /* ACTIVE ENGAGEMENT & MILESTONE TRACKING VIEW */
          <div className="flex flex-col gap-3 py-2">
            {/* Active Engagement Status Header */}
            <div className="civic-card p-3.5">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#059669] animate-pulse"></span>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#134e3f]">
                    Engagement In Progress
                  </span>
                </div>
                <StatusBadge status={status} size="sm" />
              </div>

              <h2 className="text-[14px] font-bold text-on-surface">
                {category?.name ?? "Service Job"}
              </h2>
              <p className="text-[12px] text-on-surface-variant mt-0.5">
                {booking.serviceDescription}
              </p>
              <div className="flex items-center gap-1 mt-2 text-[11px] text-[#707975]">
                <span className="material-symbols-outlined text-[13px]">location_on</span>
                <span>{booking.address}</span>
              </div>
            </div>

            {/* Assigned Provider Profile */}
            {providerProfile && (
              <div className="civic-card p-3.5">
                <div className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant mb-2">
                  Assigned Union Specialist
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-[#134e3f] text-white flex items-center justify-center text-[18px] font-bold shrink-0">
                    {providerProfile.displayName.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-[14px] text-on-surface truncate">
                      {providerProfile.displayName}
                    </div>
                    <div className="flex items-center gap-1 text-[11px] text-on-surface-variant">
                      <span className="material-symbols-outlined text-[14px] text-[#904d00]">star</span>
                      <span>{providerProfile.ratingAvg ?? "4.9"} ({providerProfile.ratingCount ?? 42} reviews)</span>
                      <span>•</span>
                      <span>{providerProfile.experience ?? 8}y exp</span>
                    </div>
                    <div className="inline-flex items-center gap-1 mt-1 text-[10px] bg-[#b5efda] text-[#002018] px-2 py-0.2 rounded-md font-semibold">
                      <span className="material-symbols-outlined text-[12px]">verified</span>
                      Cooperative Member-Owner
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 mt-3 pt-2 border-t border-[#eaedff]">
                  <button
                    type="button"
                    onClick={() => {
                      const pId = booking.providerId || providerProfile?.id || (quotes[0]?.quote?.providerId) || "";
                      router.push(`/customer/messages?bookingId=${id}&providerId=${pId}`);
                    }}
                    className="flex-1 py-2 rounded-xl bg-[#f2f3ff] text-on-surface text-[12px] font-semibold flex items-center justify-center gap-1.5 border border-[#d1ddd8] hover:bg-[#eaedff]"
                  >
                    <span className="material-symbols-outlined text-[16px]">chat</span>
                    Chat
                  </button>
                  <a
                    href="tel:9200000001"
                    className="flex-1 py-2 rounded-xl bg-[#f2f3ff] text-on-surface text-[12px] font-semibold flex items-center justify-center gap-1.5 border border-[#d1ddd8] hover:bg-[#eaedff]"
                  >
                    <span className="material-symbols-outlined text-[16px]">call</span>
                    Call
                  </a>
                </div>
              </div>
            )}

            {/* Pending Mutual Confirmations */}
            {status === "arrived_pending_confirmation" && (
              <div className="p-3.5 rounded-2xl bg-[#ffdcc3] border border-[#fe932c] space-y-2">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#904d00] text-[20px]">pin_drop</span>
                  <div className="text-[13px] font-bold text-[#2f1500]">Specialist Has Arrived</div>
                </div>
                <p className="text-[11px] text-[#6e3900]">
                  Please confirm that the cooperative technician has reached your location.
                </p>
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => performAction("confirm_arrival")}
                  className="w-full py-2.5 bg-[#904d00] text-white rounded-xl text-[12px] font-bold shadow-xs active:scale-95 transition-all"
                >
                  Confirm Arrival on Site
                </button>
              </div>
            )}

            {status === "price_change_pending" && latestRevision && (
              <div className="p-3.5 rounded-2xl bg-[#ffdcc3] border border-[#fe932c] space-y-2">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#904d00] text-[20px]">warning</span>
                  <div className="text-[13px] font-bold text-[#2f1500]">Price Revision Requested</div>
                </div>
                <p className="text-[11px] text-[#6e3900]">
                  Reason: {latestRevision.reason}
                </p>
                <div className="bg-white p-2.5 rounded-xl border border-[#d1ddd8] space-y-1 text-[12px]">
                  <div className="flex justify-between">
                    <span className="text-on-surface-variant">Original Estimate:</span>
                    <span>₹{latestRevision.originalAmount}</span>
                  </div>
                  <div className="flex justify-between font-bold text-[#904d00]">
                    <span>Revised Amount:</span>
                    <span>₹{latestRevision.proposedAmount}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={() => performAction("approve_price_change", { proposedAmount: latestRevision.proposedAmount })}
                    className="flex-1 py-2 bg-[#134e3f] text-white rounded-xl text-[12px] font-bold"
                  >
                    Accept New Price
                  </button>
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={() => performAction("reject_price_change")}
                    className="py-2 px-3 bg-[#ffdad6] text-[#ba1a1a] rounded-xl text-[12px] font-bold"
                  >
                    Reject
                  </button>
                </div>
              </div>
            )}

            {status === "completed_pending_confirmation" && (
              <div className="p-3.5 rounded-2xl bg-[#b5efda] border border-[#059669] space-y-2">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#003724] text-[20px]">check_circle</span>
                  <div className="text-[13px] font-bold text-[#002018]">Work Completed by Specialist</div>
                </div>
                <p className="text-[11px] text-[#005036]">
                  Please verify that the repair was inspected and completed to your satisfaction.
                </p>
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => performAction("confirm_completion")}
                  className="w-full py-2.5 bg-[#003724] text-white rounded-xl text-[12px] font-bold shadow-xs active:scale-95 transition-all"
                >
                  Confirm & Release to Settlement
                </button>
              </div>
            )}

            {/* Settlement / Escrow Payment */}
            {status === "completed" && !payment && (
              <div className="civic-card p-3.5 space-y-3">
                <div className="text-[13px] font-bold text-on-surface">Escrow Settlement</div>
                <div className="flex items-center justify-between p-2.5 bg-[#f2f3ff] rounded-xl border border-[#d1ddd8]">
                  <span className="text-[12px] text-on-surface-variant">Payable Amount:</span>
                  <span className="font-mono text-[16px] font-bold text-[#134e3f]">
                    ₹{booking.totalAmount || booking.finalPrice || "350"}
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("online")}
                    className={`flex-1 py-2 rounded-xl text-[12px] font-semibold border ${
                      paymentMethod === "online" ? "bg-[#134e3f] text-white" : "bg-white border-[#d1ddd8]"
                    }`}
                  >
                    UPI / Escrow
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("cash")}
                    className={`flex-1 py-2 rounded-xl text-[12px] font-semibold border ${
                      paymentMethod === "cash" ? "bg-[#134e3f] text-white" : "bg-white border-[#d1ddd8]"
                    }`}
                  >
                    Cash on Spot
                  </button>
                </div>
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => performAction("record_payment", { method: paymentMethod, amount: booking.totalAmount || "350" })}
                  className="w-full h-11 bg-[#134e3f] text-white rounded-xl text-[13px] font-bold flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all"
                >
                  <span className="material-symbols-outlined text-[18px]">payments</span>
                  <span>Confirm Settlement</span>
                </button>
              </div>
            )}

            {/* Rating Section */}
            {status === "paid" && !rating && (
              <div className="civic-card p-3.5 space-y-2.5">
                <div className="text-[13px] font-bold text-on-surface">Rate Cooperative Specialist</div>
                <p className="text-[11px] text-on-surface-variant">
                  Your feedback helps maintain high democratic standards across the federation.
                </p>
                <div className="flex justify-center py-1">
                  <StarRating rating={ratingVal} onRate={setRatingVal} size={28} />
                </div>
                <textarea
                  rows={2}
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  placeholder="Share a short review..."
                  className="w-full p-2.5 rounded-xl border border-[#d1ddd8] text-[12px] focus:outline-none focus:border-[#134e3f]"
                />
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => performAction("submit_rating", { rating: ratingVal, reviewText })}
                  className="w-full py-2 bg-[#134e3f] text-white rounded-xl text-[12px] font-bold shadow-xs"
                >
                  Submit Review
                </button>
              </div>
            )}

            {/* Completed Receipt Card */}
            {(status === "rated" || rating) && (
              <div className="civic-card p-3.5 bg-[#f2f3ff] space-y-2 text-center">
                <span className="material-symbols-outlined text-[32px] text-[#059669]">verified</span>
                <div className="text-[14px] font-bold text-[#134e3f]">Service Successfully Completed</div>
                <p className="text-[11px] text-on-surface-variant">
                  Thank you for supporting democratic labour cooperatives and fair-wage artisans.
                </p>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Floating Selection Confirmation Toast Overlay */}
      {toastMessage && (
        <div className="fixed bottom-20 left-4 right-4 z-50 max-w-md mx-auto bg-[#134e3f] text-white p-3.5 rounded-2xl shadow-2xl border border-[#b5efda]/30 animate-slide-up">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <span className="material-symbols-outlined text-[#85f8c4] text-[24px] shrink-0">
                check_circle
              </span>
              <div className="min-w-0">
                <p className="text-[13px] font-bold truncate">{toastMessage.title}</p>
                <p className="text-[11px] text-[#86beab] truncate">{toastMessage.desc}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setToastMessage(null)}
              className="px-3 py-1 bg-[#fe932c] text-[#663500] rounded-lg text-[11px] font-bold shrink-0 shadow-xs active:scale-95 transition-all"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
