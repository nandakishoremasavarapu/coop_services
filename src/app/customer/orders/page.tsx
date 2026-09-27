"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, ClipboardList, CalendarDays, ChevronRight } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { bookingRef, formatDate, formatINR } from "@/lib/format";
import { BOOKING_STATUS_GROUPS } from "@/lib/status";
import { ServiceIcon } from "@/lib/serviceIcons";
import { buttonClasses } from "@/components/ui/button";
import { PageContainer, PageHeader } from "@/components/ui/page-header";
import { SegmentedTabs } from "@/components/ui/tabs";
import { StatusBadge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/states";

type Tab = "active" | "completed" | "cancelled";

interface OrderItem {
  booking: {
    id: string;
    status: string;
    createdAt: string;
    serviceDescription: string;
    preferredTime?: string | null;
    isEmergency?: boolean | null;
    finalPrice?: string | null;
    totalAmount?: string | null;
  };
  category: { name: string } | null;
}

export default function OrdersPage() {
  const [bookings, setBookings] = useState<OrderItem[] | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("active");

  useEffect(() => {
    apiFetch("/api/bookings?role=customer")
      .then((r) => r.json())
      .then((d) => setBookings(d.bookings ?? []))
      .catch(() => setBookings([]));
  }, []);

  const filtered = (bookings ?? []).filter(({ booking }) => BOOKING_STATUS_GROUPS[activeTab].includes(booking.status));

  const counts: Record<Tab, number> = {
    active: (bookings ?? []).filter(({ booking }) => BOOKING_STATUS_GROUPS.active.includes(booking.status)).length,
    completed: (bookings ?? []).filter(({ booking }) => BOOKING_STATUS_GROUPS.completed.includes(booking.status)).length,
    cancelled: (bookings ?? []).filter(({ booking }) => BOOKING_STATUS_GROUPS.cancelled.includes(booking.status)).length,
  };

  return (
    <PageContainer width="default">
      <PageHeader
        title="My orders"
        description="Every service request, its live status and the next action."
        actions={
          <Link href="/customer/book" className={buttonClasses({ size: "md" })}>
            <Plus className="size-4.5" aria-hidden />
            Book service
          </Link>
        }
      />

      <SegmentedTabs
        aria-label="Filter orders"
        value={activeTab}
        onChange={setActiveTab}
        options={[
          { value: "active", label: "Active", count: counts.active },
          { value: "completed", label: "Completed", count: counts.completed },
          { value: "cancelled", label: "Cancelled", count: counts.cancelled },
        ]}
      />

      <div className="mt-5">
        {bookings === null ? (
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className="skeleton h-44 rounded-2xl" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<ClipboardList />}
            title={activeTab === "active" ? "No active orders" : `No ${activeTab} orders`}
            description={
              activeTab === "active"
                ? "Book a service and your live request, quotes and tracking will appear here."
                : activeTab === "completed"
                  ? "Completed services and their receipts will be listed here."
                  : "Cancelled or disputed requests will appear here."
            }
            action={
              activeTab === "active" ? (
                <Link href="/customer/book" className={buttonClasses({ size: "md" })}>
                  <Plus className="size-4.5" aria-hidden />
                  Book your first service
                </Link>
              ) : undefined
            }
          />
        ) : (
          <ul className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map(({ booking, category }) => (
              <li key={booking.id}>
                <Link
                  href={`/customer/orders/${booking.id}`}
                  className="group flex flex-col h-full rounded-2xl border border-line bg-panel p-5 shadow-card hover:shadow-raised hover:border-brand-300 transition-all"
                >
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span aria-hidden className="size-10 rounded-xl bg-brand-50 text-brand-700 flex items-center justify-center shrink-0">
                        <ServiceIcon category={category?.name} size={20} />
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-ink-900 truncate">{category?.name ?? "Service"}</p>
                        <p className="text-2xs text-ink-400 font-mono">{bookingRef(booking.id)}</p>
                      </div>
                    </div>
                    <StatusBadge status={booking.status} size="sm" />
                  </div>

                  <p className="mt-3 text-sm text-ink-600 leading-relaxed line-clamp-2 flex-1">
                    {booking.serviceDescription}
                  </p>

                  <div className="mt-4 pt-3.5 border-t border-line flex items-center justify-between gap-2">
                    <span className="text-xs text-ink-400 inline-flex items-center gap-1.5">
                      <CalendarDays className="size-3.5" aria-hidden />
                      {formatDate(booking.createdAt)}
                    </span>
                    {booking.totalAmount ? (
                      <span className="text-sm font-extrabold text-ink-900 tabular-nums">{formatINR(booking.totalAmount)}</span>
                    ) : (
                      <span className="text-xs font-bold text-accent-700">Awaiting quotes</span>
                    )}
                  </div>

                  <span className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-brand-700 opacity-0 group-hover:opacity-100 transition-opacity">
                    Open details
                    <ChevronRight className="size-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </PageContainer>
  );
}
