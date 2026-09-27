"use client";
import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, MapPin, Clock, AlertTriangle, CheckCircle, DollarSign } from "lucide-react";
import { getServiceIcon } from "@/lib/serviceIcons";
import { LoadingSpinner } from "@/components/LoadingSpinner";

interface BookingData {
  booking: {
    id: string;
    status: string;
    serviceDescription: string;
    address: string;
    city?: string | null;
    pincode?: string | null;
    isEmergency?: boolean | null;
    preferredTime?: string | null;
    finalPrice?: string | null;
    createdAt: string;
  };
  category: { name: string } | null;
  service: { name: string } | null;
  customerProfile: { fullName: string } | null;
}

export default function RequestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [data, setData] = useState<BookingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [estimateAmount, setEstimateAmount] = useState("");
  const [estimateNote, setEstimateNote] = useState("");
  const [estimatedArrival, setEstimatedArrival] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    fetch(`/api/bookings/${id}`)
      .then((r) => r.json())
      .then((d) => setData(d as BookingData))
      .finally(() => setLoading(false));
  }, [id]);

  const submitEstimate = async () => {
    if (!estimateAmount) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId: id,
          amount: estimateAmount,
          note: estimateNote,
          estimatedArrival,
        }),
      });
      if (res.ok) {
        setSubmitted(true);
        setTimeout(() => router.push("/provider/requests"), 2000);
      } else {
        const d = await res.json() as { error?: string };
        alert(d.error ?? "Failed to submit estimate");
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><LoadingSpinner /></div>;
  if (!data?.booking) return <div className="min-h-screen flex items-center justify-center"><p>Not found</p></div>;

  const { booking, category, service, customerProfile } = data;

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <div className="text-5xl mb-4">✅</div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Estimate Submitted!</h2>
          <p className="text-slate-500 text-sm">The customer will review your quote and may select you as their provider.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-100 px-4 pt-12 pb-4 sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/provider/requests")} className="p-2 hover:bg-slate-100 rounded-xl">
            <ArrowLeft size={20} className="text-slate-700" />
          </button>
          <h1 className="font-bold text-slate-900">Service Request</h1>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Service info */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
          {booking.isEmergency && (
            <div className="inline-flex items-center gap-1 bg-red-100 text-red-700 text-xs font-bold px-2 py-0.5 rounded-full mb-3">
              🚨 EMERGENCY REQUEST
            </div>
          )}
          <div className="flex items-start gap-3">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center text-3xl">
              {getServiceIcon(category?.name ?? "")}
            </div>
            <div className="flex-1">
              <div className="font-bold text-slate-900">{category?.name ?? "Service"}</div>
              {service && <div className="text-sm text-blue-600">{service.name}</div>}
            </div>
          </div>

          <div className="mt-4 space-y-3">
            <div>
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Problem Description</div>
              <div className="text-sm text-slate-700 leading-relaxed">{booking.serviceDescription}</div>
            </div>
            <div className="flex items-start gap-2">
              <MapPin size={14} className="text-slate-400 mt-0.5 flex-shrink-0" />
              <span className="text-sm text-slate-600">{booking.address}{booking.city ? `, ${booking.city}` : ""} {booking.pincode}</span>
            </div>
            {booking.preferredTime && (
              <div className="flex items-center gap-2">
                <Clock size={14} className="text-slate-400" />
                <span className="text-sm text-slate-600">Preferred: {new Date(booking.preferredTime).toLocaleString()}</span>
              </div>
            )}
            <div className="text-xs text-slate-400">Customer: {customerProfile?.fullName ?? "Customer"}</div>
          </div>
        </div>

        {/* Initial Estimate Form */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
          <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
            <DollarSign size={18} className="text-green-600" />
            Submit Initial Estimate
          </h3>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4">
            <div className="flex items-start gap-2 text-xs text-amber-800">
              <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />
              <span>This is an <strong>initial estimate</strong> subject to on-site inspection. You can revise the price after seeing the actual work.</span>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Estimated Amount (₹) *</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-500">₹</span>
                <input
                  type="number"
                  value={estimateAmount}
                  onChange={(e) => setEstimateAmount(e.target.value)}
                  placeholder="0"
                  className="w-full pl-8 pr-4 py-3 border border-slate-200 rounded-xl text-slate-900 font-bold text-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Note to Customer (optional)</label>
              <textarea
                value={estimateNote}
                onChange={(e) => setEstimateNote(e.target.value)}
                placeholder="e.g. Will bring all necessary equipment. Can arrive by 10 AM..."
                rows={3}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Expected Arrival Time</label>
              <input
                type="text"
                value={estimatedArrival}
                onChange={(e) => setEstimatedArrival(e.target.value)}
                placeholder="e.g. Within 2 hours, 3:00 PM today"
                className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <button
              onClick={submitEstimate}
              disabled={!estimateAmount || submitting}
              className="w-full py-4 bg-green-600 text-white rounded-2xl font-bold hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {submitting ? <LoadingSpinner size={20} color="white" /> : "Submit Estimate →"}
            </button>

            <button className="w-full py-3 text-slate-500 text-sm hover:text-slate-700 transition-colors">
              Decline Request
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
