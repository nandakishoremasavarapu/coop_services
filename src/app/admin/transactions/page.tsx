"use client";
import { useState, useEffect } from "react";
import { DollarSign, CreditCard, CheckCircle } from "lucide-react";
import { LoadingSpinner } from "@/components/LoadingSpinner";

export default function AdminTransactionsPage() {
  const [bookings, setBookings] = useState<{
    booking: { id: string; status: string; finalPrice?: string | null; platformFee?: string | null; totalAmount?: string | null; createdAt: string };
    category: { name: string } | null;
  }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/bookings?role=society_admin")
      .then((r) => r.json())
      .then((d) => setBookings((d as { bookings: typeof bookings }).bookings?.filter((b: { booking: { status: string } }) =>
        ["paid", "rated"].includes(b.booking.status)) ?? []))
      .finally(() => setLoading(false));
  }, []);

  const totalRevenue = bookings.reduce((sum, { booking }) => sum + parseFloat(booking.totalAmount ?? "0"), 0);
  const platformRevenue = bookings.reduce((sum, { booking }) => sum + parseFloat(booking.platformFee ?? "0"), 0);

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Transactions</h1>
        <p className="text-slate-500 text-sm mt-1">Payment records, invoices and reconciliation</p>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-green-600 rounded-2xl p-5 text-white">
          <DollarSign size={24} className="text-green-200 mb-2" />
          <div className="text-3xl font-bold">₹{totalRevenue.toFixed(0)}</div>
          <div className="text-green-100 text-sm">Total Transacted</div>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <CreditCard size={24} className="text-blue-500 mb-2" />
          <div className="text-3xl font-bold text-slate-900">₹{platformRevenue.toFixed(0)}</div>
          <div className="text-slate-500 text-sm">Platform Revenue</div>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <CheckCircle size={24} className="text-emerald-500 mb-2" />
          <div className="text-3xl font-bold text-slate-900">{bookings.length}</div>
          <div className="text-slate-500 text-sm">Completed Transactions</div>
        </div>
      </div>

      {loading && <div className="flex justify-center py-12"><LoadingSpinner /></div>}

      {!loading && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-5 py-3 text-slate-500 font-semibold">Booking ID</th>
                  <th className="text-left px-5 py-3 text-slate-500 font-semibold">Service</th>
                  <th className="text-left px-5 py-3 text-slate-500 font-semibold">Service Charge</th>
                  <th className="text-left px-5 py-3 text-slate-500 font-semibold">Platform Fee</th>
                  <th className="text-left px-5 py-3 text-slate-500 font-semibold">Total</th>
                  <th className="text-left px-5 py-3 text-slate-500 font-semibold">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {bookings.map(({ booking, category }) => (
                  <tr key={booking.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3 font-mono text-xs text-slate-500">#{booking.id.slice(-8).toUpperCase()}</td>
                    <td className="px-5 py-3 font-medium">{category?.name ?? "—"}</td>
                    <td className="px-5 py-3">₹{parseFloat(booking.finalPrice ?? "0").toFixed(0)}</td>
                    <td className="px-5 py-3 text-blue-600">₹{parseFloat(booking.platformFee ?? "0").toFixed(0)}</td>
                    <td className="px-5 py-3 font-bold">₹{parseFloat(booking.totalAmount ?? "0").toFixed(0)}</td>
                    <td className="px-5 py-3 text-slate-400">{new Date(booking.createdAt).toLocaleDateString("en-IN")}</td>
                  </tr>
                ))}
                {bookings.length === 0 && (
                  <tr><td colSpan={6} className="px-5 py-8 text-center text-slate-400">No transactions yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
