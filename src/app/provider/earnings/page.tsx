"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { CheckCircle2, TrendingUp, Wallet } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { bookingRef, formatDate, formatINR } from "@/lib/format";
import { PageContainer, PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat";
import { EmptyState } from "@/components/ui/states";

interface JobItem {
  booking: {
    id: string;
    status: string;
    finalPrice?: string | null;
    platformFee?: string | null;
    totalAmount?: string | null;
    createdAt: string;
  };
  category: { name: string } | null;
}

export default function ProviderEarningsPage() {
  const [jobs, setJobs] = useState<JobItem[] | null>(null);

  useEffect(() => {
    apiFetch("/api/bookings?role=provider")
      .then((r) => r.json())
      .then((d) => setJobs(d.bookings ?? []))
      .catch(() => setJobs([]));
  }, []);

  const paidJobs = (jobs ?? []).filter(({ booking }) => ["paid", "rated"].includes(booking.status));
  const totalEarnings = paidJobs.reduce((sum, { booking }) => {
    const service = parseFloat(booking.finalPrice ?? "0");
    const fee = parseFloat(booking.platformFee ?? "0");
    return sum + (service - fee);
  }, 0);
  const totalGross = paidJobs.reduce((sum, { booking }) => sum + parseFloat(booking.finalPrice ?? "0"), 0);
  const totalFees = paidJobs.reduce((sum, { booking }) => sum + parseFloat(booking.platformFee ?? "0"), 0);
  const activeCount = (jobs ?? []).filter(({ booking }) => ["accepted", "arrived", "work_started"].includes(booking.status)).length;
  const cancelledCount = (jobs ?? []).filter(({ booking }) => booking.status === "cancelled").length;

  return (
    <PageContainer width="default">
      <PageHeader
        backHref="/provider"
        title="Earnings & ledger"
        description="Every settled job and your cooperative member share."
      />

      {jobs === null ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="skeleton h-28 rounded-2xl" />
            ))}
          </div>
          <div className="skeleton h-64 rounded-2xl" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="col-span-2 lg:col-span-1 rounded-2xl bg-gradient-to-br from-brand-800 to-brand-950 text-white p-5 shadow-card">
              <p className="text-xs font-semibold text-brand-200 uppercase tracking-wide">Net earnings</p>
              <p className="mt-2 text-2xl sm:text-3xl font-extrabold tabular-nums">{formatINR(totalEarnings)}</p>
              <p className="text-xs text-brand-200/80 mt-1.5">{paidJobs.length} settled job{paidJobs.length === 1 ? "" : "s"} • 90% member share</p>
            </div>
            <StatCard icon={<TrendingUp />} label="Gross service value" value={formatINR(totalGross)} sub={`Platform & welfare: ${formatINR(totalFees)}`} />
            <StatCard icon={<CheckCircle2 />} label="Paid jobs" value={String(paidJobs.length)} sub={`${activeCount} active now`} />
            <StatCard icon={<Wallet />} label="Cancelled" value={String(cancelledCount)} sub="No payout on cancellations" />
          </div>

          <Card className="mt-5 overflow-hidden">
            <div className="px-5 py-4 border-b border-line flex items-center justify-between">
              <h3 className="font-bold text-ink-900">Settlement history</h3>
              <span className="text-xs text-ink-400">{paidJobs.length} entries</span>
            </div>
            {paidJobs.length === 0 ? (
              <EmptyState
                compact
                icon={<Wallet />}
                title="No settlements yet"
                description="Complete a job and record payment — your net share will appear here instantly."
              />
            ) : (
              <>
                {/* Desktop table */}
                <table className="hidden md:table w-full section-gap text-sm">
                  <thead>
                    <tr className="text-left text-xs text-ink-400 uppercase tracking-wide border-b border-line">
                      <th className="px-5 py-3 font-semibold">Service</th>
                      <th className="px-5 py-3 font-semibold">Booking</th>
                      <th className="px-5 py-3 font-semibold">Date</th>
                      <th className="px-5 py-3 font-semibold text-right">Gross</th>
                      <th className="px-5 py-3 font-semibold text-right">Fee (10%)</th>
                      <th className="px-5 py-3 font-semibold text-right">Net payout</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {paidJobs.map(({ booking, category }) => {
                      const gross = parseFloat(booking.finalPrice ?? "0");
                      const fee = parseFloat(booking.platformFee ?? "0");
                      return (
                        <tr key={booking.id} className="hover:bg-ink-50/60">
                          <td className="px-5 py-3 font-semibold text-ink-900">{category?.name ?? "Service"}</td>
                          <td className="px-5 py-3 font-mono text-xs text-ink-500">{bookingRef(booking.id)}</td>
                          <td className="px-5 py-3 text-ink-600 whitespace-nowrap">{formatDate(booking.createdAt)}</td>
                          <td className="px-5 py-3 text-right tabular-nums text-ink-700">{formatINR(gross)}</td>
                          <td className="px-5 py-3 text-right tabular-nums text-danger-600">-{formatINR(fee)}</td>
                          <td className="px-5 py-3 text-right tabular-nums font-bold text-success-700">{formatINR(gross - fee)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {/* Mobile cards */}
                <ul className="md:hidden divide-y divide-line">
                  {paidJobs.map(({ booking, category }) => {
                    const gross = parseFloat(booking.finalPrice ?? "0");
                    const fee = parseFloat(booking.platformFee ?? "0");
                    return (
                      <li key={booking.id} className="px-4 py-3.5 flex items-center gap-3">
                        <span className="size-9 rounded-xl bg-success-100 text-success-600 flex items-center justify-center shrink-0" aria-hidden>
                          <CheckCircle2 className="size-4.5" />
                        </span>
                        <span className="flex-1 min-w-0">
                          <span className="block text-sm font-semibold text-ink-900 truncate">{category?.name ?? "Service"}</span>
                          <span className="block text-2xs text-ink-400 mt-0.5 font-mono">{bookingRef(booking.id)} • {formatDate(booking.createdAt)}</span>
                        </span>
                        <span className="text-right shrink-0">
                          <span className="block text-sm font-bold text-success-700 tabular-nums">+{formatINR(gross - fee)}</span>
                          <span className="block text-2xs text-ink-400">net of {formatINR(fee)} fee</span>
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </>
            )}
          </Card>
        </>
      )}
    </PageContainer>
  );
}
