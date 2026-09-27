"use client";
import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, MapPin, CheckCircle, AlertTriangle, DollarSign } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { SwipeButton } from "@/components/SwipeButton";
import { getServiceIcon } from "@/lib/serviceIcons";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { StarRating } from "@/components/StarRating";
import { apiFetch } from "@/lib/api";

interface BookingData {
  booking: {
    id: string;
    status: string;
    serviceDescription: string;
    mediaUrls?: string[] | null;
    address: string;
    city?: string | null;
    finalPrice?: string | null;
    platformFee?: string | null;
    totalAmount?: string | null;
    createdAt: string;
  };
  category: { name: string } | null;
  customerProfile: { fullName: string } | null;
  payment: { id: string; status: string; method: string } | null;
  rating: { rating: number; reviewText?: string | null } | null;
}

export default function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [data, setData] = useState<BookingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showPriceRevision, setShowPriceRevision] = useState(false);
  const [additionalAmount, setAdditionalAmount] = useState("");
  const [revisionReason, setRevisionReason] = useState("");
  const [cashAmount, setCashAmount] = useState("");

  const fetchData = async () => {
    const res = await apiFetch(`/api/bookings/${id}`);
    const d = await res.json();
    setData(d as BookingData);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [id]);

  const performAction = async (action: string, extra: Record<string, unknown> = {}) => {
    setActionLoading(true);
    try {
      const res = await apiFetch(`/api/bookings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...extra }),
      });
      const d = await res.json() as { error?: string };
      if (res.ok) await fetchData();
      else alert(d.error ?? "Action failed");
    } finally {
      setActionLoading(false);
    }
  };

  const submitPriceRevision = async () => {
    if (!additionalAmount || !revisionReason) return;
    setActionLoading(true);
    try {
      const originalAmount = parseFloat(data?.booking.finalPrice ?? "0");
      const proposedAmount = originalAmount + parseFloat(additionalAmount);
      const res = await apiFetch("/api/price-revisions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId: id,
          originalAmount,
          proposedAmount,
          reason: revisionReason,
        }),
      });
      const d = await res.json() as { error?: string };
      if (res.ok) {
        setShowPriceRevision(false);
        await fetchData();
      } else {
        alert(d.error ?? "Failed to submit revision");
      }
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><LoadingSpinner /></div>;
  if (!data?.booking) return <div className="p-4 text-center">Booking not found</div>;

  const { booking, category, customerProfile, payment, rating } = data;
  const status = booking.status;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-100 px-4 pt-12 pb-4 sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/provider/jobs")} className="p-2 hover:bg-slate-100 rounded-xl">
            <ArrowLeft size={20} className="text-slate-700" />
          </button>
          <div className="flex-1">
            <h1 className="font-bold text-slate-900">{category?.name ?? "Job"}</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <StatusBadge status={status} size="sm" />
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Job Info */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
          <div className="flex items-start gap-3 mb-3">
            <div className="w-14 h-14 rounded-2xl bg-green-50 flex items-center justify-center text-3xl">
              {getServiceIcon(category?.name ?? "")}
            </div>
            <div>
              <div className="font-bold text-slate-900">{category?.name ?? "Service"}</div>
              <div className="text-sm text-slate-500 mt-1">{booking.serviceDescription}</div>
            </div>
          </div>
          <div className="flex items-start gap-2 text-sm text-slate-600">
            <MapPin size={14} className="mt-0.5 flex-shrink-0 text-slate-400" />
            {booking.address}{booking.city ? `, ${booking.city}` : ""}
          </div>
          {customerProfile && (
            <div className="mt-2 text-xs text-slate-400">Customer: {customerProfile.fullName}</div>
          )}

          {booking.mediaUrls && booking.mediaUrls.length > 0 && (
            <div className="mt-3 pt-3 border-t border-slate-100">
              <span className="text-xs font-semibold text-slate-700 block mb-2">Customer Attachments:</span>
              <div className="flex flex-wrap gap-2">
                {booking.mediaUrls.map((url, idx) => {
                  const isAudio = url.startsWith("data:audio") || /\.(mp3|wav|ogg|webm|m4a)/i.test(url);
                  if (isAudio) {
                    return (
                      <div key={idx} className="w-full bg-slate-50 p-2 rounded-xl border border-slate-200">
                        <span className="text-xs font-medium text-slate-700 block mb-1">Customer Voice Note:</span>
                        <audio src={url} controls className="w-full h-8" />
                      </div>
                    );
                  }
                  return (
                    <a key={idx} href={url} target="_blank" rel="noopener noreferrer" className="block relative w-16 h-16 rounded-xl overflow-hidden border border-slate-200 shadow-2xs">
                      <img src={url} alt={`Attachment ${idx + 1}`} className="w-full h-full object-cover" />
                    </a>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Pricing */}
        {booking.finalPrice && (
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
            <h3 className="font-semibold text-slate-700 mb-3 text-sm flex items-center gap-2">
              <DollarSign size={16} className="text-green-600" /> Payment Summary
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-slate-500">Service Charge</span><span className="font-semibold">₹{parseFloat(booking.finalPrice).toFixed(0)}</span></div>
              {booking.platformFee && <div className="flex justify-between"><span className="text-slate-500">Platform Fee (deducted)</span><span className="text-red-600">-₹{parseFloat(booking.platformFee).toFixed(0)}</span></div>}
              <div className="flex justify-between font-bold border-t pt-2">
                <span>Your Earnings</span>
                <span className="text-green-700">₹{(parseFloat(booking.finalPrice) - parseFloat(booking.platformFee ?? "0")).toFixed(0)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Action Swipe Buttons */}
        {status === "provider_selected" && (
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-blue-200">
            <div className="text-sm font-semibold text-slate-700 mb-3">A customer has selected you! Accept to confirm the booking.</div>
            <SwipeButton
              label="Swipe to Accept Booking →"
              onComplete={() => performAction("accept_booking", { initialAmount: booking.finalPrice })}
              color="#1a56db"
            />
          </div>
        )}

        {status === "accepted" && (
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-teal-200">
            <div className="text-sm text-slate-600 mb-3">Travel to the customer location and swipe when you arrive.</div>
            <SwipeButton
              label="Swipe when Arrived →"
              onComplete={() => performAction("mark_arrived")}
              color="#0d9488"
            />
          </div>
        )}

        {status === "arrived_pending_confirmation" && (
          <div className="bg-teal-50 rounded-2xl p-4 border border-teal-200">
            <div className="flex items-center gap-2 text-teal-800">
              <CheckCircle size={16} />
              <span className="font-semibold">Arrival marked — waiting for customer confirmation</span>
            </div>
            <p className="text-sm text-teal-600 mt-1">The customer needs to confirm your arrival before work can begin.</p>
          </div>
        )}

        {status === "arrived" && (
          <div className="space-y-3">
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
              <div className="font-semibold text-slate-700 mb-2">On-Site Inspection</div>
              <p className="text-sm text-slate-500 mb-3">After inspecting the actual work, you can either proceed with the original estimate or request a price change.</p>
              <div className="flex gap-2">
                <SwipeButton
                  label="Swipe to Start Work →"
                  onComplete={() => performAction("start_work")}
                  color="#2563eb"
                />
              </div>
            </div>
            <button
              onClick={() => setShowPriceRevision(!showPriceRevision)}
              className="w-full py-3 border border-orange-300 text-orange-700 rounded-xl font-semibold hover:bg-orange-50 transition-colors text-sm"
            >
              Request Price Change
            </button>
          </div>
        )}

        {status === "price_confirmed" && (
          <div className="space-y-3">
            <div className="bg-green-50 border border-green-200 rounded-2xl p-3">
              <div className="flex items-center gap-2 text-green-800">
                <CheckCircle size={16} />
                <span className="font-semibold text-sm">Price revision approved by customer</span>
              </div>
            </div>
            <SwipeButton
              label="Swipe to Start Work →"
              onComplete={() => performAction("start_work")}
              color="#2563eb"
            />
          </div>
        )}

        {status === "work_started" && (
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 space-y-3">
            <div className="font-semibold text-slate-700 mb-2 text-sm">Work is in progress. Swipe when the job is fully completed.</div>
            <SwipeButton
              label="Swipe — Work Completed →"
              onComplete={() => performAction("complete_work")}
              color="#16a34a"
            />
          </div>
        )}

        {status === "completed_pending_confirmation" && (
          <div className="bg-green-50 rounded-2xl p-4 border border-green-200">
            <div className="flex items-center gap-2 text-green-800">
              <CheckCircle size={16} />
              <span className="font-semibold">Completion submitted — waiting for customer confirmation</span>
            </div>
          </div>
        )}

        {status === "completed" && !payment && (
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
            <h3 className="font-bold text-slate-900 mb-3">Collect Payment</h3>
            <div className="flex gap-2 mb-3">
              <button
                onClick={() => performAction("record_payment", { method: "cash", amount: booking.totalAmount })}
                disabled={actionLoading}
                className="flex-1 py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition-colors disabled:opacity-50 text-sm"
              >
                💵 Cash Collected
              </button>
              <button
                onClick={() => performAction("record_payment", { method: "online", amount: booking.totalAmount })}
                disabled={actionLoading}
                className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 text-sm"
              >
                📱 Online Paid
              </button>
            </div>
            <div className="text-center text-sm text-slate-500">
              Total: <span className="font-bold">₹{parseFloat(booking.totalAmount ?? "0").toFixed(0)}</span>
            </div>
          </div>
        )}

        {["paid", "rated"].includes(status) && (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-4">
            <div className="flex items-center gap-2 text-green-800 mb-2">
              <CheckCircle size={16} />
              <span className="font-bold">Job Completed & Paid</span>
            </div>
            {rating && (
              <div>
                <div className="text-sm text-green-700 mb-1">Customer Rating:</div>
                <StarRating rating={rating.rating} size={20} showNumber />
                {rating.reviewText && <p className="text-xs text-green-600 mt-1 italic">&ldquo;{rating.reviewText}&rdquo;</p>}
              </div>
            )}
          </div>
        )}

        {/* Price Revision Form */}
        {showPriceRevision && (
          <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4">
            <h3 className="font-bold text-orange-800 mb-3 flex items-center gap-2">
              <AlertTriangle size={16} /> Request Price Change
            </h3>
            <div className="bg-white rounded-xl p-3 mb-3">
              <div className="text-sm text-slate-500 mb-1">Current agreed amount:</div>
              <div className="font-bold text-slate-900">₹{parseFloat(booking.finalPrice ?? "0").toFixed(0)}</div>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-semibold text-orange-700 mb-1">Additional Amount (₹)</label>
                <input
                  type="number"
                  value={additionalAmount}
                  onChange={(e) => setAdditionalAmount(e.target.value)}
                  placeholder="e.g. 200"
                  className="w-full px-4 py-3 border border-orange-200 rounded-xl text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
                {additionalAmount && (
                  <div className="text-xs text-orange-600 mt-1">
                    Revised total: ₹{(parseFloat(booking.finalPrice ?? "0") + parseFloat(additionalAmount || "0")).toFixed(0)}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-semibold text-orange-700 mb-1">Reason for Change *</label>
                <textarea
                  value={revisionReason}
                  onChange={(e) => setRevisionReason(e.target.value)}
                  placeholder="e.g. Found additional wiring damage that requires replacement parts and extra work..."
                  rows={3}
                  className="w-full px-4 py-3 border border-orange-200 rounded-xl text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={submitPriceRevision}
                  disabled={!additionalAmount || !revisionReason || actionLoading}
                  className="flex-1 py-3 bg-orange-600 text-white rounded-xl font-semibold hover:bg-orange-700 transition-colors disabled:opacity-50"
                >
                  Send to Customer
                </button>
                <button
                  onClick={() => setShowPriceRevision(false)}
                  className="flex-1 py-3 border border-orange-300 text-orange-700 rounded-xl font-semibold hover:bg-orange-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
