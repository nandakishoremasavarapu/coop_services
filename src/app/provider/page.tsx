"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  BookOpenCheck,
  Briefcase,
  HandCoins,
  Inbox,
  Headset,
  MapPin,
  MessageSquare,
  Phone,
  Send,
  Star,
  Wallet,
  Zap,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { bookingRef, formatINR, formatTime, relativeTime } from "@/lib/format";
import { ServiceIcon } from "@/lib/serviceIcons";
import { StatusBadge, Badge } from "@/components/ui/badge";
import { PageContainer } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat";
import { Avatar } from "@/components/ui/avatar";
import { Button, buttonClasses } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Field, Input, Textarea } from "@/components/ui/form";
import { EmptyState, LoadingBlock } from "@/components/ui/states";

interface ProviderProfile {
  id?: string;
  displayName: string;
  availability: string;
  ratingAvg?: string | null;
  ratingCount?: number | null;
  experience?: number | null;
  verificationStatus: string;
  serviceArea?: string | null;
  city?: string | null;
  societyId?: string | null;
}

export interface BookingItem {
  booking: {
    id: string;
    status: string;
    serviceDescription: string;
    address: string;
    city?: string | null;
    pincode?: string | null;
    totalAmount?: string | null;
    finalPrice?: string | null;
    platformFee?: string | null;
    isEmergency?: boolean | null;
    preferredTime?: string | null;
    createdAt: string;
  };
  category: { name: string } | null;
  service: { name: string } | null;
}

export const ACTIVE_JOB_STATUSES = [
  "provider_selected",
  "accepted",
  "arrived_pending_confirmation",
  "arrived",
  "price_change_pending",
  "price_confirmed",
  "work_started",
  "completed_pending_confirmation",
];

export const LEAD_STATUSES = ["submitted", "quoted"];
export const DONE_STATUSES = ["completed", "paid", "rated"];

export default function ProviderHomePage() {
    const [profile, setProfile] = useState<ProviderProfile | null>(null);
  const [jobs, setJobs] = useState<BookingItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Quick quote dialog
  const [activeQuoteBooking, setActiveQuoteBooking] = useState<BookingItem | null>(null);
  const [quoteAmount, setQuoteAmount] = useState("350");
  const [quoteNote, setQuoteNote] = useState("Inspection & base labour with standard tool kit");
  const [quoteEta, setQuoteEta] = useState("~25 mins ETA");
  const [submittingQuote, setSubmittingQuote] = useState(false);
  const [quoteSuccessMsg, setQuoteSuccessMsg] = useState("");

  useEffect(() => {
    const run = async () => {
      try {
        const [meRes, jobRes] = await Promise.all([
          apiFetch("/api/auth/me"),
          apiFetch("/api/bookings?role=provider"),
        ]);
        if (meRes.ok) {
          const data = await meRes.json();
          setProfile(data.user?.profile ?? null);
        }
        if (jobRes.ok) {
          const data = await jobRes.json();
          setJobs(data.bookings ?? []);
        }
      } catch (err) {
        console.error("Error loading provider dashboard:", err);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  const refetchJobs = async () => {
    try {
      const res = await apiFetch("/api/bookings?role=provider");
      if (res.ok) {
        const data = await res.json();
        setJobs(data.bookings ?? []);
      }
    } catch (err) {
      console.error("Error fetching provider bookings:", err);
    }
  };

  const handleQuickSubmitQuote = async () => {
    if (!activeQuoteBooking || !quoteAmount) return;
    setSubmittingQuote(true);
    setQuoteSuccessMsg("");
    try {
      const res = await apiFetch("/api/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId: activeQuoteBooking.booking.id,
          amount: quoteAmount,
          note: quoteNote,
          estimatedArrival: quoteEta,
        }),
      });
      if (res.ok) {
        setQuoteSuccessMsg("Quote submitted successfully! Customer notified.");
        setTimeout(() => {
          setActiveQuoteBooking(null);
          setQuoteSuccessMsg("");
          refetchJobs();
        }, 1500);
      }
    } catch (err) {
      console.error("Error submitting quote:", err);
    } finally {
      setSubmittingQuote(false);
    }
  };

  const handleUpdateJobStatus = async (bookingId: string, action: string) => {
    try {
      const res = await apiFetch(`/api/bookings/${bookingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (res.ok) refetchJobs();
    } catch (err) {
      console.error("Error updating job:", err);
    }
  };

  const activeJobs = jobs.filter(({ booking }) => ACTIVE_JOB_STATUSES.includes(booking.status));
  const newRequests = jobs.filter(({ booking }) => LEAD_STATUSES.includes(booking.status));
  const completedJobs = jobs.filter(({ booking }) => DONE_STATUSES.includes(booking.status));

  const calculatedEarnings = completedJobs.reduce((acc, { booking }) => {
    const p = parseFloat(booking.finalPrice || "0");
    return acc + (p > 0 ? p * 0.9 : 0);
  }, 0);

  if (loading) {
    return <LoadingBlock label="Loading your workspace…" className="py-24" />;
  }

  return (
    <PageContainer width="default">
      {/* =============================== Header =============================== */}
      <header className="flex flex-wrap items-start justify-between gap-4 pb-6">
        <div className="flex items-center gap-3.5">
          <Avatar name={profile?.displayName ?? "Specialist"} size="lg" />
          <div>
            <h1 className="text-xl font-extrabold text-ink-900 leading-tight">
              Namaste, {profile?.displayName?.split(" ")[0] ?? "Specialist"}
            </h1>
            <p className="text-sm text-ink-500 mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1">
              <Badge intent="success" dot={false}>
                <BadgeCheck className="size-3 mr-1" aria-hidden />
                Verified member
              </Badge>
              {Number(profile?.ratingAvg) > 0 && (
                <span className="inline-flex items-center gap-1 text-ink-600 font-semibold">
                  <Star className="size-3.5 fill-accent-400 text-accent-400" aria-hidden />
                  {profile?.ratingAvg}
                  {profile?.ratingCount ? <span className="font-normal text-ink-400">({profile.ratingCount})</span> : null}
                </span>
              )}
              <span className="hidden sm:inline text-ink-300" aria-hidden>•</span>
              <span>{profile?.serviceArea || profile?.city || "Your service sector"}</span>
            </p>
          </div>
        </div>
        <Link href="/provider/requests" className={buttonClasses({ size: "md" })}>
          <Inbox className="size-4.5" aria-hidden />
          Review leads
          {newRequests.length > 0 && (
            <Badge intent="warning" dot={false} className="ml-1 -mr-1">{newRequests.length}</Badge>
          )}
        </Link>
      </header>

      {/* =============================== Stats =============================== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard icon={<HandCoins />} label="Completed payouts" value={formatINR(calculatedEarnings)} sub="90% member share" />
        <StatCard icon={<Briefcase />} label="Active jobs" value={String(activeJobs.length)} sub="In progress" />
        <StatCard icon={<Inbox />} label="New leads" value={String(newRequests.length)} sub="Open in your sector" />
        <StatCard
          icon={<Star />}
          label="Service rating"
          value={Number(profile?.ratingAvg) ? String(profile?.ratingAvg) : "—"}
          sub={profile?.ratingCount ? `${profile.ratingCount} reviews` : "No reviews yet"}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mt-6 items-start">
        {/* ====================== Leads + active jobs (main) ====================== */}
        <div className="lg:col-span-2 space-y-8 order-2 lg:order-1">
          {/* ---------------- Leads ---------------- */}
          <section aria-label="New service leads">
            <div className="flex items-center justify-between pb-3">
              <h2 className="text-base font-bold text-ink-900 flex items-center gap-2">
                New broadcast leads
                {newRequests.length > 0 && <Badge intent="warning">{newRequests.length}</Badge>}
              </h2>
              <Link href="/provider/requests" className="text-sm font-bold text-brand-700 hover:text-brand-800 inline-flex items-center gap-1">
                View all
                <ArrowRight className="size-4" aria-hidden />
              </Link>
            </div>

            {newRequests.length === 0 ? (
              <Card className="p-6">
                <EmptyState
                  compact
                  icon={<BookOpenCheck />}
                  title="All requests covered"
                  description={
                    profile?.availability === "available"
                      ? "Your radar is live — new broadcasts will land here automatically."
                      : "Turn on availability in the header to start receiving leads."
                  }
                />
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {newRequests.slice(0, 4).map((item) => {
                  const { booking, category } = item;
                  return (
                    <Card key={booking.id} interactive className="p-4 flex flex-col gap-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="size-9.5 rounded-xl bg-brand-50 text-brand-700 flex items-center justify-center shrink-0" aria-hidden>
                            <ServiceIcon category={category?.name} size={19} />
                          </span>
                          <div className="min-w-0">
                            <h3 className="text-sm font-bold text-ink-900 truncate">{category?.name ?? "Service"}</h3>
                            <span className="text-2xs text-ink-400 font-mono">{bookingRef(booking.id)}</span>
                          </div>
                        </div>
                        {booking.isEmergency ? (
                          <Badge intent="danger" dot={false}>
                            <Zap className="size-3 mr-0.5" aria-hidden />
                            Immediate
                          </Badge>
                        ) : (
                          <Badge intent="neutral" dot={false}>Standard</Badge>
                        )}
                      </div>

                      <p className="text-sm text-ink-600 leading-relaxed line-clamp-2 rounded-xl bg-ink-50 border border-line px-3 py-2.5 flex-1">
                        “{booking.serviceDescription}”
                      </p>

                      <div className="flex items-center justify-between text-xs text-ink-500">
                        <span className="inline-flex items-center gap-1 truncate max-w-[70%]">
                          <MapPin className="size-3.5 text-accent-600 shrink-0" aria-hidden />
                          {booking.address}
                        </span>
                        <span className="tabular-nums shrink-0">{formatTime(booking.createdAt)}</span>
                      </div>

                      <div className="flex items-center gap-2 pt-2.5 border-t border-line">
                        <Button
                          size="sm"
                          className="flex-1"
                          onClick={() => {
                            setActiveQuoteBooking(item);
                            setQuoteAmount("350");
                            setQuoteNote("Inspection & base labour with standard tool kit");
                            setQuoteEta("~25 mins ETA");
                          }}
                        >
                          <Send className="size-3.5" aria-hidden />
                          Submit quote
                        </Button>
                        <Link href={`/provider/requests/${booking.id}`} className={buttonClasses({ variant: "secondary", size: "sm" })}>
                          Details
                        </Link>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </section>

          {/* ---------------- Active jobs ---------------- */}
          {activeJobs.length > 0 && (
            <section aria-label="Active jobs">
              <div className="flex items-center justify-between pb-3">
                <h2 className="text-base font-bold text-ink-900 flex items-center gap-2">
                  Active jobs
                  <Badge intent="info">{activeJobs.length}</Badge>
                </h2>
                <Link href="/provider/jobs" className="text-sm font-bold text-brand-700 hover:text-brand-800 inline-flex items-center gap-1">
                  All jobs
                  <ArrowRight className="size-4" aria-hidden />
                </Link>
              </div>

              <div className="space-y-3.5">
                {activeJobs.map(({ booking, category }) => {
                  const status = booking.status;
                  return (
                    <Card key={booking.id} className="p-4 space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="size-9.5 rounded-xl bg-brand-50 text-brand-700 flex items-center justify-center shrink-0" aria-hidden>
                            <ServiceIcon category={category?.name} size={19} />
                          </span>
                          <div className="min-w-0">
                            <h3 className="text-sm font-bold text-ink-900 truncate">{category?.name ?? "Service job"}</h3>
                            <span className="text-2xs text-ink-400 font-mono">{bookingRef(booking.id)}</span>
                          </div>
                        </div>
                        <StatusBadge status={status} size="sm" />
                      </div>

                      <p className="text-sm text-ink-600 leading-relaxed line-clamp-2">{booking.serviceDescription}</p>

                      <div className="flex items-center justify-between gap-2 rounded-xl bg-ink-50 border border-line px-3 py-2.5 text-sm">
                        <span className="inline-flex items-center gap-1.5 text-ink-600 truncate">
                          <MapPin className="size-4 text-accent-600 shrink-0" aria-hidden />
                          {booking.address}
                        </span>
                        {booking.finalPrice && (
                          <span className="font-extrabold text-ink-900 tabular-nums shrink-0">{formatINR(booking.finalPrice)}</span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 pt-2.5 border-t border-line">
                        <JobActionButton status={status} bookingId={booking.id} finalPrice={booking.finalPrice} onAction={handleUpdateJobStatus} className="flex-1" />
                        <Link
                          href={`/provider/messages?bookingId=${booking.id}`}
                          className={buttonClasses({ variant: "secondary", size: "icon" })}
                          aria-label="Chat with customer"
                        >
                          <MessageSquare className="size-4.5" />
                        </Link>
                        <a href="tel:9100000001" className={buttonClasses({ variant: "secondary", size: "icon" })} aria-label="Call customer">
                          <Phone className="size-4.5" />
                        </a>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </section>
          )}
        </div>

        {/* ====================== Side column ====================== */}
        <div className="space-y-4 order-1 lg:order-2 lg:sticky lg:top-20">
          <Card className="p-4">
            <h2 className="text-sm font-bold text-ink-900 pb-3">Member tools</h2>
            <div className="grid grid-cols-3 gap-2">
              <ToolLink href="/provider/earnings" icon={<Wallet className="size-5" />} label="Ledger & payout" />
              <ToolLink href="/provider/profile" icon={<BadgeCheck className="size-5" />} label="Profile & credentials" />
              <ToolLink href="/provider/jobs" icon={<Briefcase className="size-5" />} label="All my jobs" />
            </div>
          </Card>

          <div className="rounded-2xl border border-line bg-panel p-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="size-10 rounded-xl bg-brand-50 text-brand-700 flex items-center justify-center shrink-0" aria-hidden>
                <Headset className="size-5" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-bold text-ink-900 truncate">Dispatch coordinator</p>
                <p className="text-xs text-ink-400">Toll-free 24/7 field support</p>
              </div>
            </div>
            <a href="tel:1800000001" className={buttonClasses({ variant: "secondary", size: "sm" })}>
              Call
            </a>
          </div>
        </div>
      </div>

      {/* =================== Quick quote modal =================== */}
      <Modal
        open={!!activeQuoteBooking}
        onClose={() => setActiveQuoteBooking(null)}
        title="Submit cooperative estimate"
        description={
          activeQuoteBooking
            ? `${activeQuoteBooking.category?.name ?? "Service"} • ${bookingRef(activeQuoteBooking.booking.id)}`
            : undefined
        }
      >
        {quoteSuccessMsg ? (
          <div className="rounded-2xl bg-success-100 text-success-800 p-6 text-center">
            <BadgeCheck className="size-8 mx-auto" aria-hidden />
            <p className="mt-2 text-sm font-bold">{quoteSuccessMsg}</p>
          </div>
        ) : (
          <div className="space-y-4">
            <Field label="Estimate amount (₹)" hint={`Benchmark for ${activeQuoteBooking?.category?.name ?? "this trade"}: ₹300–450`} htmlFor="q-amount" required>
              <Input
                id="q-amount"
                type="number"
                inputMode="numeric"
                value={quoteAmount}
                onChange={(e) => setQuoteAmount(e.target.value)}
                icon={<span className="font-bold">₹</span>}
              />
            </Field>
            <Field label="Estimated arrival" htmlFor="q-eta">
              <Input id="q-eta" value={quoteEta} onChange={(e) => setQuoteEta(e.target.value)} placeholder="e.g. ~25 mins ETA, Today 4:30 PM" />
            </Field>
            <Field label="Scope note for the customer" htmlFor="q-note">
              <Textarea id="q-note" rows={2} value={quoteNote} onChange={(e) => setQuoteNote(e.target.value)} />
            </Field>
            <div className="flex items-center gap-2.5 pt-1">
              <Button variant="secondary" className="flex-1" onClick={() => setActiveQuoteBooking(null)}>
                Cancel
              </Button>
              <Button className="flex-1" loading={submittingQuote} disabled={!quoteAmount} onClick={handleQuickSubmitQuote}>
                <Send className="size-4" aria-hidden />
                Send estimate
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </PageContainer>
  );
}

function ToolLink({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link
      href={href}
      className="rounded-xl border border-line bg-ink-50/60 px-2 py-3 flex flex-col items-center text-center gap-1.5 hover:bg-brand-50 hover:border-brand-200 transition-colors"
    >
      <span className="text-brand-700" aria-hidden>{icon}</span>
      <span className="text-2xs font-bold text-ink-700 leading-tight">{label}</span>
    </Link>
  );
}

export function JobActionButton({
  status,
  bookingId,
  finalPrice,
  onAction,
  className,
}: {
  status: string;
  bookingId: string;
  finalPrice?: string | null;
  onAction: (bookingId: string, action: string) => void;
  className?: string;
}) {
  const [busy, setBusy] = useState(false);
  const run = async (action: string) => {
    setBusy(true);
    try {
      await onAction(bookingId, action);
    } finally {
      setBusy(false);
    }
  };

  const byStatus: Record<string, { label: string; action: string; variant?: "accent" | "success" }> = {
    provider_selected: { label: "Accept booking", action: "accept_booking" },
    accepted: { label: "Mark arrived on site", action: "mark_arrived", variant: "accent" },
    arrived: { label: "Start diagnostic & repair", action: "start_work" },
    work_started: { label: "Complete work", action: "complete_work", variant: "success" },
  };

  if (status === "completed") {
    return (
      <Button
        className={className}
        variant="success"
        loading={busy}
        onClick={() => run("record_payment")}
      >
        Record payment {finalPrice ? `(${formatINR(finalPrice)})` : ""}
      </Button>
    );
  }

  const meta = byStatus[status];
  if (!meta) {
    return (
      <Link href={`/provider/jobs/${bookingId}`} className={buttonClasses({ variant: "secondary", size: "md", className })}>
        Open job
      </Link>
    );
  }

  return (
    <Button className={className} variant={meta.variant ?? "primary"} loading={busy} onClick={() => run(meta.action)}>
      {meta.label}
    </Button>
  );
}
