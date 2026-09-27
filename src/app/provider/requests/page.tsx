"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, MapPin, Clock, ChevronRight } from "lucide-react";
import { getServiceIcon } from "@/lib/serviceIcons";
import { LoadingSpinner } from "@/components/LoadingSpinner";

export default function ProviderRequestsPage() {
  const router = useRouter();
  const [requests, setRequests] = useState<{
    booking: { id: string; status: string; serviceDescription: string; address: string; city?: string | null; createdAt: string; isEmergency?: boolean | null };
    category: { name: string } | null;
  }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/bookings?role=provider")
      .then((r) => r.json())
      .then((d) => {
        const all = d.bookings ?? [];
        setRequests(all.filter((b: { booking: { status: string } }) => b.booking.status === "submitted"));
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-100 px-4 pt-4 md:pt-4 pb-4 sticky top-0 md:top-16 z-20">
        <div className="max-w-5xl mx-auto flex items-center gap-3">
          <button onClick={() => router.push("/provider")} className="p-2 hover:bg-slate-100 rounded-xl">
            <ArrowLeft size={20} className="text-slate-700" />
          </button>
          <h1 className="font-bold text-slate-900 text-lg">New Service Requests</h1>
        </div>
      </div>

      <div className="p-4 max-w-5xl mx-auto w-full">
        {loading && <div className="flex justify-center py-12"><LoadingSpinner label="Loading requests..." /></div>}

        {!loading && requests.length === 0 && (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">📥</div>
            <h2 className="font-bold text-slate-700 mb-2">No New Requests</h2>
            <p className="text-sm text-slate-500">Requests matching your skills and service area will appear here.</p>
          </div>
        )}

        <div className="space-y-3 md:grid md:grid-cols-2 md:gap-4 md:space-y-0">
          {requests.map(({ booking, category }) => (
            <button
              key={booking.id}
              onClick={() => router.push(`/provider/requests/${booking.id}`)}
              className={`w-full bg-white rounded-2xl p-4 shadow-sm border-2 hover:shadow-md transition-all text-left ${
                booking.isEmergency ? "border-red-200" : "border-slate-100 hover:border-blue-200"
              }`}
            >
              {booking.isEmergency && (
                <div className="inline-flex items-center gap-1 bg-red-100 text-red-700 text-xs font-bold px-2 py-0.5 rounded-full mb-2">
                  🚨 EMERGENCY
                </div>
              )}
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-2xl flex-shrink-0">
                  {getServiceIcon(category?.name ?? "")}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-slate-800">{category?.name ?? "Service"}</div>
                  <div className="text-sm text-slate-500 mt-0.5 line-clamp-2">{booking.serviceDescription}</div>
                  <div className="flex items-center gap-3 mt-2">
                    <div className="flex items-center gap-1 text-xs text-slate-400">
                      <MapPin size={10} /> {booking.city ?? booking.address}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-slate-400">
                      <Clock size={10} /> {new Date(booking.createdAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </div>
                </div>
                <ChevronRight size={16} className="text-slate-400 flex-shrink-0 mt-2" />
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
