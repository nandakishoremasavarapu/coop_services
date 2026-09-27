"use client";
import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle, Clock } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { apiFetch } from "@/lib/api";

interface BookingData {
  booking: { id: string; status: string; serviceDescription: string; address: string; createdAt: string; updatedAt: string; finalPrice?: string | null; platformFee?: string | null; totalAmount?: string | null };
  category: { name: string } | null;
  service: { name: string } | null;
  providerProfile: { displayName: string; ratingAvg?: string | null } | null;
  customerProfile: { fullName: string } | null;
  quotes: Array<{ quote: { id: string; amount: string; note?: string | null; createdAt: string }; provider: { displayName: string } | null }>;
  priceRevisions: Array<{ id: string; originalAmount?: string | null; proposedAmount: string; reason: string; status?: string | null; createdAt: string }>;
  payment: { id: string; method: string; paidAmount?: string | null; status: string; transactionRef?: string | null } | null;
  invoice: { invoiceNumber: string; totalAmount?: string | null; issuedAt?: string | null } | null;
  rating: { rating: number; reviewText?: string | null } | null;
}

export default function AdminBookingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [data, setData] = useState<BookingData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch(`/api/bookings/${id}`)
      .then((r) => r.json())
      .then((d) => setData(d as BookingData))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><LoadingSpinner /></div>;
  if (!data?.booking) return <div className="p-6 text-center text-slate-500">Booking not found</div>;

  const { booking, category, service, providerProfile, customerProfile, quotes, priceRevisions, payment, invoice, rating } = data;

  return (
    <div className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.push("/admin/bookings")} className="p-2 hover:bg-white rounded-xl transition-colors">
          <ArrowLeft size={20} className="text-slate-700" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Booking #{id.slice(-8).toUpperCase()}</h1>
          <div className="flex items-center gap-2 mt-0.5">
            <StatusBadge status={booking.status} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Core Details */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <h3 className="font-bold text-slate-900 mb-4">Booking Details</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-slate-500">Service</span><span className="font-medium">{category?.name ?? "—"}</span></div>
            {service && <div className="flex justify-between"><span className="text-slate-500">Specific</span><span className="font-medium">{service.name}</span></div>}
            <div className="flex justify-between"><span className="text-slate-500">Customer</span><span className="font-medium">{customerProfile?.fullName ?? "—"}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Provider</span><span className="font-medium">{providerProfile?.displayName ?? "Not assigned"}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Address</span><span className="font-medium text-right max-w-xs">{booking.address}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Created</span><span className="font-medium">{new Date(booking.createdAt).toLocaleString()}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Last Updated</span><span className="font-medium">{new Date(booking.updatedAt).toLocaleString()}</span></div>
          </div>
          <div className="mt-3 border-t border-slate-100 pt-3">
            <div className="text-xs font-semibold text-slate-500 uppercase mb-1">Description</div>
            <div className="text-sm text-slate-700">{booking.serviceDescription}</div>
          </div>
        </div>

        {/* Financial */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <h3 className="font-bold text-slate-900 mb-4">Financial Summary</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-slate-500">Service Charge</span><span className="font-semibold">{booking.finalPrice ? `₹${parseFloat(booking.finalPrice).toFixed(0)}` : "—"}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Platform Fee (10%)</span><span className="font-semibold">{booking.platformFee ? `₹${parseFloat(booking.platformFee).toFixed(0)}` : "—"}</span></div>
            <div className="flex justify-between border-t pt-2 font-bold"><span>Total</span><span className="text-blue-700">{booking.totalAmount ? `₹${parseFloat(booking.totalAmount).toFixed(0)}` : "—"}</span></div>
          </div>

          {payment && (
            <div className="mt-4 bg-green-50 border border-green-200 rounded-xl p-3">
              <div className="text-xs font-semibold text-green-700 mb-1">Payment Record</div>
              <div className="text-sm space-y-1">
                <div className="flex justify-between"><span className="text-slate-500">Method</span><span className="capitalize">{payment.method}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Status</span><span className="font-semibold text-green-700">{payment.status}</span></div>
                {payment.transactionRef && <div className="flex justify-between"><span className="text-slate-500">Ref</span><span className="font-mono text-xs">{payment.transactionRef}</span></div>}
              </div>
            </div>
          )}

          {invoice && (
            <div className="mt-3 bg-blue-50 border border-blue-100 rounded-xl p-3">
              <div className="text-xs font-semibold text-blue-700 mb-1">Invoice</div>
              <div className="text-sm"><span className="font-mono">{invoice.invoiceNumber}</span></div>
            </div>
          )}
        </div>

        {/* Quotes */}
        {quotes.length > 0 && (
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
            <h3 className="font-bold text-slate-900 mb-4">Provider Quotes ({quotes.length})</h3>
            <div className="space-y-3">
              {quotes.map(({ quote, provider }) => (
                <div key={quote.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                  <div>
                    <div className="font-medium text-slate-800">{provider?.displayName ?? "Provider"}</div>
                    {quote.note && <div className="text-xs text-slate-500 italic mt-0.5">&ldquo;{quote.note}&rdquo;</div>}
                    <div className="text-xs text-slate-400 mt-1">{new Date(quote.createdAt).toLocaleString()}</div>
                  </div>
                  <div className="font-bold text-slate-900">₹{parseFloat(quote.amount).toFixed(0)}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Price Revisions */}
        {priceRevisions.length > 0 && (
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
            <h3 className="font-bold text-slate-900 mb-4">Price Revisions</h3>
            <div className="space-y-3">
              {priceRevisions.map((rev) => (
                <div key={rev.id} className="p-3 bg-orange-50 border border-orange-100 rounded-xl">
                  <div className="flex items-center justify-between mb-1">
                    <div className="text-xs font-semibold text-orange-700 uppercase tracking-wide">Revision</div>
                    <StatusBadge status={rev.status ?? "pending"} size="sm" />
                  </div>
                  <div className="text-sm space-y-1">
                    <div className="flex justify-between"><span className="text-slate-500">Original</span><span>₹{parseFloat(rev.originalAmount ?? "0").toFixed(0)}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Proposed</span><span className="font-bold">₹{parseFloat(rev.proposedAmount).toFixed(0)}</span></div>
                  </div>
                  <div className="text-xs text-slate-500 mt-2">{rev.reason}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Rating */}
        {rating && (
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
            <h3 className="font-bold text-slate-900 mb-3">Customer Rating</h3>
            <div className="flex items-center gap-2 mb-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <span key={i} className={i < rating.rating ? "text-amber-400 text-xl" : "text-slate-200 text-xl"}>★</span>
              ))}
              <span className="font-bold text-slate-700">{rating.rating}/5</span>
            </div>
            {rating.reviewText && <p className="text-sm text-slate-600 italic">&ldquo;{rating.reviewText}&rdquo;</p>}
          </div>
        )}
      </div>
    </div>
  );
}
