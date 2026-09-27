"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import LinkNext from "next/link";
import { AlertTriangle, BadgeCheck, CalendarClock, MapPin, Send, UserRound, Zap } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { bookingRef, formatDateTime } from "@/lib/format";
import { ServiceIcon } from "@/lib/serviceIcons";
import { PageContainer, PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button, buttonClasses } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/form";
import { LoadingBlock, EmptyState } from "@/components/ui/states";

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
  const [error, setError] = useState("");

  useEffect(() => {
    apiFetch(`/api/bookings/${id}`)
      .then((r) => r.json())
      .then((d) => setData(d as BookingData))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [id]);

  const submitEstimate = async () => {
    if (!estimateAmount) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await apiFetch("/api/quotes", {
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
        setTimeout(() => router.push("/provider/requests"), 2200);
      } else {
        const d = (await res.json()) as { error?: string };
        setError(d.error ?? "Failed to submit estimate. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <LoadingBlock label="Loading request…" className="py-24" />;
  }

  if (!data?.booking) {
    return (
      <PageContainer width="narrow">
        <EmptyState
          title="Request not found"
          description="This broadcast may have been covered by another member already."
          action={
            <LinkNext href="/provider/requests" className={buttonClasses()}>
              Back to requests
            </LinkNext>
          }
        />
      </PageContainer>
    );
  }

  const { booking, category, service, customerProfile } = data;

  if (submitted) {
    return (
      <PageContainer width="narrow" className="py-16">
        <Card className="p-8 text-center">
          <span className="size-14 rounded-full bg-success-100 text-success-600 inline-flex items-center justify-center" aria-hidden>
            <BadgeCheck className="size-7" />
          </span>
          <h2 className="mt-4 text-xl font-extrabold text-ink-900">Estimate submitted</h2>
          <p className="mt-1.5 text-sm text-ink-500 max-w-sm mx-auto">
            The customer will review your quote and may select you as their provider. Hang tight.
          </p>
          <Button className="mt-6" onClick={() => router.push("/provider/requests")}>
            Back to requests
          </Button>
        </Card>
      </PageContainer>
    );
  }

  return (
    <PageContainer width="default">
      <PageHeader
        backHref="/provider/requests"
        title={category?.name ?? "Service request"}
        description={service?.name}
        meta={
          <>
            {booking.isEmergency && (
              <Badge intent="danger" dot={false}>
                <Zap className="size-3 mr-0.5" aria-hidden />
                Emergency
              </Badge>
            )}
            <Badge intent="neutral" dot={false}>
              <span className="font-mono">{bookingRef(booking.id)}</span>
            </Badge>
            <Badge intent="info">Open for quotes</Badge>
          </>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
        {/* ---------------- Details ---------------- */}
        <Card className="p-5 lg:col-span-2">
          <div className="flex items-start gap-3.5">
            <span className="size-12 rounded-2xl bg-brand-50 text-brand-700 flex items-center justify-center shrink-0" aria-hidden>
              <ServiceIcon category={category?.name} size={24} />
            </span>
            <div className="min-w-0">
              <p className="text-base font-bold text-ink-900">{category?.name ?? "Service"}</p>
              {service && <p className="text-sm text-brand-700 font-semibold mt-0.5">{service.name}</p>}
            </div>
          </div>

          <div className="mt-5 space-y-4">
            <div>
              <p className="text-2xs font-bold uppercase tracking-[0.08em] text-ink-400 mb-1.5">Problem description</p>
              <p className="text-sm text-ink-700 leading-relaxed">{booking.serviceDescription}</p>
            </div>

            <div className="grid sm:grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl bg-ink-50 border border-line px-3.5 py-3 flex items-start gap-2.5">
                <MapPin className="size-4 text-accent-600 mt-0.5 shrink-0" aria-hidden />
                <div className="min-w-0">
                  <p className="text-2xs text-ink-400">Service location</p>
                  <p className="font-semibold text-ink-800 leading-snug">
                    {booking.address}
                    {booking.city ? `, ${booking.city}` : ""} {booking.pincode}
                  </p>
                </div>
              </div>
              <div className="rounded-xl bg-ink-50 border border-line px-3.5 py-3 flex items-start gap-2.5">
                <CalendarClock className="size-4 text-accent-600 mt-0.5 shrink-0" aria-hidden />
                <div>
                  <p className="text-2xs text-ink-400">{booking.isEmergency ? "Timing" : "Preferred time"}</p>
                  <p className="font-semibold text-ink-800">
                    {booking.isEmergency ? "As soon as possible" : booking.preferredTime ? formatDateTime(booking.preferredTime) : "Flexible"}
                  </p>
                </div>
              </div>
            </div>

            <p className="text-xs text-ink-500 inline-flex items-center gap-1.5">
              <UserRound className="size-3.5" aria-hidden />
              Posted by <strong className="text-ink-700">{customerProfile?.fullName ?? "Customer"}</strong> • {formatDateTime(booking.createdAt)}
            </p>
          </div>
        </Card>

        {/* ---------------- Quote form ---------------- */}
        <Card className="p-5 lg:sticky lg:top-20">
          <h3 className="font-bold text-ink-900">Submit your estimate</h3>

          <div className="mt-3 rounded-xl bg-warning-50 border border-warning-200 p-3 flex items-start gap-2 text-xs text-warning-800 leading-relaxed">
            <AlertTriangle className="size-4 mt-0.5 shrink-0" aria-hidden />
            <span>
              This is an <strong>initial estimate</strong> subject to on-site inspection. The final price is
              confirmed on-site with the customer.
            </span>
          </div>

          <div className="mt-4 space-y-4">
            <Field label="Estimated amount (₹)" required htmlFor="estimate-amount">
              <Input
                id="estimate-amount"
                type="number"
                inputMode="numeric"
                min={0}
                value={estimateAmount}
                onChange={(e) => setEstimateAmount(e.target.value)}
                placeholder="0"
                icon={<span className="font-bold">₹</span>}
                className="font-bold"
              />
            </Field>

            <Field label="Expected arrival time" htmlFor="estimate-arrival">
              <Input
                id="estimate-arrival"
                value={estimatedArrival}
                onChange={(e) => setEstimatedArrival(e.target.value)}
                placeholder="e.g. Within 2 hours, 3:00 PM today"
              />
            </Field>

            <Field label="Note to customer" htmlFor="estimate-note">
              <Textarea
                id="estimate-note"
                rows={3}
                value={estimateNote}
                onChange={(e) => setEstimateNote(e.target.value)}
                placeholder="e.g. Will bring all necessary equipment…"
              />
            </Field>

            {error && (
              <p role="alert" className="text-xs font-semibold text-danger-600">
                {error}
              </p>
            )}

            <Button size="lg" className="w-full" loading={submitting} disabled={!estimateAmount} onClick={submitEstimate}>
              <Send className="size-4" aria-hidden />
              Submit estimate
            </Button>

            <Button variant="ghost" className="w-full" onClick={() => router.push("/provider/requests")}>
              Decline request
            </Button>
          </div>
        </Card>
      </div>
    </PageContainer>
  );
}
