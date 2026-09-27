"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import SahakariEmblem from "@/components/SahakariEmblem";
import { StatusBadge } from "@/components/StatusBadge";
import { getServiceIcon } from "@/lib/serviceIcons";
import { apiFetch } from "@/lib/api";

interface ProviderProfile {
  id?: string;
  displayName: string;
  availability: string;
  ratingAvg?: string | null;
  ratingCount?: number | null;
  experience?: number | null;
  verificationStatus: string;
  serviceArea?: string | null;
  city?: string | null;
  societyId?: string | null;
}

interface BookingItem {
  booking: {
    id: string;
    status: string;
    serviceDescription: string;
    address: string;
    city?: string | null;
    pincode?: string | null;
    totalAmount?: string | null;
    finalPrice?: string | null;
    platformFee?: string | null;
    isEmergency?: boolean | null;
    preferredTime?: string | null;
    createdAt: string;
  };
  category: { name: string } | null;
  service: { name: string } | null;
}

export default function ProviderHomePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<ProviderProfile | null>(null);
  const [jobs, setJobs] = useState<BookingItem[]>([]);
  const [availability, setAvailability] = useState<"available" | "unavailable" | "busy">("available");
  const [updatingAvail, setUpdatingAvail] = useState(false);
  const [loading, setLoading] = useState(true);

  // Quick Quote Dialog State
  const [activeQuoteBooking, setActiveQuoteBooking] = useState<BookingItem | null>(null);
  const [quoteAmount, setQuoteAmount] = useState("350");
  const [quoteNote, setQuoteNote] = useState("₹200 inspection & labor + estimated standard components");
  const [quoteEta, setQuoteEta] = useState("~25 mins ETA");
  const [submittingQuote, setSubmittingQuote] = useState(false);
  const [quoteSuccessMsg, setQuoteSuccessMsg] = useState("");

  const fetchProfile = async () => {
    try {
      const res = await apiFetch("/api/auth/me");
      if (res.ok) {
        const data = await res.json();
        const p = data.user?.profile as ProviderProfile | null;
        setProfile(p);
        if (p?.availability) setAvailability(p.availability as "available" | "unavailable" | "busy");
      }
    } catch (err) {
      console.error("Error fetching provider profile:", err);
    }
  };

  const fetchJobs = async () => {
    try {
      const res = await apiFetch("/api/bookings?role=provider");
      if (res.ok) {
        const data = await res.json();
        setJobs(data.bookings ?? []);
      }
    } catch (err) {
      console.error("Error fetching provider bookings:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
    fetchJobs();
  }, []);

  const toggleAvailability = async () => {
    setUpdatingAvail(true);
    const newAvail = availability === "available" ? "unavailable" : "available";
    try {
      const meRes = await apiFetch("/api/auth/me");
      const meData = await meRes.json();
      const providerId = meData.user?.profile?.id;
      if (providerId) {
        await apiFetch(`/api/providers/${providerId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ availability: newAvail }),
        });
        setAvailability(newAvail);
      } else {
        setAvailability(newAvail);
      }
    } catch (err) {
      console.error("Error updating availability:", err);
    } finally {
      setUpdatingAvail(false);
    }
  };

  const handleQuickSubmitQuote = async () => {
    if (!activeQuoteBooking || !quoteAmount) return;
    setSubmittingQuote(true);
    setQuoteSuccessMsg("");
    try {
      const res = await apiFetch("/api/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId: activeQuoteBooking.booking.id,
          amount: quoteAmount,
          note: quoteNote,
          estimatedArrival: quoteEta,
        }),
      });

      if (res.ok) {
        setQuoteSuccessMsg("Quote submitted successfully! Customer notified.");
        setTimeout(() => {
          setActiveQuoteBooking(null);
          setQuoteSuccessMsg("");
          fetchJobs();
        }, 1500);
      }
    } catch (err) {
      console.error("Error submitting quote:", err);
    } finally {
      setSubmittingQuote(false);
    }
  };

  const handleUpdateJobStatus = async (bookingId: string, action: string) => {
    try {
      const res = await apiFetch(`/api/bookings/${bookingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        fetchJobs();
      }
    } catch (err) {
      console.error("Error updating job:", err);
    }
  };

  const activeJobs = jobs.filter(({ booking }) =>
    ["provider_selected", "accepted", "arrived_pending_confirmation", "arrived", "price_change_pending", "price_confirmed", "work_started", "completed_pending_confirmation"].includes(booking.status)
  );

  const newRequests = jobs.filter(({ booking }) => booking.status === "submitted" || booking.status === "quoted");
  const completedJobs = jobs.filter(({ booking }) => ["completed", "paid", "rated"].includes(booking.status));

  // Calculated daily earnings
  const calculatedEarnings = completedJobs.reduce((acc, { booking }) => {
    const p = parseFloat(booking.finalPrice || "0");
    return acc + (p > 0 ? p * 0.9 : 0);
  }, 0);

  return (
    <div className="flex-1 flex flex-col min-h-screen text-[#131b2e]">
      {/* =========================================================================
          1. HERO HEADER: COOPERATIVE PROVIDER PORTAL
          ========================================================================= */}
      <section className="coop-brand px-4 sm:px-6 pt-10 md:pt-6 pb-6 text-white relative shadow-md md:rounded-2xl md:mt-4">
        {/* Top Navbar Row */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <SahakariEmblem size={34} />
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-bold text-[#b5efda] uppercase tracking-wider">
                  Partner Portal
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-[#059669]"></span>
                <span className="text-[10px] text-white/80 font-mono">Society Fed #42</span>
              </div>
              <h1 className="text-[17px] md:text-[20px] font-bold text-white leading-tight">
                {profile?.displayName ?? "Certified Specialist"}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/provider/profile"
              className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 flex items-center justify-center text-white transition-colors"
              title="Provider Profile"
            >
              <span className="material-symbols-outlined text-[20px]">person</span>
            </Link>
          </div>
        </div>

        {/* Member Badge & Rating Row */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <div className="inline-flex items-center gap-1 bg-white/15 backdrop-blur-md px-2.5 py-1 rounded-full text-[11px] font-semibold border border-white/20">
            <span className="material-symbols-outlined text-[14px] text-[#b5efda]">verified</span>
            <span>Coop Member #COP-9021</span>
          </div>

          <div className="inline-flex items-center gap-1 bg-[#ffdcc3] text-[#904d00] px-2.5 py-1 rounded-full text-[11px] font-bold">
            <span className="material-symbols-outlined text-[13px]">star</span>
            <span>{profile?.ratingAvg ?? "4.9"}</span>
            <span className="text-[10px] text-[#904d00]/80">({profile?.ratingCount ?? 48} reviews)</span>
          </div>

          <span className="text-[11px] text-white/80 font-medium">
            {profile?.serviceArea || "Visakhapatnam Metropolitan Sector"}
          </span>
        </div>
      </section>

      {/* Main Content Body: Responsive 2-column Grid */}
      <main className="flex-1 px-4 sm:px-6 md:px-0 -mt-3.5 md:mt-4 space-y-4 pb-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Main Column on Desktop (Col 8, Order 1 on Desktop): Service Leads & Active Jobs */}
          <div className="lg:col-span-8 space-y-6 order-2 lg:order-1">
            {/* =========================================================================
                INCOMING NEW LEADS (Broadcast Requests to Quote On)
                ========================================================================= */}
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[18px] text-[#134e3f]">notifications_active</span>
                  <h2 className="text-[15px] font-bold text-[#131b2e]">New Service Broadcasts</h2>
                  {newRequests.length > 0 && (
                    <span className="bg-[#b5efda] text-[#002018] font-mono text-[10px] font-bold px-2 py-0.2 rounded-full">
                      {newRequests.length}
                    </span>
                  )}
                </div>
                <Link
                  href="/provider/requests"
                  className="text-[#904d00] hover:underline text-[12px] font-bold flex items-center gap-0.5"
                >
                  View All
                  <span className="material-symbols-outlined text-[14px]">chevron_right</span>
                </Link>
              </div>

              {loading ? (
                <div className="civic-card p-6 text-center text-[#707975] text-[12px]">
                  Loading service leads...
                </div>
              ) : newRequests.length === 0 ? (
                <div className="civic-card p-6 text-center bg-white space-y-1.5 border border-[#d1ddd8] rounded-2xl">
                  <span className="material-symbols-outlined text-[32px] text-[#059669]">task_alt</span>
                  <h3 className="text-[14px] font-bold text-[#131b2e]">All Requests Covered</h3>
                  <p className="text-[12px] text-[#707975] max-w-sm mx-auto">
                    No unquoted requests right now. Your radar is active for new broadcasts in Visakhapatnam.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {newRequests.slice(0, 4).map((item) => {
                    const { booking, category } = item;
                    return (
                      <article
                        key={booking.id}
                        className="civic-card p-4 bg-white border border-[#d1ddd8] space-y-3 shadow-xs rounded-2xl relative overflow-hidden hover:border-[#134e3f] transition-all"
                      >
                        {/* Header: Service Category & Emergency Badge */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-9 h-9 rounded-xl bg-[#f2f3ff] text-[#134e3f] flex items-center justify-center text-[19px]">
                              {getServiceIcon(category?.name ?? "")}
                            </div>
                            <div>
                              <h3 className="text-[13px] font-bold text-[#131b2e] leading-tight">
                                {category?.name ?? "Cooperative Service"}
                              </h3>
                              <span className="font-mono text-[10px] text-[#707975]">
                                #BK-{booking.id.slice(0, 5).toUpperCase()}
                              </span>
                            </div>
                          </div>

                          {booking.isEmergency ? (
                            <span className="bg-[#ffdad6] text-[#ba1a1a] text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-0.5">
                              <span className="material-symbols-outlined text-[12px]">bolt</span>
                              Immediate
                            </span>
                          ) : (
                            <span className="bg-[#f2f3ff] text-[#707975] text-[10px] font-medium px-2 py-0.5 rounded-full">
                              Standard
                            </span>
                          )}
                        </div>

                        {/* Customer Description */}
                        <p className="text-[12px] text-[#404945] leading-relaxed line-clamp-2 bg-[#faf8ff] p-2.5 rounded-xl border border-[#eaedff]">
                          &ldquo;{booking.serviceDescription}&rdquo;
                        </p>

                        {/* Location & Time */}
                        <div className="flex items-center justify-between text-[11px] text-[#707975]">
                          <span className="flex items-center gap-1 truncate max-w-[70%]">
                            <span className="material-symbols-outlined text-[14px] text-[#904d00]">location_on</span>
                            {booking.address}
                          </span>
                          <span className="font-mono text-[10px]">
                            {new Date(booking.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>

                        {/* Action Triggers */}
                        <div className="flex items-center gap-2 pt-1 border-t border-[#f2f3ff]">
                          <button
                            type="button"
                            onClick={() => {
                              setActiveQuoteBooking(item);
                              setQuoteAmount("350");
                              setQuoteNote("Inspection & base labor with standard tool kit");
                              setQuoteEta("~25 mins ETA");
                            }}
                            className="flex-1 py-2 bg-[#134e3f] text-white rounded-xl text-[12px] font-bold shadow-xs hover:bg-[#00362a] active:scale-95 transition-all flex items-center justify-center gap-1"
                          >
                            <span className="material-symbols-outlined text-[15px]">send</span>
                            Submit Quote
                          </button>

                          <Link
                            href={`/provider/requests/${booking.id}`}
                            className="px-3 py-2 bg-[#f2f3ff] text-[#131b2e] rounded-xl text-[12px] font-semibold border border-[#d1ddd8] hover:bg-[#eaedff] transition-colors"
                          >
                            Details
                          </Link>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>

            {/* =========================================================================
                ACTIVE IN-PROGRESS JOBS (Executing & On-Site Orders)
                ========================================================================= */}
            {activeJobs.length > 0 && (
              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[18px] text-[#904d00]">handyman</span>
                    <h2 className="text-[15px] font-bold text-[#131b2e]">Active In-Progress Jobs</h2>
                    <span className="bg-[#ffdcc3] text-[#904d00] font-mono text-[10px] font-bold px-2 py-0.2 rounded-full">
                      {activeJobs.length}
                    </span>
                  </div>
                  <Link
                    href="/provider/jobs"
                    className="text-[#904d00] hover:underline text-[12px] font-bold flex items-center gap-0.5"
                  >
                    All Jobs
                    <span className="material-symbols-outlined text-[14px]">chevron_right</span>
                  </Link>
                </div>

                <div className="space-y-3">
                  {activeJobs.map(({ booking, category }) => {
                    const status = booking.status;
                    return (
                      <article
                        key={booking.id}
                        className="civic-card p-4 bg-white border border-[#d1ddd8] space-y-3 shadow-xs rounded-2xl"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-9 h-9 rounded-xl bg-[#b5efda] text-[#00362a] flex items-center justify-center text-[20px]">
                              {getServiceIcon(category?.name ?? "")}
                            </div>
                            <div>
                              <h3 className="text-[14px] font-bold text-[#131b2e] leading-tight">
                                {category?.name ?? "Service Job"}
                              </h3>
                              <span className="font-mono text-[10px] text-[#707975]">
                                #BK-{booking.id.slice(0, 5).toUpperCase()}
                              </span>
                            </div>
                          </div>

                          <StatusBadge status={status} size="sm" />
                        </div>

                        <p className="text-[12px] text-[#404945] line-clamp-2 bg-[#faf8ff] p-2.5 rounded-xl border border-[#eaedff]">
                          {booking.serviceDescription}
                        </p>

                        <div className="flex items-center justify-between bg-[#f2f3ff] p-2.5 rounded-xl text-[12px] border border-[#d1ddd8]">
                          <span className="flex items-center gap-1.5 text-[#707975] truncate max-w-[70%]">
                            <span className="material-symbols-outlined text-[14px] text-[#904d00]">pin_drop</span>
                            {booking.address}
                          </span>
                          {booking.finalPrice && (
                            <span className="font-mono text-[14px] font-bold text-[#134e3f]">
                              ₹{parseFloat(booking.finalPrice).toFixed(0)}
                            </span>
                          )}
                        </div>

                        {/* Operational Action Button based on Workflow State */}
                        <div className="flex items-center gap-2 pt-1 border-t border-[#f2f3ff]">
                          {status === "provider_selected" && (
                            <button
                              type="button"
                              onClick={() => handleUpdateJobStatus(booking.id, "accept_booking")}
                              className="flex-1 py-2.5 bg-[#134e3f] text-white rounded-xl text-[12px] font-bold hover:bg-[#00362a] transition-colors"
                            >
                              Accept Booking
                            </button>
                          )}

                          {status === "accepted" && (
                            <button
                              type="button"
                              onClick={() => handleUpdateJobStatus(booking.id, "mark_arrived")}
                              className="flex-1 py-2.5 bg-[#904d00] text-white rounded-xl text-[12px] font-bold hover:bg-[#663500] transition-colors"
                            >
                              Mark Arrived On Site
                            </button>
                          )}

                          {status === "arrived" && (
                            <button
                              type="button"
                              onClick={() => handleUpdateJobStatus(booking.id, "start_work")}
                              className="flex-1 py-2.5 bg-[#134e3f] text-white rounded-xl text-[12px] font-bold hover:bg-[#00362a] transition-colors"
                            >
                              Start Diagnostic & Repair
                            </button>
                          )}

                          {status === "work_started" && (
                            <button
                              type="button"
                              onClick={() => handleUpdateJobStatus(booking.id, "complete_work")}
                              className="flex-1 py-2.5 bg-[#059669] text-white rounded-xl text-[12px] font-bold hover:bg-[#047857] transition-colors"
                            >
                              Complete Work
                            </button>
                          )}

                          {status === "completed" && (
                            <button
                              type="button"
                              onClick={() => handleUpdateJobStatus(booking.id, "record_payment")}
                              className="flex-1 py-2.5 bg-[#059669] text-white rounded-xl text-[12px] font-bold hover:bg-[#047857] transition-colors"
                            >
                              Record Payment (₹{booking.finalPrice ?? "350"})
                            </button>
                          )}

                          {/* Chat & Call Shortcuts */}
                          <Link
                            href={`/provider/messages?bookingId=${booking.id}`}
                            className="w-10 h-10 rounded-xl bg-[#f2f3ff] text-[#134e3f] border border-[#d1ddd8] flex items-center justify-center hover:bg-[#eaedff] transition-colors"
                            title="Chat with Customer"
                          >
                            <span className="material-symbols-outlined text-[19px]">chat</span>
                          </Link>

                          <a
                            href="tel:9100000001"
                            className="w-10 h-10 rounded-xl bg-[#f2f3ff] text-[#134e3f] border border-[#d1ddd8] flex items-center justify-center hover:bg-[#eaedff] transition-colors"
                            title="Call Customer"
                          >
                            <span className="material-symbols-outlined text-[19px]">call</span>
                          </a>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            )}
          </div>

          {/* Right Column on Desktop (Col 4, Order 2 on Desktop): Availability Radar, Performance, Member Tools */}
          <div className="lg:col-span-4 space-y-4 order-1 lg:order-2">
            {/* =========================================================================
                TACTILE LIVE DISPATCH & AVAILABILITY CARD
                ========================================================================= */}
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#d1ddd8] flex items-center justify-between">
              <div className="flex items-start gap-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    availability === "available" ? "bg-[#b5efda] text-[#00362a]" : "bg-[#f2f3ff] text-[#707975]"
                  }`}
                >
                  <span className="material-symbols-outlined text-[22px]">
                    {availability === "available" ? "sensors" : "power_settings_new"}
                  </span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-bold text-[#131b2e]">
                      {availability === "available" ? "ONLINE • Accepting Leads" : "OFFLINE • On Break"}
                    </span>
                    {availability === "available" && (
                      <span className="w-2 h-2 rounded-full bg-[#059669] animate-pulse"></span>
                    )}
                  </div>
                  <p className="text-[11px] text-[#707975] mt-0.5 leading-snug">
                    {availability === "available"
                      ? "Live radar active: receiving nearby broadcasts within 5 km"
                      : "Hidden from new customer requests. Take a rest."}
                  </p>
                </div>
              </div>

              {/* Toggle Switch */}
              <button
                type="button"
                onClick={toggleAvailability}
                disabled={updatingAvail}
                className={`relative w-14 h-8 rounded-full transition-colors shrink-0 ${
                  availability === "available" ? "bg-[#134e3f]" : "bg-slate-300"
                }`}
              >
                <div
                  className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-md transition-all flex items-center justify-center ${
                    availability === "available" ? "left-7" : "left-1"
                  }`}
                >
                  <span
                    className={`material-symbols-outlined text-[14px] ${
                      availability === "available" ? "text-[#134e3f]" : "text-slate-400"
                    }`}
                  >
                    {availability === "available" ? "check" : "close"}
                  </span>
                </div>
              </button>
            </div>

            {/* =========================================================================
                FOUR KEY PERFORMANCE & COOP METRICS GRID
                ========================================================================= */}
            <div className="grid grid-cols-2 gap-2.5">
              {/* Card 1: Today's Net Earnings */}
              <div className="bg-white rounded-2xl p-3.5 border border-[#eaedff] shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between text-[#707975] text-[11px] mb-1">
                  <span className="font-semibold uppercase tracking-wider">Today&apos;s Payout</span>
                  <span className="material-symbols-outlined text-[16px] text-[#134e3f]">payments</span>
                </div>
                <div className="font-mono text-[22px] font-bold text-[#134e3f]">
                  ₹{calculatedEarnings > 0 ? calculatedEarnings.toFixed(0) : "1,450"}
                </div>
                <div className="text-[10px] text-[#059669] font-medium flex items-center gap-0.5 mt-1">
                  <span className="material-symbols-outlined text-[12px]">account_balance</span>
                  90% Member Share
                </div>
              </div>

              {/* Card 2: Active Ongoing Jobs */}
              <div className="bg-white rounded-2xl p-3.5 border border-[#eaedff] shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between text-[#707975] text-[11px] mb-1">
                  <span className="font-semibold uppercase tracking-wider">Active Jobs</span>
                  <span className="material-symbols-outlined text-[16px] text-[#904d00]">handyman</span>
                </div>
                <div className="font-mono text-[22px] font-bold text-[#904d00]">
                  {activeJobs.length}
                </div>
                <div className="text-[10px] text-[#707975] font-medium flex items-center gap-0.5 mt-1">
                  <span className="material-symbols-outlined text-[12px]">near_me</span>
                  In-progress dispatch
                </div>
              </div>

              {/* Card 3: New Broadcast Leads */}
              <div className="bg-white rounded-2xl p-3.5 border border-[#eaedff] shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between text-[#707975] text-[11px] mb-1">
                  <span className="font-semibold uppercase tracking-wider">Leads Available</span>
                  <span className="material-symbols-outlined text-[16px] text-[#059669]">broadcast_on_personal</span>
                </div>
                <div className="font-mono text-[22px] font-bold text-[#059669]">
                  {newRequests.length}
                </div>
                <div className="text-[10px] text-[#059669] font-medium flex items-center gap-0.5 mt-1">
                  <span className="material-symbols-outlined text-[12px]">speed</span>
                  Nearby in your sector
                </div>
              </div>

              {/* Card 4: Cooperative Trust Score */}
              <div className="bg-white rounded-2xl p-3.5 border border-[#eaedff] shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between text-[#707975] text-[11px] mb-1">
                  <span className="font-semibold uppercase tracking-wider">Trust Score</span>
                  <span className="material-symbols-outlined text-[16px] text-[#134e3f]">verified_user</span>
                </div>
                <div className="font-mono text-[22px] font-bold text-[#131b2e]">
                  99%
                </div>
                <div className="text-[10px] text-[#707975] font-medium flex items-center gap-0.5 mt-1">
                  <span className="material-symbols-outlined text-[12px]">thumb_up</span>
                  On-time guarantee
                </div>
              </div>
            </div>

            {/* =========================================================================
                COOPERATIVE MEMBER PERKS & GUILD TOOLS
                ========================================================================= */}
            <section className="bg-white rounded-2xl p-4 border border-[#eaedff] space-y-3 shadow-xs">
              <div className="flex items-center justify-between">
                <h2 className="text-[13px] font-bold text-[#131b2e]">Cooperative Member Tools</h2>
                <span className="text-[10px] text-[#059669] font-bold uppercase tracking-wider">Federation Unit</span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <Link
                  href="/provider/earnings"
                  className="p-2.5 rounded-xl bg-[#faf8ff] border border-[#eaedff] flex flex-col items-center text-center hover:bg-[#f2f3ff] transition-all"
                >
                  <span className="material-symbols-outlined text-[20px] text-[#134e3f] mb-1">
                    account_balance_wallet
                  </span>
                  <span className="text-[10px] font-bold text-[#131b2e] leading-tight">Ledger & Payout</span>
                </Link>

                <Link
                  href="/provider/profile"
                  className="p-2.5 rounded-xl bg-[#faf8ff] border border-[#eaedff] flex flex-col items-center text-center hover:bg-[#f2f3ff] transition-all"
                >
                  <span className="material-symbols-outlined text-[20px] text-[#904d00] mb-1">
                    workspace_premium
                  </span>
                  <span className="text-[10px] font-bold text-[#131b2e] leading-tight">Certifications</span>
                </Link>

                <Link
                  href="/provider/jobs"
                  className="p-2.5 rounded-xl bg-[#faf8ff] border border-[#eaedff] flex flex-col items-center text-center hover:bg-[#f2f3ff] transition-all"
                >
                  <span className="material-symbols-outlined text-[20px] text-[#059669] mb-1">
                    verified
                  </span>
                  <span className="text-[10px] font-bold text-[#131b2e] leading-tight">Union Rate Card</span>
                </Link>
              </div>
            </section>

            {/* Federation Field Support */}
            <div className="bg-[#faf8ff] rounded-2xl p-3.5 border border-[#eaedff] flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#904d00] text-[20px]">support_agent</span>
                <div>
                  <div className="font-bold text-[#131b2e]">Dispatch Coordinator Hotline</div>
                  <div className="text-[10px] text-[#707975]">Toll-free 24/7 Field Tech Support</div>
                </div>
              </div>
              <a
                href="tel:1800000001"
                className="px-2.5 py-1 bg-[#134e3f] text-white rounded-lg font-bold text-[11px] hover:bg-[#00362a]"
              >
                Call
              </a>
            </div>
          </div>
        </div>
      </main>

      {/* =========================================================================
          7. QUICK SUBMIT QUOTE MODAL (Interactive Drawer)
          ========================================================================= */}
      {activeQuoteBooking && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
          <div className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl p-5 space-y-4 shadow-2xl animate-slide-up">
            <div className="flex items-center justify-between pb-2 border-b border-[#eaedff]">
              <div>
                <h3 className="text-[15px] font-bold text-[#131b2e]">Submit Cooperative Estimate</h3>
                <p className="text-[11px] text-[#707975]">
                  {activeQuoteBooking.category?.name} • #BK-{activeQuoteBooking.booking.id.slice(0, 5).toUpperCase()}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveQuoteBooking(null)}
                className="w-8 h-8 rounded-full bg-[#f2f3ff] flex items-center justify-center text-[#707975] hover:text-[#131b2e]"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            {quoteSuccessMsg ? (
              <div className="p-4 bg-[#b5efda] text-[#002018] rounded-2xl text-center space-y-1">
                <span className="material-symbols-outlined text-[28px] text-[#059669]">check_circle</span>
                <p className="text-[13px] font-bold">{quoteSuccessMsg}</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="text-[11px] font-bold text-[#707975] block mb-1">
                    Estimate Amount (₹)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 font-bold text-[#131b2e]">₹</span>
                    <input
                      type="number"
                      value={quoteAmount}
                      onChange={(e) => setQuoteAmount(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 bg-[#f2f3ff] border border-[#d1ddd8] rounded-xl font-mono text-[16px] font-bold text-[#134e3f] focus:outline-none focus:ring-1 focus:ring-[#134e3f]"
                    />
                  </div>
                  <span className="text-[10px] text-[#707975] mt-1 block">
                    Union benchmark for {activeQuoteBooking.category?.name}: ₹300 - ₹450
                  </span>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-[#707975] block mb-1">
                    Estimated Arrival Time
                  </label>
                  <input
                    type="text"
                    value={quoteEta}
                    onChange={(e) => setQuoteEta(e.target.value)}
                    placeholder="e.g. ~25 mins ETA, Today 4:30 PM"
                    className="w-full px-3 py-2 bg-[#f2f3ff] border border-[#d1ddd8] rounded-xl text-[12px] text-[#131b2e] focus:outline-none focus:ring-1 focus:ring-[#134e3f]"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-[#707975] block mb-1">
                    Technician Note / Scope Statement
                  </label>
                  <textarea
                    rows={2}
                    value={quoteNote}
                    onChange={(e) => setQuoteNote(e.target.value)}
                    className="w-full px-3 py-2 bg-[#f2f3ff] border border-[#d1ddd8] rounded-xl text-[12px] text-[#131b2e] focus:outline-none focus:ring-1 focus:ring-[#134e3f]"
                  />
                </div>

                <div className="pt-2 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveQuoteBooking(null)}
                    className="flex-1 py-2.5 bg-[#f2f3ff] text-[#707975] rounded-xl text-[12px] font-bold hover:bg-[#eaedff]"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={submittingQuote || !quoteAmount}
                    onClick={handleQuickSubmitQuote}
                    className="flex-1 py-2.5 bg-[#134e3f] text-white rounded-xl text-[12px] font-bold shadow-xs hover:bg-[#00362a] disabled:opacity-50"
                  >
                    {submittingQuote ? "Sending..." : "Send Estimate"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
