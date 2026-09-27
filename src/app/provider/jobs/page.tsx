"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { getServiceIcon } from "@/lib/serviceIcons";
import { LoadingSpinner } from "@/components/LoadingSpinner";

export default function ProviderJobsPage() {
  const router = useRouter();
  const [jobs, setJobs] = useState<{
    booking: { id: string; status: string; serviceDescription: string; finalPrice?: string | null; createdAt: string };
    category: { name: string } | null;
  }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/bookings?role=provider")
      .then((r) => r.json())
      .then((d) => setJobs((d.bookings ?? []).filter((b: { booking: { status: string } }) => b.booking.status !== "submitted")))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-100 px-4 pt-4 md:pt-4 pb-4 sticky top-0 md:top-16 z-20">
        <div className="max-w-6xl mx-auto flex items-center gap-3">
          <button onClick={() => router.push("/provider")} className="p-2 hover:bg-slate-100 rounded-xl">
            <ArrowLeft size={20} className="text-slate-700" />
          </button>
          <h1 className="font-bold text-slate-900 text-lg">My Jobs</h1>
        </div>
      </div>

      <div className="p-4 max-w-6xl mx-auto w-full">
        {loading && <div className="flex justify-center py-12"><LoadingSpinner /></div>}
        {!loading && jobs.length === 0 && (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">💼</div>
            <h2 className="font-bold text-slate-700 mb-2">No Jobs Yet</h2>
            <p className="text-sm text-slate-500">Jobs you are assigned to will appear here.</p>
          </div>
        )}
        <div className="space-y-3 md:grid md:grid-cols-2 lg:grid-cols-3 md:gap-4 md:space-y-0">
          {jobs.map(({ booking, category }) => (
            <button
              key={booking.id}
              onClick={() => router.push(`/provider/jobs/${booking.id}`)}
              className="w-full bg-white rounded-2xl p-4 shadow-sm border border-slate-100 hover:shadow-md transition-all text-left"
            >
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-2xl bg-green-50 flex items-center justify-center text-2xl">
                  {getServiceIcon(category?.name ?? "")}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-slate-800">{category?.name ?? "Service"}</div>
                  <div className="text-xs text-slate-500 truncate mt-0.5">{booking.serviceDescription}</div>
                  <div className="mt-2">
                    <StatusBadge status={booking.status} size="sm" />
                  </div>
                </div>
                {booking.finalPrice && (
                  <div className="text-right flex-shrink-0">
                    <div className="font-bold text-green-700">₹{parseFloat(booking.finalPrice).toFixed(0)}</div>
                    <div className="text-xs text-slate-400">service fee</div>
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
