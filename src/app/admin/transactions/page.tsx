"use client";

import { useState, useEffect } from "react";
import { CreditCard, HandCoins, ReceiptText } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { bookingRef, formatDate, formatINR } from "@/lib/format";
import { PageContainer, PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat";
import { EmptyState } from "@/components/ui/states";

interface TxnRow {
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

export default function AdminTransactionsPage() {
  const [transactions, setTransactions] = useState<TxnRow[] | null>(null);

  useEffect(() => {
    apiFetch("/api/bookings?role=society_admin")
      .then((r) => r.json())
      .then((d) =>
        setTransactions(
          ((d as { bookings: TxnRow[] }).bookings ?? []).filter((b) => ["paid", "rated"].includes(b.booking.status))
        )
      )
      .catch(() => setTransactions([]));
  }, []);

  const list = transactions ?? [];
  const totalTransacted = list.reduce((sum, { booking }) => sum + parseFloat(booking.totalAmount ?? "0"), 0);
  const totalFees = list.reduce((sum, { booking }) => sum + parseFloat(booking.platformFee ?? "0"), 0);
  const providerPayouts = totalTransacted - totalFees;

  return (
    <PageContainer width="wide">
      <PageHeader
        title="Transactions"
        description="Settled payments, cooperative fee allocation and reconciliation."
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <div className="rounded-2xl bg-gradient-to-br from-brand-800 to-brand-950 text-white p-5 shadow-card">
          <p className="text-xs font-semibold text-brand-200 uppercase tracking-wide">Total settled</p>
          <p className="mt-2 text-2xl sm:text-3xl font-extrabold tabular-nums">{formatINR(totalTransacted)}</p>
          <p className="text-xs text-brand-200/80 mt-1.5">{list.length} completed transaction{list.length === 1 ? "" : "s"}</p>
        </div>
        <StatCard icon={<CreditCard />} label="Cooperative fee (10%)" value={formatINR(totalFees)} sub="8% society ops + 2% welfare" />
        <StatCard icon={<HandCoins />} label="Member payouts (90%)" value={formatINR(providerPayouts)} sub="Settled to provider ledgers" />
      </div>

      <Card className="mt-5 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-line">
          <h3 className="font-bold text-ink-900">Settlement records</h3>
          <span className="text-xs text-ink-400">{list.length} entries</span>
        </div>
        {transactions === null ? (
          <div className="divide-y divide-line">
            {[0, 1, 2].map((i) => (
              <div key={i} className="p-4">
                <div className="skeleton h-11 rounded-xl" />
              </div>
            ))}
          </div>
        ) : list.length === 0 ? (
          <EmptyState
            compact
            icon={<ReceiptText />}
            title="No settlements yet"
            description="Completed and paid bookings will be listed here with the full fee split."
          />
        ) : (
          <>
            <table className="hidden md:table w-full text-sm">
              <thead className="bg-ink-50/70">
                <tr className="text-left text-xs text-ink-400 uppercase tracking-wide border-b border-line">
                  <th className="px-5 py-3 font-semibold">Booking</th>
                  <th className="px-5 py-3 font-semibold">Category</th>
                  <th className="px-5 py-3 font-semibold">Settled on</th>
                  <th className="px-5 py-3 font-semibold text-right">Service value</th>
                  <th className="px-5 py-3 font-semibold text-right">Coop fee</th>
                  <th className="px-5 py-3 font-semibold text-right">Member payout</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {list.map(({ booking, category }) => {
                  const service = parseFloat(booking.finalPrice ?? "0");
                  const fee = parseFloat(booking.platformFee ?? "0");
                  return (
                    <tr key={booking.id} className="hover:bg-ink-50/60">
                      <td className="px-5 py-3 font-mono text-xs text-ink-600">{bookingRef(booking.id)}</td>
                      <td className="px-5 py-3 font-semibold text-ink-900">{category?.name ?? "Service"}</td>
                      <td className="px-5 py-3 text-ink-600 whitespace-nowrap">{formatDate(booking.createdAt)}</td>
                      <td className="px-5 py-3 text-right tabular-nums text-ink-700">{formatINR(booking.totalAmount ?? service)}</td>
                      <td className="px-5 py-3 text-right tabular-nums text-brand-700 font-semibold">{formatINR(fee)}</td>
                      <td className="px-5 py-3 text-right tabular-nums font-bold text-success-700">{formatINR(service - fee)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <ul className="md:hidden divide-y divide-line">
              {list.map(({ booking, category }) => {
                const service = parseFloat(booking.finalPrice ?? "0");
                const fee = parseFloat(booking.platformFee ?? "0");
                return (
                  <li key={booking.id} className="px-4 py-3.5">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-bold text-ink-900">{category?.name ?? "Service"}</p>
                      <p className="text-sm font-extrabold text-ink-900 tabular-nums">{formatINR(booking.totalAmount ?? service)}</p>
                    </div>
                    <p className="text-2xs text-ink-400 font-mono mt-1">
                      {bookingRef(booking.id)} • {formatDate(booking.createdAt)}
                    </p>
                    <div className="mt-2 grid grid-cols-2 gap-2 text-2xs">
                      <span className="rounded-lg bg-brand-50 text-brand-800 px-2 py-1.5">Fee {formatINR(fee)}</span>
                      <span className="rounded-lg bg-success-50 text-success-700 px-2 py-1.5 text-right font-bold">Payout {formatINR(service - fee)}</span>
                    </div>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </Card>
    </PageContainer>
  );
}
