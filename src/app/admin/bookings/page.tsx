"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowRight, ClipboardList, Search, Zap } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/cn";
import { bookingRef, formatINR, relativeTime } from "@/lib/format";
import { getBookingStatusLabel } from "@/lib/status";
import { ServiceIcon } from "@/lib/serviceIcons";
import { PageContainer, PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { StatusBadge, Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/states";
import { Input, Select, Field } from "@/components/ui/form";

interface BookingRow {
  booking: {
    id: string;
    status: string;
    serviceDescription: string;
    totalAmount?: string | null;
    isEmergency?: boolean | null;
    createdAt: string;
  };
  category: { name: string } | null;
  service: { name: string } | null;
}

const STATUS_FILTERS = [
  "all",
  "submitted",
  "quoted",
  "arrived",
  "work_started",
  "completed",
  "paid",
  "rated",
  "cancelled",
  "disputed",
];

export default function AdminBookingsPage() {
  const [bookings, setBookings] = useState<BookingRow[] | null>(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  useEffect(() => {
    apiFetch("/api/bookings?role=society_admin")
      .then((r) => r.json())
      .then((d) => setBookings((d as { bookings: BookingRow[] }).bookings ?? []))
      .catch(() => setBookings([]));
  }, []);

  const filtered = (bookings ?? []).filter(({ booking, category }) => {
    const matchSearch =
      !search ||
      booking.id.toLowerCase().includes(search.toLowerCase()) ||
      booking.serviceDescription.toLowerCase().includes(search.toLowerCase()) ||
      category?.name.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "all" || booking.status === filterStatus;
    return matchSearch && matchStatus;
  });

  return (
    <PageContainer width="wide">
      <PageHeader
        title="Bookings monitor"
        description="Every service request in your jurisdiction and its live status."
      />

      {/* ---------- Filters ---------- */}
      <Card className="p-4 mb-5 flex flex-col sm:flex-row gap-3">
        <Field label="Search bookings" className="flex-1">
          <Input
            icon={<Search />}
            placeholder="Booking ID, category or description…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </Field>
        <Field label="Status" className="sm:w-56">
          <Select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            {STATUS_FILTERS.map((s) => (
              <option key={s} value={s}>
                {s === "all" ? "All statuses" : getBookingStatusLabel(s)}
              </option>
            ))}
          </Select>
        </Field>
      </Card>

      {bookings === null ? (
        <Card className="overflow-hidden">
          <div className="divide-y divide-line">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="p-4">
                <div className="skeleton h-10 rounded-xl" />
              </div>
            ))}
          </div>
        </Card>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<ClipboardList />}
          title="No bookings match"
          description={
            search || filterStatus !== "all"
              ? "Try widening the search or clearing the status filter."
              : "Bookings will appear here as customers request services."
          }
        />
      ) : (
        <>
          <p className="text-xs text-ink-400 mb-2.5">
            {filtered.length} booking{filtered.length === 1 ? "" : "s"}
            {filterStatus !== "all" ? ` • ${getBookingStatusLabel(filterStatus)}` : ""}
          </p>

          {/* Desktop table */}
          <Card className="hidden md:block overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-ink-50/70">
                <tr className="text-left text-xs text-ink-400 uppercase tracking-wide border-b border-line">
                  <th className="px-5 py-3 font-semibold">Booking</th>
                  <th className="px-5 py-3 font-semibold">Category</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 font-semibold text-right">Amount</th>
                  <th className="px-5 py-3 font-semibold">Raised</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filtered.map(({ booking, category }) => (
                  <tr key={booking.id} className="hover:bg-ink-50/60">
                    <td className="px-5 py-3.5">
                      <p className="font-semibold text-ink-900 line-clamp-1 max-w-72">{booking.serviceDescription}</p>
                      <p className="text-2xs font-mono text-ink-400 mt-0.5">
                        {bookingRef(booking.id)}
                        {booking.isEmergency && (
                          <span className="ml-2 inline-flex items-center gap-0.5 text-warning-700 font-sans font-bold">
                            <Zap className="size-3" aria-hidden /> Emergency
                          </span>
                        )}
                      </p>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="inline-flex items-center gap-2 text-ink-700">
                        <span className="size-7 rounded-lg bg-brand-50 text-brand-700 flex items-center justify-center [&>svg]:size-4" aria-hidden>
                          <ServiceIcon category={category?.name} size={16} />
                        </span>
                        {category?.name ?? "—"}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={booking.status} size="sm" />
                    </td>
                    <td className="px-5 py-3.5 text-right tabular-nums font-semibold text-ink-800">
                      {booking.totalAmount ? formatINR(booking.totalAmount) : "—"}
                    </td>
                    <td className="px-5 py-3.5 text-ink-500 whitespace-nowrap">{relativeTime(booking.createdAt)}</td>
                    <td className="px-5 py-3.5 text-right">
                      <Link
                        href={`/admin/bookings/${booking.id}`}
                        className="inline-flex items-center gap-1 text-xs font-bold text-brand-700 hover:text-brand-800"
                      >
                        Open
                        <ArrowRight className="size-3.5" aria-hidden />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          {/* Mobile cards */}
          <ul className="md:hidden space-y-3">
            {filtered.map(({ booking, category }) => (
              <li key={booking.id}>
                <Link
                  href={`/admin/bookings/${booking.id}`}
                  className={cn(
                    "block rounded-2xl border bg-panel p-4 shadow-card active:scale-[0.99] transition-all",
                    booking.isEmergency ? "border-warning-300" : "border-line"
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="size-8 rounded-lg bg-brand-50 text-brand-700 flex items-center justify-center shrink-0" aria-hidden>
                        <ServiceIcon category={category?.name} size={16} />
                      </span>
                      <p className="text-sm font-bold text-ink-900 truncate">{category?.name ?? "Service"}</p>
                      {booking.isEmergency && (
                        <Badge intent="warning" dot={false}>
                          <Zap className="size-3 mr-0.5" aria-hidden />
                        </Badge>
                      )}
                    </div>
                    <StatusBadge status={booking.status} size="sm" />
                  </div>
                  <p className="mt-2 text-sm text-ink-600 line-clamp-2">{booking.serviceDescription}</p>
                  <div className="mt-3 pt-2.5 border-t border-line flex items-center justify-between text-xs text-ink-400">
                    <span className="font-mono">{bookingRef(booking.id)}</span>
                    <span className="inline-flex items-center gap-2">
                      {booking.totalAmount ? <span className="font-bold text-ink-800 tabular-nums">{formatINR(booking.totalAmount)}</span> : null}
                      {relativeTime(booking.createdAt)}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </PageContainer>
  );
}
