"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import SahakariEmblem from "@/components/SahakariEmblem";
import { StatusBadge } from "@/components/StatusBadge";
import { LoadingSpinner } from "@/components/LoadingSpinner";

const STATUS_GROUPS = {
  active: [
    "submitted",
    "quoted",
    "provider_selected",
    "accepted",
    "arrived_pending_confirmation",
    "arrived",
    "price_change_pending",
    "price_confirmed",
    "work_started_pending_confirmation",
    "work_started",
    "completed_pending_confirmation",
  ],
  completed: ["completed", "payment_pending", "paid", "rated"],
  cancelled: ["cancellation_pending", "cancelled", "disputed"],
};

type Tab = "active" | "completed" | "cancelled";

export default function OrdersPage() {
  const router = useRouter();
  const [bookings, setBookings] = useState<
    {
      booking: {
        id: string;
        status: string;
        createdAt: string;
        serviceDescription: string;
        finalPrice: string | null;
        totalAmount: string | null;
      };
      category: { name: string } | null;
    }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("active");

  useEffect(() => {
    fetch("/api/bookings?role=customer")
      .then((r) => r.json())
      .then((d) => setBookings(d.bookings ?? []))
      .finally(() => setLoading(false));
  }, []);

  const filtered = bookings.filter(({ booking }) =>
    STATUS_GROUPS[activeTab].includes(booking.status)
  );

  const counts = {
    active: bookings.filter(({ booking }) => STATUS_GROUPS.active.includes(booking.status)).length,
    completed: bookings.filter(({ booking }) => STATUS_GROUPS.completed.includes(booking.status)).length,
    cancelled: bookings.filter(({ booking }) => STATUS_GROUPS.cancelled.includes(booking.status)).length,
  };

  return (
    <div className="min-h-screen bg-surface font-body text-on-surface antialiased flex flex-col pb-24">
      {/* Civic Header */}
      <header className="fixed md:sticky top-0 md:top-16 left-0 right-0 z-40 bg-white/95 backdrop-blur-xl border-b border-[#d1ddd8] shadow-[0_1px_8px_rgba(0,0,0,0.04)] pt-safe md:pt-0">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => router.push("/customer")}
                className="w-9 h-9 -ml-1 rounded-full flex items-center justify-center text-on-surface hover:bg-[#f2f3ff] active:scale-95 transition-all"
              >
                <span className="material-symbols-outlined text-[22px]">arrow_back</span>
              </button>
              <SahakariEmblem size={26} />
              <h1 className="text-[15px] font-bold text-on-surface">Federation Orders</h1>
            </div>

            <button
              type="button"
              onClick={() => router.push("/customer/book")}
              className="text-[11px] font-bold px-3 py-1.5 bg-[#134e3f] text-white rounded-xl shadow-xs hover:bg-[#00362a] active:scale-95 transition-all flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-[14px]">add</span>
              New Job
            </button>
          </div>

          {/* Segment Tabs */}
          <div className="flex gap-1.5 p-1 bg-[#f2f3ff] rounded-xl border border-[#d1ddd8]">
            {(["active", "completed", "cancelled"] as Tab[]).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold transition-all flex items-center justify-center gap-1 ${
                  activeTab === tab
                    ? "bg-[#134e3f] text-white shadow-xs"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                <span className="capitalize">{tab}</span>
                {counts[tab] > 0 && (
                  <span
                    className={`rounded-full px-1.5 text-[9px] font-mono ${
                      activeTab === tab ? "bg-white/30 text-white" : "bg-[#eaedff] text-[#134e3f]"
                    }`}
                  >
                    {counts[tab]}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Bookings List */}
      <main className="flex-1 flex flex-col w-full max-w-6xl mx-auto px-4 sm:px-6 pt-28 md:pt-6">
        {loading && (
          <div className="flex justify-center py-16">
            <LoadingSpinner label="Loading service orders..." />
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="civic-card text-center py-14 px-4 my-4">
            <div className="w-14 h-14 rounded-2xl bg-[#f2f3ff] text-[#134e3f] flex items-center justify-center text-[28px] mx-auto mb-3">
              <span className="material-symbols-outlined text-[32px]">receipt_long</span>
            </div>
            <p className="text-[14px] font-bold text-on-surface">No {activeTab} service orders</p>
            <p className="text-[11px] text-on-surface-variant max-w-xs mx-auto mt-1">
              Broadcast jobs to nearby verified union specialists with transparent rate-cards.
            </p>
            {activeTab === "active" && (
              <button
                type="button"
                onClick={() => router.push("/customer/book")}
                className="mt-4 px-4 py-2 bg-[#134e3f] text-white rounded-xl text-[12px] font-bold shadow-xs hover:bg-[#00362a]"
              >
                Request Cooperative Specialist
              </button>
            )}
          </div>
        )}

        <div className="space-y-2.5 md:grid md:grid-cols-2 lg:grid-cols-3 md:gap-4 md:space-y-0">
          {filtered.map(({ booking, category }) => (
            <button
              key={booking.id}
              type="button"
              onClick={() => router.push(`/customer/orders/${booking.id}`)}
              className="civic-card p-3.5 hover:border-[#134e3f] transition-all text-left w-full shadow-xs active:scale-[0.99]"
            >
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-1.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-[#f2f3ff] text-[#134e3f] flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[18px]">build</span>
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-[13px] text-on-surface truncate">
                      {category?.name ?? "Specialist Service"}
                    </div>
                    <div className="font-mono text-[10px] text-[#707975]">
                      #BK-{booking.id.slice(0, 6).toUpperCase()}
                    </div>
                  </div>
                </div>
                <StatusBadge status={booking.status} size="sm" />
              </div>

              <div className="text-[11px] text-on-surface-variant line-clamp-2 mb-2 leading-relaxed">
                {booking.serviceDescription}
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-[#eaedff] text-[10px] text-[#707975]">
                <span>
                  {new Date(booking.createdAt).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
                {booking.totalAmount ? (
                  <span className="font-mono text-[12px] font-bold text-[#134e3f]">
                    ₹{parseFloat(booking.totalAmount).toFixed(0)}
                  </span>
                ) : (
                  <span className="font-mono text-[10px] text-[#904d00] font-semibold">
                    Awaiting Estimates
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      </main>
    </div>
  );
}
