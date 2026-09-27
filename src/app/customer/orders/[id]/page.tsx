"use client";

import React, { useState, useEffect, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BadgeCheck,
  CalendarDays,
  MapPin,
  MessageSquare,
  Phone,
  RefreshCcw,
  Radio,
  ShieldCheck,
  Star,
  Zap,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/cn";
import { bookingRef, formatDateTime, formatINR } from "@/lib/format";
import { ServiceIcon } from "@/lib/serviceIcons";
import { LoadingBlock, EmptyState, Toast } from "@/components/ui/states";
import { Button, buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageContainer, PageHeader } from "@/components/ui/page-header";
import { StatusBadge, Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { StarRating } from "@/components/StarRating";
import { BookingTimeline } from "@/components/ui/timeline";
import { Textarea } from "@/components/ui/form";

interface BookingData {
  booking: {
    id: string;
    status: string;
    serviceDescription: string;
    mediaUrls?: string[] | null;
    address: string;
    finalPrice?: string | null;
    platformFee?: string | null;
    totalAmount?: string | null;
    providerId?: string | null;
    isEmergency?: boolean | null;
    preferredTime?: string | null;
    createdAt: string;
  };
  category: { id: string; name: string } | null;
  service: { id: string; name: string } | null;
  customerProfile: { fullName?: string } | null;
  providerProfile: {
    id: string;
    displayName: string;
    ratingAvg?: string | null;
    ratingCount?: number | null;
    experience?: number | null;
    serviceArea?: string | null;
  } | null;
  quotes: Array<{
    quote: {
      id: string;
      providerId: string;
      amount: string;
      note?: string | null;
      estimatedArrival?: string | null;
      status?: string | null;
      createdAt?: string;
    };
    provider: {
      displayName: string;
      ratingAvg?: string | null;
      ratingCount?: number | null;
      experience?: number | null;
      serviceArea?: string | null;
    } | null;
  }>;
  priceRevisions: Array<{
    id: string;
    originalAmount?: string | null;
    proposedAmount: string;
    reason: string;
    status?: string | null;
  }>;
  payment: { id: string; method: string; paidAmount?: string | null; status: string } | null;
  invoice: {
    id: string;
    invoiceNumber: string;
    serviceAmount?: string | null;
    platformFee?: string | null;
    totalAmount?: string | null;
  } | null;
  rating: { id: string; rating: number; reviewText?: string | null } | null;
}

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [data, setData] = useState<BookingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ title: string; desc: string } | null>(null);
  const [ratingVal, setRatingVal] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"online" | "cash">("online");

  const fetchData = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await apiFetch(`/api/bookings/${id}`);
      const d = await res.json();
      setData(d as BookingData);
    } catch (e) {
      console.error("Failed to fetch booking", e);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(() => void fetchData(), 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const showToast = (title: string, desc: string) => {
    setToastMessage({ title, desc });
    setTimeout(() => setToastMessage(null), 4500);
  };

  const performAction = async (action: string, extra: Record<string, unknown> = {}) => {
    setActionLoading(true);
    try {
      const res = await apiFetch(`/api/bookings/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ action, ...extra }),
      });
      const d = await res.json();
      if (res.ok) {
        await fetchData(true);
      } else {
        showToast("Action failed", d.error ?? "Please try again.");
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleSelectProvider = async (providerId: string, providerName: string, quoteAmount: string) => {
    await performAction("select_provider", {
      providerId,
      initialAmount: quoteAmount.replace(/[^0-9.]/g, ""),
    });
    showToast(`${providerName} selected`, "Amount held in cooperative escrow until completion.");
  };

  if (loading) {
    return <LoadingBlock label="Loading your booking…" className="py-24" />;
  }

  if (!data?.booking) {
    return (
      <PageContainer width="narrow">
        <EmptyState
          title="Booking not found"
          description="This booking may have been removed, or the link is incomplete."
          action={
            <Button onClick={() => router.push("/customer/orders")}>View all orders</Button>
          }
        />
      </PageContainer>
    );
  }

  const { booking, category, service, providerProfile, quotes, priceRevisions, payment, invoice, rating } = data;
  const status = booking.status;
  const isQuoting = status === "submitted" || status === "quoted";
  const latestRevision = priceRevisions[priceRevisions.length - 1];
  const isCancelled = ["cancelled", "cancellation_pending", "disputed"].includes(status);

  return (
    <PageContainer width="default">
      <PageHeader
        backHref="/customer/orders"
        title={isQuoting ? "Compare provider quotes" : (category?.name ?? "Order tracking")}
        description={booking.serviceDescription}
        meta={
          <>
            <StatusBadge status={status} size="sm" />
            <Badge intent="neutral" dot={false}>
              <span className="font-mono">{bookingRef(id)}</span>
            </Badge>
            {booking.isEmergency ? (
              <Badge intent="warning" dot={false}>
                <Zap className="size-3 mr-0.5" aria-hidden /> Immediate
              </Badge>
            ) : null}
          </>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
        {/* ================================================= Main column */}
        <div className="lg:col-span-2 space-y-5">
          {/* ---------- Cancelled banner ---------- */}
          {isCancelled && (
            <Card className="p-5 border-l-4 border-l-danger-400">
              <p className="font-bold text-ink-900">{status === "disputed" ? "This booking is disputed" : "This booking was cancelled"}</p>
              <p className="text-sm text-ink-500 mt-1">
                Contact the society helpdesk if you believe this is a mistake.
              </p>
              <div className="mt-4 flex gap-2.5">
                <Link href="/customer/book" className={buttonClasses({ size: "sm" })}>
                  Book again
                </Link>
                <a href="tel:18004198800" className={buttonClasses({ variant: "outline", size: "sm" })}>
                  <Phone className="size-4" aria-hidden /> Helpdesk
                </a>
              </div>
            </Card>
          )}

          {/* ---------- Quotes comparison ---------- */}
          {isQuoting && (
            <>
              <Card className="p-5">
                <div className="flex items-start gap-3.5">
                  <span className="relative mt-1 size-2.5 shrink-0" aria-hidden>
                    <span className="absolute inline-flex h-full w-full rounded-full bg-brand-500 opacity-60 animate-ping" />
                    <span className="relative inline-flex size-2.5 rounded-full bg-brand-600" />
                  </span>
                  <div>
                    <p className="text-sm font-bold text-ink-900">
                      {quotes.length > 0
                        ? `${quotes.length} quote${quotes.length > 1 ? "s" : ""} received — select your specialist`
                        : "Broadcasting to certified members nearby…"}
                    </p>
                    <p className="text-xs text-ink-500 mt-1 leading-relaxed">
                      Estimates follow cooperative benchmark rates. You approve the final price on-site
                      before work starts.
                    </p>
                  </div>
                  <Button variant="ghost" size="icon-sm" onClick={() => fetchData()} aria-label="Refresh quotes" className="ml-auto shrink-0">
                    <RefreshCcw className="size-4" />
                  </Button>
                </div>
              </Card>

              {quotes.length === 0 ? (
                <Card className="p-6 text-center">
                  <span className="size-12 rounded-2xl bg-brand-50 text-brand-700 inline-flex items-center justify-center" aria-hidden>
                    <Radio className="size-6" />
                  </span>
                  <h3 className="mt-3 font-bold text-ink-900">Waiting for quotes</h3>
                  <p className="mt-1 text-sm text-ink-500 max-w-sm mx-auto leading-relaxed">
                    Your request is live with technicians in your area. Quotes usually arrive within a
                    few minutes — we&apos;ll keep this page updated.
                  </p>
                  <Button variant="secondary" size="sm" className="mt-4" onClick={() => fetchData()}>
                    <RefreshCcw className="size-4" aria-hidden />
                    Refresh now
                  </Button>
                </Card>
              ) : (
                <div className="space-y-4">
                  {quotes.map(({ quote, provider }) => (
                    <Card key={quote.id} className="p-5">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="flex items-center gap-3.5 min-w-0">
                          <Avatar name={provider?.displayName ?? "Member"} size="lg" />
                          <div className="min-w-0">
                            <p className="font-bold text-ink-900 truncate flex items-center gap-1.5">
                              {provider?.displayName ?? "Cooperative member"}
                              <BadgeCheck className="size-4 text-brand-600 shrink-0" aria-hidden />
                            </p>
                            <p className="text-xs text-ink-500 mt-0.5 truncate">
                              {provider?.experience ? `${provider.experience}y experience` : "Society member"}
                              {provider?.serviceArea ? ` • ${provider.serviceArea}` : ""}
                            </p>
                            {Number(provider?.ratingAvg) > 0 && (
                              <p className="text-xs font-semibold text-ink-700 mt-1 inline-flex items-center gap-1">
                                <Star className="size-3.5 fill-accent-400 text-accent-400" aria-hidden />
                                {provider?.ratingAvg}
                                {provider?.ratingCount ? <span className="text-ink-400 font-normal">({provider.ratingCount})</span> : null}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xl font-extrabold text-ink-900 tabular-nums">{formatINR(quote.amount)}</p>
                          <p className="text-2xs text-ink-400">Initial estimate</p>
                        </div>
                      </div>

                      {(quote.note || quote.estimatedArrival) && (
                        <div className="mt-4 grid sm:grid-cols-2 gap-2.5">
                          {quote.note && (
                            <div className="sm:col-span-2 rounded-xl bg-ink-50 border border-line px-3.5 py-2.5 text-sm text-ink-700 leading-relaxed">
                              {quote.note}
                            </div>
                          )}
                          {quote.estimatedArrival && (
                            <Badge intent="info" dot={false} className="w-fit">
                              Arrival: {quote.estimatedArrival}
                            </Badge>
                          )}
                        </div>
                      )}

                      <div className="mt-4 pt-4 border-t border-line flex items-center gap-2.5">
                        <Link
                          href={`/customer/messages?bookingId=${id}&providerId=${quote.providerId}`}
                          className={buttonClasses({ variant: "outline", size: "md", className: "shrink-0" })}
                        >
                          <MessageSquare className="size-4" aria-hidden />
                          Chat
                        </Link>
                        <Button
                          className="flex-1"
                          loading={actionLoading}
                          onClick={() =>
                            handleSelectProvider(
                              quote.providerId,
                              provider?.displayName ?? "Provider",
                              quote.amount
                            )
                          }
                        >
                          Select this provider
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}

              <div className="rounded-2xl border border-brand-100 bg-brand-50/60 p-4 flex gap-3">
                <ShieldCheck className="size-5 text-brand-700 shrink-0" aria-hidden />
                <p className="text-xs text-brand-900/90 leading-relaxed">
                  <strong>Escrow protection:</strong> payment is held by the cooperative and released only
                  after you confirm the completed work.
                </p>
              </div>
            </>
          )}

          {/* ---------- Assigned provider ---------- */}
          {!isQuoting && providerProfile && (
            <Card className="p-5">
              <p className="text-xs font-bold uppercase tracking-[0.08em] text-ink-400 mb-3.5">Assigned specialist</p>
              <div className="flex items-center gap-4">
                <Avatar name={providerProfile.displayName} size="xl" online />
                <div className="min-w-0 flex-1">
                  <p className="text-base font-bold text-ink-900 truncate">{providerProfile.displayName}</p>
                  <p className="text-xs text-ink-500 mt-0.5">
                    {providerProfile.experience ? `${providerProfile.experience}y experience` : "Cooperative member"}
                    {providerProfile.ratingAvg ? ` • ★ ${providerProfile.ratingAvg}` : ""}
                  </p>
                  <Badge intent="success" dot={false} className="mt-2">
                    <BadgeCheck className="size-3 mr-1" aria-hidden />
                    Cooperative verified
                  </Badge>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-line grid grid-cols-2 gap-2.5">
                <Link
                  href={`/customer/messages?bookingId=${id}&providerId=${booking.providerId || providerProfile.id}`}
                  className={buttonClasses({ variant: "secondary", size: "md" })}
                >
                  <MessageSquare className="size-4" aria-hidden />
                  Chat
                </Link>
                <a href="tel:9200000001" className={buttonClasses({ variant: "secondary", size: "md" })}>
                  <Phone className="size-4" aria-hidden />
                  Call
                </a>
              </div>
            </Card>
          )}

          {/* ---------- Next-action panels ---------- */}
          {status === "arrived_pending_confirmation" && (
            <ActionPanel intent="warning" title="Your specialist has arrived" body="Confirm the technician is on-site so work can begin.">
              <Button variant="accent" className="w-full" loading={actionLoading} onClick={() => performAction("confirm_arrival")}>
                Confirm arrival on site
              </Button>
            </ActionPanel>
          )}

          {status === "price_change_pending" && latestRevision && (
            <ActionPanel intent="warning" title="Price revision requested" body={<>The technician requests a change after on-site inspection: <em className="not-italic font-semibold">{latestRevision.reason}</em></>}>
              <div className="rounded-xl bg-white border border-line p-3.5 space-y-1.5 text-sm mb-4">
                <div className="flex justify-between">
                  <span className="text-ink-500">Original estimate</span>
                  <span className="font-semibold tabular-nums">{formatINR(latestRevision.originalAmount)}</span>
                </div>
                <div className="flex justify-between font-bold text-accent-800">
                  <span>Revised amount</span>
                  <span className="tabular-nums">{formatINR(latestRevision.proposedAmount)}</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <Button variant="primary" loading={actionLoading} onClick={() => performAction("approve_price_change", { proposedAmount: latestRevision.proposedAmount })}>
                  Accept new price
                </Button>
                <Button variant="destructive" disabled={actionLoading} onClick={() => performAction("reject_price_change")}>
                  Reject
                </Button>
              </div>
            </ActionPanel>
          )}

          {status === "completed_pending_confirmation" && (
            <ActionPanel intent="success" title="Work marked as completed" body="Inspect the work — once you confirm, the escrow settles to settlement.">
              <Button variant="success" className="w-full" loading={actionLoading} onClick={() => performAction("confirm_completion")}>
                Confirm &amp; accept work
              </Button>
            </ActionPanel>
          )}

          {status === "completed" && !payment && (
            <Card className="p-5">
              <h3 className="font-bold text-ink-900">Payment</h3>
              <div className="mt-3 flex items-center justify-between rounded-xl bg-ink-50 border border-line px-4 py-3">
                <span className="text-sm text-ink-500">Amount payable</span>
                <span className="text-lg font-extrabold text-ink-900 tabular-nums">
                  {formatINR(booking.totalAmount || booking.finalPrice)}
                </span>
              </div>
              <div role="radiogroup" aria-label="Payment method" className="mt-3 grid grid-cols-2 gap-2.5">
                {(["online", "cash"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    role="radio"
                    aria-checked={paymentMethod === m}
                    onClick={() => setPaymentMethod(m)}
                    className={cn(
                      "rounded-xl border px-4 py-3 text-sm font-bold transition-colors",
                      paymentMethod === m ? "bg-brand-700 text-white border-brand-700" : "bg-white border-line hover:border-line-strong"
                    )}
                  >
                    {m === "online" ? "UPI / Online" : "Cash on spot"}
                  </button>
                ))}
              </div>
              <Button
                className="w-full mt-4"
                size="lg"
                loading={actionLoading}
                onClick={() => performAction("record_payment", { method: paymentMethod, amount: booking.totalAmount || booking.finalPrice })}
              >
                Pay {formatINR(booking.totalAmount || booking.finalPrice)}
              </Button>
            </Card>
          )}

          {status === "paid" && !rating && (
            <Card className="p-5">
              <h3 className="font-bold text-ink-900">Rate your specialist</h3>
              <p className="text-sm text-ink-500 mt-1">Your review protects the cooperative&apos;s quality standard.</p>
              <div className="flex justify-center py-4">
                <StarRating rating={ratingVal} onRate={setRatingVal} size={32} />
              </div>
              <Textarea
                rows={3}
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                placeholder="Share a short review (optional)…"
                aria-label="Review"
              />
              <Button
                className="w-full mt-3"
                loading={actionLoading}
                onClick={() => performAction("submit_rating", { rating: ratingVal, reviewText })}
              >
                Submit review
              </Button>
            </Card>
          )}

          {(status === "rated" || rating) && (
            <Card className="p-6 text-center">
              <span className="size-12 rounded-full bg-success-100 text-success-600 inline-flex items-center justify-center" aria-hidden>
                <BadgeCheck className="size-6" />
              </span>
              <h3 className="mt-3 font-bold text-ink-900">Service completed</h3>
              <p className="mt-1 text-sm text-ink-500">
                Thank you for supporting fair-wage cooperative labour.
              </p>
              {rating && (
                <div className="mt-3 inline-flex flex-col items-center">
                  <StarRating rating={rating.rating} size={18} showNumber />
                  {rating.reviewText && <p className="mt-1.5 text-xs text-ink-500 italic max-w-sm">&ldquo;{rating.reviewText}&rdquo;</p>}
                </div>
              )}
              <div className="mt-5">
                <Link href="/customer/book" className={buttonClasses({ variant: "secondary", size: "md" })}>
                  Book another service
                </Link>
              </div>
            </Card>
          )}

          {/* ---------- Timeline ---------- */}
          {!isQuoting && !isCancelled && (
            <Card className="p-5 sm:p-6">
              <h3 className="font-bold text-ink-900 mb-5">Journey</h3>
              <BookingTimeline status={status} orientation="vertical" />
            </Card>
          )}
        </div>

        {/* ================================================= Side column */}
        <div className="space-y-5 lg:sticky lg:top-20">
          <Card className="p-5">
            <p className="text-xs font-bold uppercase tracking-[0.08em] text-ink-400 mb-4">Booking summary</p>
            <div className="flex items-start gap-3">
              <span className="size-10 rounded-xl bg-brand-50 text-brand-700 flex items-center justify-center shrink-0" aria-hidden>
                <ServiceIcon category={category?.name} size={20} />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-bold text-ink-900 leading-snug">{category?.name ?? "Service"}</p>
                {service && <p className="text-xs text-ink-500 mt-0.5">{service.name}</p>}
              </div>
            </div>
            <dl className="mt-4 space-y-3 text-sm">
              <SummaryRow label="Service at" value={booking.address} icon={<MapPin className="size-4" />} />
              <SummaryRow
                label="Requested"
                value={formatDateTime(booking.createdAt)}
                icon={<CalendarDays className="size-4" />}
              />
              {booking.preferredTime && !booking.isEmergency && (
                <SummaryRow
                  label="Preferred"
                  value={formatDateTime(booking.preferredTime)}
                  icon={<CalendarDays className="size-4" />}
                />
              )}
              {(booking.finalPrice || booking.totalAmount) && (
                <div className="pt-3 border-t border-line flex items-center justify-between">
                  <span className="text-ink-500">Amount</span>
                  <span className="font-extrabold text-ink-900 tabular-nums">
                    {formatINR(booking.totalAmount || booking.finalPrice)}
                  </span>
                </div>
              )}
              {payment && (
                <div className="flex items-center justify-between">
                  <span className="text-ink-500">Payment</span>
                  <span className="font-semibold text-ink-800 capitalize">{payment.method} • {payment.status.replace(/_/g, " ")}</span>
                </div>
              )}
              {invoice && (
                <div className="flex items-center justify-between">
                  <span className="text-ink-500">Invoice</span>
                  <span className="font-mono text-xs text-ink-700">{invoice.invoiceNumber}</span>
                </div>
              )}
            </dl>

            {/* Attachments */}
            {booking.mediaUrls && booking.mediaUrls.length > 0 && (
              <div className="mt-4 pt-4 border-t border-line">
                <p className="text-xs font-bold text-ink-700 mb-2.5">Attachments</p>
                <div className="flex flex-wrap gap-2">
                  {booking.mediaUrls.map((url, idx) => {
                    const isAudio = url.startsWith("data:audio") || /\.(mp3|wav|ogg|webm|m4a)/i.test(url);
                    if (isAudio) {
                      return (
                        <div key={idx} className="w-full rounded-xl bg-ink-50 border border-line p-2.5">
                          <p className="text-2xs font-bold text-ink-700 mb-1">Voice note</p>
                          <audio src={url} controls className="w-full h-8" />
                        </div>
                      );
                    }
                    return (
                      <a key={idx} href={url} target="_blank" rel="noopener noreferrer" className="block size-16 rounded-xl overflow-hidden border border-line">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={url} alt={`Attachment ${idx + 1}`} className="w-full h-full object-cover" />
                      </a>
                    );
                  })}
                </div>
              </div>
            )}
          </Card>

          {/* Journey timeline compact for quoting state */}
          {isQuoting && !isCancelled && (
            <Card className="p-5 sm:p-6">
              <h3 className="font-bold text-ink-900 mb-5">Journey</h3>
              <BookingTimeline status={status} orientation="vertical" />
            </Card>
          )}

          <div className="rounded-2xl border border-line bg-panel p-4 flex items-center gap-3">
            <span className="size-10 rounded-xl bg-brand-50 text-brand-700 flex items-center justify-center shrink-0" aria-hidden>
              <Phone className="size-4.5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-ink-900">Need help with this order?</p>
              <p className="text-xs text-ink-400">Society helpdesk</p>
            </div>
            <a href="tel:18004198800" className={buttonClasses({ variant: "secondary", size: "sm" })}>
              Call
            </a>
          </div>
        </div>
      </div>

      {toastMessage && (
        <Toast
          message={
            <span>
              <strong>{toastMessage.title}.</strong> {toastMessage.desc}
            </span>
          }
          onDismiss={() => setToastMessage(null)}
        />
      )}
    </PageContainer>
  );
}

function SummaryRow({ label, value, icon }: { label: string; value?: string | null; icon: React.ReactNode }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-2.5">
      <span className="text-accent-600 mt-0.5 shrink-0" aria-hidden>{icon}</span>
      <div className="min-w-0">
        <dt className="text-2xs text-ink-400">{label}</dt>
        <dd className="font-semibold text-ink-800 leading-snug break-words">{value}</dd>
      </div>
    </div>
  );
}

function ActionPanel({
  intent,
  title,
  body,
  children,
}: {
  intent: "warning" | "success";
  title: string;
  body: React.ReactNode;
  children: React.ReactNode;
}) {
  const styles = {
    warning: "border-warning-300 bg-warning-50",
    success: "border-success-300 bg-success-50",
  } as const;
  return (
    <Card className={cn("p-5 border", styles[intent])}>
      <h3 className="font-bold text-ink-900">{title}</h3>
      <p className="text-sm text-ink-700 mt-1.5 mb-4 leading-relaxed">{body}</p>
      {children}
    </Card>
  );
}
