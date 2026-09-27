"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { MessageSquareQuote, Star, TrendingUp, Users } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/cn";
import { bookingRef } from "@/lib/format";
import { PageContainer, PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat";
import { EmptyState } from "@/components/ui/states";
import { StarRating } from "@/components/StarRating";
import { buttonClasses } from "@/components/ui/button";

interface RatedBookingRow {
  booking: { id: string; status: string; totalAmount?: string | null; createdAt: string };
  category: { name: string } | null;
}

interface RatingDetail {
  booking: { finalPrice?: string | null; providerId?: string | null };
  providerProfile: { displayName: string } | null;
  rating: { rating: number; reviewText?: string | null; createdAt?: string } | null;
}

interface RatedRow {
  bookingId: string;
  category: string;
  providerName: string;
  rating: number;
  reviewText?: string | null;
  price?: string | null;
}

export default function AdminRatingsPage() {
  const [rows, setRows] = useState<RatedRow[] | null>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      void (async () => {
        try {
          const res = await apiFetch("/api/bookings?role=society_admin");
          const d = await res.json();
          const list: RatedBookingRow[] = (d.bookings ?? []).filter((b: RatedBookingRow) =>
            ["rated"].includes(b.booking.status)
          );
          const details = await Promise.all(
            list.slice(0, 30).map(async ({ booking, category }) => {
              const r = await apiFetch(`/api/bookings/${booking.id}`);
              const detail = (await r.json()) as RatingDetail;
              return {
                bookingId: booking.id,
                category: category?.name ?? "Service",
                providerName: detail.providerProfile?.displayName ?? "Member",
                rating: detail.rating?.rating ?? 0,
                reviewText: detail.rating?.reviewText,
                price: detail.booking?.finalPrice,
              } satisfies RatedRow;
            })
          );
          setRows(details.filter((row) => row.rating > 0));
        } catch {
          setRows([]);
        }
      })();
    }, 0);
    return () => clearTimeout(t);
  }, []);

  if (rows === null) {
    return (
      <PageContainer width="wide">
        <PageHeader title="Ratings & service quality" description="Aggregating rated jobs…" />
        <div className="grid sm:grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="skeleton h-28 rounded-2xl" />
          ))}
        </div>
        <div className="skeleton h-64 rounded-2xl mt-5" />
      </PageContainer>
    );
  }

  const total = rows.length;
  const avg = total ? (rows.reduce((s, r) => s + r.rating, 0) / total).toFixed(1) : "—";
  const topPerformers = Math.max(...rows.map((r) => r.rating), 0);
  const fiveStarShare = total ? Math.round((rows.filter((r) => r.rating >= 4).length / total) * 100) : 0;

  const distribution = [5, 4, 3, 2, 1].map((stars) => ({
    stars,
    count: rows.filter((r) => r.rating === stars).length,
  }));

  return (
    <PageContainer width="wide">
      <PageHeader
        title="Ratings & service quality"
        description="Monitor member workmanship across completed jobs."
        actions={
          <Link href="/admin/providers" className={buttonClasses({ variant: "secondary", size: "sm" })}>
            Open member directory
          </Link>
        }
      />

      {total === 0 ? (
        <EmptyState
          icon={<Star />}
          title="No rated jobs yet"
          description="Once customers rate their completed services, quality metrics and reviews will aggregate here."
        />
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <StatCard icon={<Star />} label="Average rating" value={avg} sub={`${total} rated jobs`} />
            <StatCard icon={<TrendingUp />} label="Rated jobs" value={String(total)} sub="Across all categories" />
            <StatCard icon={<MessageSquareQuote />} label="4★ and above" value={`${fiveStarShare}%`} sub="Customer satisfaction" />
            <StatCard icon={<Users />} label="Top score" value={`${topPerformers}.0`} sub="Best member rating" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mt-6 items-start">
            {/* Distribution */}
            <Card className="p-5">
              <h3 className="font-bold text-ink-900 mb-4">Score distribution</h3>
              <ul className="space-y-3">
                {distribution.map((d) => {
                  const pct = total ? Math.round((d.count / total) * 100) : 0;
                  return (
                    <li key={d.stars} className="flex items-center gap-3">
                      <span className="text-xs font-bold text-ink-700 w-8 shrink-0 tabular-nums">{d.stars} ★</span>
                      <span className="flex-1 h-2.5 rounded-full bg-ink-100 overflow-hidden" role="img" aria-label={`${d.count} ratings of ${d.stars} stars`}>
                        <span
                          className={cn("block h-full rounded-full", d.stars >= 4 ? "bg-brand-500" : d.stars === 3 ? "bg-warning-500" : "bg-danger-400")}
                          style={{ width: `${Math.max(pct, 2)}%` }}
                        />
                      </span>
                      <span className="text-xs text-ink-400 tabular-nums w-10 text-right">
                        {d.count} · {pct}%
                      </span>
                    </li>
                  );
                })}
              </ul>
              <p className="mt-5 pt-4 border-t border-line text-xs text-ink-500 leading-relaxed">
                Ratings feed each member&apos;s trust score and affect lead distribution across the
                cooperative.
              </p>
            </Card>

            {/* Review wall */}
            <Card className="lg:col-span-2 overflow-hidden">
              <div className="px-5 py-4 border-b border-line">
                <h3 className="font-bold text-ink-900">Latest reviews</h3>
              </div>
              <ul className="divide-y divide-line">
                {rows.map((row) => (
                  <li key={row.bookingId} className="px-5 py-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-bold text-ink-900">
                          {row.category}
                          <span className="text-ink-400 font-normal"> · {row.providerName}</span>
                        </p>
                        <p className="text-2xs font-mono text-ink-400 mt-0.5">{bookingRef(row.bookingId)}</p>
                      </div>
                      <div className="text-right">
                        <StarRating rating={row.rating} size={14} />
                        {row.price && <p className="text-2xs text-ink-400 mt-0.5">Job value ₹{Math.round(parseFloat(row.price))}</p>}
                      </div>
                    </div>
                    {row.reviewText ? (
                      <blockquote className="mt-2.5 text-sm text-ink-600 italic leading-relaxed border-l-2 border-brand-200 pl-3.5">
                        “{row.reviewText}”
                      </blockquote>
                    ) : (
                      <p className="mt-2 text-xs text-ink-400">No written review — score only.</p>
                    )}
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </>
      )}
    </PageContainer>
  );
}
