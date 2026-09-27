"use client";

import React, { useState, useEffect, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, BadgeCheck, Banknote, MapPin, MessageSquare, Phone, Smartphone, Star, UserRound } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/cn";
import { bookingRef, formatDateTime, formatINR } from "@/lib/format";
import { ServiceIcon } from "@/lib/serviceIcons";
import { StatusBadge, Badge } from "@/components/ui/badge";
import { PageContainer, PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Button, buttonClasses } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/form";
import { EmptyState, LoadingBlock, Toast } from "@/components/ui/states";
import { StarRating } from "@/components/StarRating";
import { SwipeButton } from "@/components/SwipeButton";
import { BookingTimeline } from "@/components/ui/timeline";

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
    providerId?: string | null;
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
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [showPriceRevision, setShowPriceRevision] = useState(false);
  const [additionalAmount, setAdditionalAmount] = useState("");
  const [revisionReason, setRevisionReason] = useState("");

  const fetchData = async () => {
    const res = await apiFetch(`/api/bookings/${id}`);
    const d = await res.json();
    setData(d as BookingData);
    setLoading(false);
  };

  useEffect(() => {
    const t = setTimeout(() => void fetchData(), 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const performAction = async (action: string, extra: Record<string, unknown> = {}) => {
    setActionLoading(true);
    try {
      const res = await apiFetch(`/api/bookings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...extra }),
      });
      const d = (await res.json()) as { error?: string };
      if (res.ok) {
        await fetchData();
      } else {
        showToast(d.error ?? "Action failed — please try again.");
      }
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
        body: JSON.stringify({ bookingId: id, originalAmount, proposedAmount, reason: revisionReason }),
      });
      const d = (await res.json()) as { error?: string };
      if (res.ok) {
        setShowPriceRevision(false);
        await fetchData();
        showToast("Price revision sent to the customer for approval.");
      } else {
        showToast(d.error ?? "Failed to submit revision.");
      }
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return <LoadingBlock label="Loading job…" className="py-24" />;
  }

  if (!data?.booking) {
    return (
      <PageContainer width="narrow">
        <EmptyState
          title="Job not found"
          description="This job may have been reassigned or removed."
          action={
            <Button onClick={() => router.push("/provider/jobs")}>Back to my jobs</Button>
          }
        />
      </PageContainer>
    );
  }

  const { booking, category, customerProfile, payment, rating } = data;
  const status = booking.status;

  return (
    <PageContainer width="default">
      <PageHeader
        backHref="/provider/jobs"
        title={category?.name ?? "Job"}
        description={booking.serviceDescription}
        meta={
          <>
            <StatusBadge status={status} size="sm" />
            <Badge intent="neutral" dot={false}>
              <span className="font-mono">{bookingRef(booking.id)}</span>
            </Badge>
          </>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
        {/* ======================== Main column ======================== */}
        <div className="lg:col-span-2 space-y-5">
          {/* ------- Action panels ------- */}
          {status === "provider_selected" && (
            <ActionPanel intent="info" title="You've been selected" body="The customer picked your quote. Accept to lock the booking.">
              <SwipeButton label="Slide to accept booking" onComplete={() => performAction("accept_booking", { initialAmount: booking.finalPrice })} />
            </ActionPanel>
          )}

          {status === "accepted" && (
            <ActionPanel intent="info" title="Time to roll" body="Travel to the customer's location and slide when you arrive on site.">
              <SwipeButton tone="accent" label="Slide when you arrive on site" onComplete={() => performAction("mark_arrived")} />
            </ActionPanel>
          )}

          {status === "arrived_pending_confirmation" && (
            <WaitingPanel
              title="Arrival marked"
              body="Waiting for the customer to confirm your arrival before work can begin."
            />
          )}

          {status === "arrived" && (
            <ActionPanel intent="info" title="On-site inspection" body="Inspect the actual work, then start with the agreed price — or request a revision.">
              <SwipeButton label="Slide to start work" onComplete={() => performAction("start_work")} />
              <div className="mt-3">
                <Button variant="outline" className="w-full" onClick={() => setShowPriceRevision((v) => !v)}>
                  <AlertTriangle className="size-4 text-warning-600" aria-hidden />
                  Request price change
                </Button>
              </div>
            </ActionPanel>
          )}

          {status === "price_change_pending" && (
            <WaitingPanel
              title="Revision sent"
              body="Your price change is with the customer for approval. You'll be notified here."
            />
          )}

          {status === "price_confirmed" && (
            <ActionPanel intent="success" title="Revision approved" body="The customer approved the new price. You can start the work now.">
              <SwipeButton tone="success" label="Slide to start work" onComplete={() => performAction("start_work")} />
            </ActionPanel>
          )}

          {status === "work_started" && (
            <ActionPanel intent="brand" title="Work in progress" body="Slide once the job is fully complete — the customer will verify before payment.">
              <SwipeButton tone="success" label="Slide — work completed" onComplete={() => performAction("complete_work")} />
            </ActionPanel>
          )}

          {status === "completed_pending_confirmation" && (
            <WaitingPanel
              title="Completion submitted"
              body="Waiting for the customer to verify and confirm the finished work."
            />
          )}

          {status === "completed" && !payment && (
            <Card className="p-5">
              <h3 className="font-bold text-ink-900">Collect payment</h3>
              <div className="mt-3 flex items-center justify-between rounded-xl bg-ink-50 border border-line px-4 py-3">
                <span className="text-sm text-ink-500">Amount to collect</span>
                <span className="text-lg font-extrabold text-ink-900 tabular-nums">{formatINR(booking.totalAmount)}</span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2.5">
                <Button
                  variant="success"
                  loading={actionLoading}
                  onClick={() => performAction("record_payment", { method: "cash", amount: booking.totalAmount })}
                >
                  <Banknote className="size-4.5" aria-hidden />
                  Cash collected
                </Button>
                <Button
                  variant="primary"
                  loading={actionLoading}
                  onClick={() => performAction("record_payment", { method: "online", amount: booking.totalAmount })}
                >
                  <Smartphone className="size-4.5" aria-hidden />
                  Paid online
                </Button>
              </div>
            </Card>
          )}

          {["paid", "rated"].includes(status) && (
            <Card className="p-6 text-center">
              <span className="size-12 rounded-full bg-success-100 text-success-600 inline-flex items-center justify-center" aria-hidden>
                <BadgeCheck className="size-6" />
              </span>
              <h3 className="mt-3 font-bold text-ink-900">Job completed &amp; paid</h3>
              <p className="mt-1 text-sm text-ink-500">Settled into your member ledger — 90% share credited.</p>
              {rating && (
                <div className="mt-4 inline-flex flex-col items-center">
                  <StarRating rating={rating.rating} size={20} showNumber />
                  {rating.reviewText && <p className="mt-1.5 text-xs text-ink-500 italic max-w-sm">&ldquo;{rating.reviewText}&rdquo;</p>}
                </div>
              )}
            </Card>
          )}

          {/* ------- Price revision form ------- */}
          {showPriceRevision && (
            <Card className="p-5 border-warning-300 bg-warning-50/60">
              <h3 className="font-bold text-ink-900 inline-flex items-center gap-2">
                <AlertTriangle className="size-4.5 text-warning-600" aria-hidden />
                Request price change
              </h3>
              <div className="mt-3 rounded-xl bg-panel border border-line p-3.5 flex items-center justify-between text-sm">
                <span className="text-ink-500">Current agreed amount</span>
                <span className="font-bold tabular-nums">{formatINR(booking.finalPrice)}</span>
              </div>
              <div className="mt-4 space-y-4">
                <Field
                  label="Additional amount (₹)"
                  required
                  hint={additionalAmount ? `Revised total: ${formatINR(parseFloat(booking.finalPrice ?? "0") + parseFloat(additionalAmount || "0"))}` : undefined}
                  htmlFor="rev-amount"
                >
                  <Input
                    id="rev-amount"
                    type="number"
                    inputMode="numeric"
                    value={additionalAmount}
                    onChange={(e) => setAdditionalAmount(e.target.value)}
                    placeholder="e.g. 200"
                    icon={<span className="font-bold">₹</span>}
                  />
                </Field>
                <Field label="Reason for change" required htmlFor="rev-reason">
                  <Textarea
                    id="rev-reason"
                    rows={3}
                    value={revisionReason}
                    onChange={(e) => setRevisionReason(e.target.value)}
                    placeholder="e.g. Found additional wiring damage requiring replacement parts…"
                  />
                </Field>
                <div className="grid grid-cols-2 gap-2.5">
                  <Button variant="secondary" onClick={() => setShowPriceRevision(false)}>
                    Cancel
                  </Button>
                  <Button loading={actionLoading} disabled={!additionalAmount || !revisionReason} onClick={submitPriceRevision}>
                    Send to customer
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {/* ------- Timeline ------- */}
          <Card className="p-5 sm:p-6">
            <h3 className="font-bold text-ink-900 mb-5">Progress</h3>
            <BookingTimeline status={status} orientation="vertical" />
          </Card>
        </div>

        {/* ======================== Side column ======================== */}
        <div className="space-y-5 lg:sticky lg:top-20">
          <Card className="p-5">
            <p className="text-xs font-bold uppercase tracking-[0.08em] text-ink-400 mb-4">Job details</p>
            <div className="flex items-start gap-3">
              <span className="size-10 rounded-xl bg-brand-50 text-brand-700 flex items-center justify-center shrink-0" aria-hidden>
                <ServiceIcon category={category?.name} size={20} />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-bold text-ink-900 leading-snug">{category?.name ?? "Service"}</p>
                <p className="text-xs text-ink-500 mt-0.5">{formatDateTime(booking.createdAt)}</p>
              </div>
            </div>
            <div className="mt-4 flex items-start gap-2.5 text-sm">
              <MapPin className="size-4 text-accent-600 mt-0.5 shrink-0" aria-hidden />
              <p className="text-ink-700 leading-snug">
                {booking.address}
                {booking.city ? `, ${booking.city}` : ""}
              </p>
            </div>
            {customerProfile && (
              <div className="mt-3 flex items-center gap-2.5 text-sm">
                <UserRound className="size-4 text-accent-600 shrink-0" aria-hidden />
                <p className="text-ink-700">
                  Customer: <strong>{customerProfile.fullName}</strong>
                </p>
              </div>
            )}
            <div className="mt-4 pt-4 border-t border-line grid grid-cols-2 gap-2.5">
              <Link href={`/provider/messages?bookingId=${id}`} className={buttonClasses({ variant: "secondary", size: "md" })}>
                <MessageSquare className="size-4" aria-hidden />
                Chat
              </Link>
              <a href="tel:9100000001" className={buttonClasses({ variant: "secondary", size: "md" })}>
                <Phone className="size-4" aria-hidden />
                Call
              </a>
            </div>
          </Card>

          {/* Payment summary */}
          {booking.finalPrice && (
            <Card className="p-5">
              <h3 className="font-bold text-ink-900 mb-3">Payment summary</h3>
              <dl className="space-y-2.5 text-sm">
                <div className="flex justify-between">
                  <dt className="text-ink-500">Service charge</dt>
                  <dd className="font-semibold tabular-nums">{formatINR(booking.finalPrice)}</dd>
                </div>
                {booking.platformFee && (
                  <div className="flex justify-between">
                    <dt className="text-ink-500">Platform &amp; welfare (10%)</dt>
                    <dd className="text-danger-600 tabular-nums">-{formatINR(booking.platformFee)}</dd>
                  </div>
                )}
                <div className="flex justify-between font-bold pt-2.5 border-t border-line">
                  <dt className="text-ink-900">Your earnings</dt>
                  <dd className="text-success-700 tabular-nums">
                    {formatINR(parseFloat(booking.finalPrice) - parseFloat(booking.platformFee ?? "0"))}
                  </dd>
                </div>
              </dl>
            </Card>
          )}

          {/* Attachments */}
          {booking.mediaUrls && booking.mediaUrls.length > 0 && (
            <Card className="p-5">
              <h3 className="font-bold text-ink-900 mb-3">Customer attachments</h3>
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
            </Card>
          )}
        </div>
      </div>

      {toastMsg && <Toast message={toastMsg} tone="info" onDismiss={() => setToastMsg(null)} />}
    </PageContainer>
  );
}

function ActionPanel({
  intent,
  title,
  body,
  children,
}: {
  intent: "info" | "success" | "brand";
  title: string;
  body: React.ReactNode;
  children: React.ReactNode;
}) {
  const styles = {
    info: "border-info-200 bg-info-50/60",
    success: "border-success-200 bg-success-50/60",
    brand: "border-brand-200 bg-brand-50/60",
  } as const;
  return (
    <Card className={cn("p-5 border", styles[intent])}>
      <h3 className="font-bold text-ink-900">{title}</h3>
      <p className="text-sm text-ink-700 mt-1.5 mb-4 leading-relaxed">{body}</p>
      {children}
    </Card>
  );
}

function WaitingPanel({ title, body }: { title: string; body: string }) {
  return (
    <Card className="p-5 border border-warning-200 bg-warning-50/60">
      <div className="flex items-start gap-3">
        <span className="relative mt-1 size-2.5 shrink-0" aria-hidden>
          <span className="absolute inline-flex h-full w-full rounded-full bg-warning-400 opacity-60 animate-ping" />
          <span className="relative inline-flex size-2.5 rounded-full bg-warning-500" />
        </span>
        <div>
          <h3 className="font-bold text-ink-900">{title}</h3>
          <p className="text-sm text-ink-600 mt-1 leading-relaxed">{body}</p>
        </div>
      </div>
    </Card>
  );
}
