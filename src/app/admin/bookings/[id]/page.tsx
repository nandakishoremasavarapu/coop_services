"use client";

import React, { useState, useEffect, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BadgeCheck,
  CalendarDays,
  FileText,
  MapPin,
  Phone,
  UserRound,
  Wrench,
  Zap,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { bookingRef, formatDateTime, formatINR } from "@/lib/format";
import { ServiceIcon } from "@/lib/serviceIcons";
import { PageContainer, PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { StatusBadge, Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Button, buttonClasses } from "@/components/ui/button";
import { EmptyState, LoadingBlock } from "@/components/ui/states";
import { StarRating } from "@/components/StarRating";
import { BookingTimeline } from "@/components/ui/timeline";

interface BookingData {
  booking: {
    id: string;
    status: string;
    serviceDescription: string;
    mediaUrls?: string[] | null;
    address: string;
    city?: string | null;
    pincode?: string | null;
    finalPrice?: string | null;
    platformFee?: string | null;
    totalAmount?: string | null;
    isEmergency?: boolean | null;
    preferredTime?: string | null;
    createdAt: string;
  };
  category: { id: string; name: string } | null;
  service: { id: string; name: string } | null;
  customerProfile: { fullName?: string } | null;
  providerProfile: {
    displayName: string;
    ratingAvg?: string | null;
    experience?: number | null;
    serviceArea?: string | null;
  } | null;
  priceRevisions: Array<{ id: string; proposedAmount: string; originalAmount?: string | null; reason: string; status?: string | null }>;
  payment: { id: string; method: string; paidAmount?: string | null; status: string } | null;
  invoice: { invoiceNumber: string; totalAmount?: string | null } | null;
  rating: { rating: number; reviewText?: string | null } | null;
}

export default function AdminBookingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [data, setData] = useState<BookingData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => {
      apiFetch(`/api/bookings/${id}`)
        .then((r) => r.json())
        .then((d) => setData(d as BookingData))
        .catch(() => setData(null))
        .finally(() => setLoading(false));
    }, 0);
    return () => clearTimeout(t);
  }, [id]);

  if (loading) {
    return <LoadingBlock label="Loading booking record…" className="py-24" />;
  }

  if (!data?.booking) {
    return (
      <PageContainer width="narrow">
        <EmptyState
          title="Booking not found"
          description="It may sit outside your jurisdiction or no longer exist."
          action={<Button onClick={() => router.push("/admin/bookings")}>Back to bookings</Button>}
        />
      </PageContainer>
    );
  }

  const { booking, category, service, customerProfile, providerProfile, priceRevisions, payment, invoice, rating } = data;

  return (
    <PageContainer width="default">
      <PageHeader
        backHref="/admin/bookings"
        title={category?.name ?? "Booking record"}
        description={booking.serviceDescription}
        meta={
          <>
            <StatusBadge status={booking.status} size="sm" />
            <Badge intent="neutral" dot={false}>
              <span className="font-mono">{bookingRef(booking.id)}</span>
            </Badge>
            {booking.isEmergency && (
              <Badge intent="warning" dot={false}>
                <Zap className="size-3 mr-0.5" aria-hidden />
                Emergency
              </Badge>
            )}
          </>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
        {/* ---------------- Main ---------------- */}
        <div className="lg:col-span-2 space-y-5">
          <Card className="p-5 sm:p-6">
            <h3 className="font-bold text-ink-900 mb-5">Lifecycle</h3>
            <BookingTimeline status={booking.status} orientation="vertical" />
          </Card>

          {priceRevisions.length > 0 && (
            <Card className="p-5">
              <h3 className="font-bold text-ink-900 mb-3">Price revisions</h3>
              <ul className="space-y-2.5">
                {priceRevisions.map((rev) => (
                  <li key={rev.id} className="rounded-xl border border-line p-3.5 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-ink-800">
                        {formatINR(rev.originalAmount)} → {formatINR(rev.proposedAmount)}
                      </span>
                      {rev.status && <Badge intent={rev.status === "approved" ? "success" : rev.status === "rejected" ? "danger" : "warning"} dot={false}>{rev.status}</Badge>}
                    </div>
                    <p className="text-xs text-ink-500 mt-1.5 leading-relaxed">{rev.reason}</p>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {booking.mediaUrls && booking.mediaUrls.length > 0 && (
            <Card className="p-5">
              <h3 className="font-bold text-ink-900 mb-3">Attachments</h3>
              <div className="flex flex-wrap gap-2">
                {booking.mediaUrls.map((url, idx) => {
                  const isAudio = url.startsWith("data:audio") || /\.(mp3|wav|ogg|webm|m4a)/i.test(url);
                  if (isAudio) {
                    return (
                      <div key={idx} className="w-full rounded-xl bg-ink-50 border border-line p-2.5">
                        <p className="text-2xs font-bold text-ink-700 mb-1">Customer voice note</p>
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

          {rating && (
            <Card className="p-5">
              <h3 className="font-bold text-ink-900 mb-2.5">Customer rating</h3>
              <StarRating rating={rating.rating} size={18} showNumber />
              {rating.reviewText && (
                <blockquote className="mt-2.5 text-sm text-ink-600 italic leading-relaxed border-l-2 border-brand-200 pl-3.5">
                  “{rating.reviewText}”
                </blockquote>
              )}
            </Card>
          )}
        </div>

        {/* ---------------- Side ---------------- */}
        <div className="space-y-5 lg:sticky lg:top-20">
          <Card className="p-5">
            <p className="text-xs font-bold uppercase tracking-[0.08em] text-ink-400 mb-4">Summary</p>
            <div className="flex items-start gap-3">
              <span className="size-10 rounded-xl bg-brand-50 text-brand-700 flex items-center justify-center shrink-0" aria-hidden>
                <ServiceIcon category={category?.name} size={20} />
              </span>
              <div>
                <p className="text-sm font-bold text-ink-900">{category?.name ?? "Service"}</p>
                {service && <p className="text-xs text-ink-500 mt-0.5">{service.name}</p>}
              </div>
            </div>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex items-start gap-2.5">
                <MapPin className="size-4 text-accent-600 mt-0.5 shrink-0" aria-hidden />
                <dd className="text-ink-700 leading-snug">
                  {booking.address}
                  {booking.city ? `, ${booking.city}` : ""} {booking.pincode}
                </dd>
              </div>
              <div className="flex items-center gap-2.5">
                <CalendarDays className="size-4 text-accent-600 shrink-0" aria-hidden />
                <dd className="text-ink-700">{formatDateTime(booking.createdAt)}</dd>
              </div>
            </dl>
          </Card>

          {/* Parties */}
          <Card className="p-5 space-y-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.08em] text-ink-400 mb-2.5">Customer</p>
              <div className="flex items-center gap-3">
                <Avatar name={customerProfile?.fullName ?? "Customer"} size="md" />
                <div className="min-w-0">
                  <p className="text-sm font-bold text-ink-900 truncate flex items-center gap-1.5">
                    {customerProfile?.fullName ?? "Customer"}
                    <UserRound className="size-3.5 text-ink-300" aria-hidden />
                  </p>
                  <p className="text-xs text-ink-400">Resident</p>
                </div>
              </div>
            </div>
            <div className="pt-4 border-t border-line">
              <p className="text-xs font-bold uppercase tracking-[0.08em] text-ink-400 mb-2.5">Provider</p>
              {providerProfile ? (
                <div className="flex items-center gap-3">
                  <Avatar name={providerProfile.displayName} size="md" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-ink-900 truncate flex items-center gap-1.5">
                      {providerProfile.displayName}
                      <BadgeCheck className="size-4 text-brand-600 shrink-0" aria-hidden />
                    </p>
                    <p className="text-xs text-ink-400">
                      {providerProfile.experience ? `${providerProfile.experience}y exp` : "Member"}
                      {providerProfile.ratingAvg ? ` • ★ ${providerProfile.ratingAvg}` : ""}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-ink-500 inline-flex items-center gap-1.5">
                  <Wrench className="size-3.5" aria-hidden />
                  Not assigned yet — request is open for quotes.
                </p>
              )}
            </div>
          </Card>

          {/* Payment */}
          <Card className="p-5">
            <p className="text-xs font-bold uppercase tracking-[0.08em] text-ink-400 mb-3">Payment</p>
            {payment ? (
              <div className="flex items-center justify-between text-sm">
                <span className="text-ink-500 capitalize">{payment.method} • {payment.status.replace(/_/g, " ")}</span>
                <span className="font-extrabold text-ink-900 tabular-nums">{formatINR(payment.paidAmount ?? booking.totalAmount)}</span>
              </div>
            ) : booking.totalAmount || booking.finalPrice ? (
              <div className="flex items-center justify-between text-sm">
                <span className="text-ink-500">Awaiting settlement</span>
                <span className="font-extrabold text-ink-900 tabular-nums">{formatINR(booking.totalAmount || booking.finalPrice)}</span>
              </div>
            ) : (
              <p className="text-xs text-ink-500">No amount agreed yet — providers are quoting.</p>
            )}
            {invoice && (
              <p className="mt-2.5 pt-2.5 border-t border-line text-xs text-ink-500 inline-flex items-center gap-1.5">
                <FileText className="size-3.5" aria-hidden />
                Invoice <span className="font-mono">{invoice.invoiceNumber}</span>
              </p>
            )}
          </Card>

          <Link href="/admin/bookings" className={buttonClasses({ variant: "secondary", size: "md", className: "w-full" })}>
            Back to all bookings
          </Link>
        </div>
      </div>
    </PageContainer>
  );
}
