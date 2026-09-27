"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, TrendingUp, DollarSign, CheckCircle } from "lucide-react";
import { LoadingSpinner } from "@/components/LoadingSpinner";

export default function ProviderEarningsPage() {
  const router = useRouter();
  const [jobs, setJobs] = useState<{
    booking: { id: string; status: string; finalPrice?: string | null; platformFee?: string | null; totalAmount?: string | null; createdAt: string };
    category: { name: string } | null;
  }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/bookings?role=provider")
      .then((r) => r.json())
      .then((d) => setJobs(d.bookings ?? []))
      .finally(() => setLoading(false));
  }, []);

  const paidJobs = jobs.filter(({ booking }) => ["paid", "rated"].includes(booking.status));
  const totalEarnings = paidJobs.reduce((sum, { booking }) => {
    const service = parseFloat(booking.finalPrice ?? "0");
    const fee = parseFloat(booking.platformFee ?? "0");
    return sum + (service - fee);
  }, 0);
  const totalGross = paidJobs.reduce((sum, { booking }) => sum + parseFloat(booking.finalPrice ?? "0"), 0);
  const totalFees = paidJobs.reduce((sum, { booking }) => sum + parseFloat(booking.platformFee ?? "0"), 0);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-100 px-4 pt-4 md:pt-4 pb-4 sticky top-0 md:top-16 z-20">
        <div className="max-w-5xl mx-auto flex items-center gap-3">
          <button onClick={() => router.push("/provider")} className="p-2 hover:bg-slate-100 rounded-xl">
            <ArrowLeft size={20} className="text-slate-700" />
          </button>
          <h1 className="font-bold text-slate-900 text-lg">Earnings</h1>
        </div>
      </div>

      <div className="p-4 space-y-4 max-w-5xl mx-auto w-full">
        {loading && <div className="flex justify-center py-12"><LoadingSpinner /></div>}

        {!loading && (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-green-600 rounded-2xl p-4 text-white">
                <div className="text-green-100 text-xs mb-1">Net Earnings</div>
                <div className="text-3xl font-bold">₹{totalEarnings.toFixed(0)}</div>
                <div className="text-green-200 text-xs mt-1">{paidJobs.length} completed jobs</div>
              </div>
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
                <div className="text-slate-500 text-xs mb-1">Gross Service Value</div>
                <div className="text-2xl font-bold text-slate-900">₹{totalGross.toFixed(0)}</div>
                <div className="text-slate-400 text-xs mt-1">Platform fee: ₹{totalFees.toFixed(0)}</div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white rounded-2xl p-3 text-center shadow-sm border border-slate-100">
                <div className="text-lg font-bold text-blue-600">{paidJobs.length}</div>
                <div className="text-xs text-slate-500">Paid Jobs</div>
              </div>
              <div className="bg-white rounded-2xl p-3 text-center shadow-sm border border-slate-100">
                <div className="text-lg font-bold text-amber-500">
                  {jobs.filter(({ booking }) => ["accepted", "arrived", "work_started"].includes(booking.status)).length}
                </div>
                <div className="text-xs text-slate-500">Active</div>
              </div>
              <div className="bg-white rounded-2xl p-3 text-center shadow-sm border border-slate-100">
                <div className="text-lg font-bold text-slate-600">
                  {jobs.filter(({ booking }) => booking.status === "cancelled").length}
                </div>
                <div className="text-xs text-slate-500">Cancelled</div>
              </div>
            </div>

            {/* Transactions */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100">
                <h3 className="font-bold text-slate-900">Transaction History</h3>
              </div>
              {paidJobs.length === 0 ? (
                <div className="p-8 text-center text-slate-500">No completed transactions yet</div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {paidJobs.map(({ booking, category }) => (
                    <div key={booking.id} className="px-4 py-3 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                        <CheckCircle size={14} className="text-green-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-slate-800 text-sm truncate">{category?.name ?? "Service"}</div>
                        <div className="text-xs text-slate-400">{new Date(booking.createdAt).toLocaleDateString("en-IN")}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-green-700 text-sm">
                          +₹{(parseFloat(booking.finalPrice ?? "0") - parseFloat(booking.platformFee ?? "0")).toFixed(0)}
                        </div>
                        <div className="text-xs text-slate-400">net</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
