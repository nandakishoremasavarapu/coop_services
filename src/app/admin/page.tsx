"use client";

import { apiFetch } from "@/lib/api";
import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BarChart4,
  Building2,
  CheckCircle2,
  ClipboardList,
  HandCoins,
  LineChart as LineChartIcon,
  Star,
  UserRound,
  Users,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  AreaChart,
  Area,
} from "recharts";
import { cn } from "@/lib/cn";
import { bookingRef, formatDate, formatINR, relativeTime } from "@/lib/format";
import { getBookingStatusLabel } from "@/lib/status";
import { PageContainer, PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { EmptyState, LoadingBlock } from "@/components/ui/states";

interface Stats {
  userCounts: { role: string; count: number }[];
  bookingStatusCounts: { status: string; count: number }[];
  providerAvailCounts: { availability: string; count: number }[];
  providerVerifCounts: { status: string; count: number }[];
  societyCount: number;
  avgRating: string;
  totalPayments: string;
  disputeCount: number;
  recentBookings: { date: string; count: number }[];
}

interface RecentBooking {
  booking: { id: string; status: string; serviceDescription: string; createdAt: string; totalAmount?: string | null };
  category: { name: string } | null;
}

const BRAND = "#135b45";
const BRAND_LIGHT = "#2f8a66";
const ACCENT = "#ea9633";

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [bookings, setBookings] = useState<RecentBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [chartView, setChartView] = useState<"bar" | "area">("bar");

  useEffect(() => {
    let isMounted = true;
    Promise.all([
      apiFetch("/api/admin/stats").then((r) => r.json()).catch(() => null),
      apiFetch("/api/bookings?role=society_admin").then((r) => r.json()).catch(() => null),
    ])
      .then(([statsData, bookingsData]) => {
        if (!isMounted) return;
        if (statsData && !statsData.error) {
          setStats(statsData as Stats);
        } else {
          if (statsData?.error) setErrorMsg(statsData.error);
          setStats({
            userCounts: Array.isArray(statsData?.userCounts) ? statsData.userCounts : [],
            bookingStatusCounts: Array.isArray(statsData?.bookingStatusCounts) ? statsData.bookingStatusCounts : [],
            providerAvailCounts: Array.isArray(statsData?.providerAvailCounts) ? statsData.providerAvailCounts : [],
            providerVerifCounts: Array.isArray(statsData?.providerVerifCounts) ? statsData.providerVerifCounts : [],
            societyCount: Number(statsData?.societyCount) || 0,
            avgRating: statsData?.avgRating || "0.0",
            totalPayments: statsData?.totalPayments || "0",
            disputeCount: Number(statsData?.disputeCount) || 0,
            recentBookings: Array.isArray(statsData?.recentBookings) ? statsData.recentBookings : [],
          });
        }
        if (bookingsData && Array.isArray((bookingsData as { bookings?: RecentBooking[] }).bookings)) {
          setBookings((bookingsData as { bookings: RecentBooking[] }).bookings.slice(0, 8));
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  if (loading) {
    return <LoadingBlock label="Loading the operations console…" className="py-24" />;
  }

  const userCounts = stats?.userCounts ?? [];
  const bookingStatusCounts = stats?.bookingStatusCounts ?? [];
  const providerAvailCounts = stats?.providerAvailCounts ?? [];
  const providerVerifCounts = stats?.providerVerifCounts ?? [];
  const recentBookings = stats?.recentBookings ?? [];

  const providerCount = userCounts.find((u) => u.role === "provider")?.count ?? 0;
  const customerCount = userCounts.find((u) => u.role === "customer")?.count ?? 0;
  const totalBookings = bookingStatusCounts.reduce((sum, b) => sum + (Number(b.count) || 0), 0);
  const completedBookings = bookingStatusCounts
    .filter((b) => ["completed", "paid", "rated"].includes(b.status))
    .reduce((sum, b) => sum + (Number(b.count) || 0), 0);
  const availableProviders = providerAvailCounts.find((p) => p.availability === "available")?.count ?? 0;
  const verifiedProviders = providerVerifCounts.find((p) => p.status === "verified")?.count ?? 0;

  const now = new Date();
  const sevenDaySeries = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const isoDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const matched = recentBookings.find((r) => r.date === isoDate || (r.date && r.date.startsWith(isoDate)));
    sevenDaySeries.push({
      date: d.toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
      day: d.toLocaleDateString("en-IN", { weekday: "short" }),
      fullDate: d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" }),
      bookings: matched ? Number(matched.count) || 0 : 0,
      isToday: i === 0,
    });
  }

  return (
    <PageContainer width="wide">
      <PageHeader
        title="Operations overview"
        description="Live picture of cooperative dispatch, members and collections."
        actions={
          <span className="hidden sm:inline-flex items-center gap-2 rounded-full border border-success-200 bg-success-50 px-3.5 py-1.5 text-xs font-bold text-success-700">
            <span className="relative size-2" aria-hidden>
              <span className="absolute inline-flex h-full w-full rounded-full bg-success-400 opacity-60 animate-ping" />
              <span className="relative inline-flex size-2 rounded-full bg-success-500" />
            </span>
            Live feed
          </span>
        }
      />

      {errorMsg && (
        <Card className="mb-5 border-warning-200 bg-warning-50/70 p-4 text-sm text-warning-800">
          <strong>Note:</strong> {errorMsg}
        </Card>
      )}

      {/* ---------- KPI cards ---------- */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard icon={<Users />} label="Providers" value={String(providerCount)} sub={`${availableProviders} available for dispatch`} />
        <StatCard icon={<UserRound />} label="Customers" value={String(customerCount)} sub={`${stats?.societyCount ?? 0} affiliated societies`} />
        <StatCard icon={<ClipboardList />} label="Bookings" value={String(totalBookings)} sub={`${completedBookings} completed & confirmed`} />
        <StatCard icon={<HandCoins />} label="Collections" value={formatINR(stats?.totalPayments ?? 0)} sub="10% cooperative fee allocated" />
      </div>

      {/* ---------- Secondary stats ---------- */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mt-4">
        <MiniStat icon={<CheckCircle2 />} label="Verified providers" value={String(verifiedProviders)} />
        <MiniStat icon={<Star />} label="Avg member rating" value={stats?.avgRating ?? "—"} />
        <MiniStat icon={<AlertTriangle />} label="Open disputes" value={String(stats?.disputeCount ?? 0)} tone={stats?.disputeCount ? "danger" : "default"} />
        <MiniStat icon={<Building2 />} label="Active societies" value={String(stats?.societyCount ?? 0)} />
      </div>

      {/* ---------- Charts ---------- */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 mt-6">
        <Card className="xl:col-span-2 p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3 pb-4 border-b border-line">
            <div>
              <h3 className="font-bold text-ink-900 inline-flex items-center gap-2">
                <Activity className="size-4.5 text-brand-600" aria-hidden />
                Booking velocity — last 7 days
              </h3>
              <p className="text-xs text-ink-400 mt-0.5">Daily service requests across all societies</p>
            </div>
            <div className="flex items-center rounded-xl bg-ink-100 p-1 gap-1">
              {(
                [
                  { key: "bar", label: "Daily", icon: BarChart4 },
                  { key: "area", label: "Trend", icon: LineChartIcon },
                ] as const
              ).map((v) => (
                <button
                  key={v.key}
                  type="button"
                  onClick={() => setChartView(v.key)}
                  aria-pressed={chartView === v.key}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-colors",
                    chartView === v.key ? "bg-panel text-brand-700 shadow-card" : "text-ink-500 hover:text-ink-900"
                  )}
                >
                  <v.icon className="size-3.5" aria-hidden />
                  {v.label}
                </button>
              ))}
            </div>
          </div>

          <div className="h-56 w-full pt-4" role="img" aria-label="Bookings per day bar chart">
            <ResponsiveContainer width="100%" height="100%">
              {chartView === "bar" ? (
                <BarChart data={sevenDaySeries} margin={{ top: 10, right: 10, left: -22, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ecf0ee" />
                  <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#63716a" }} axisLine={{ stroke: "#d8e0dd" }} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#63716a" }} axisLine={false} tickLine={false} />
                  <Tooltip
                    cursor={{ fill: "rgba(19,91,69,0.06)" }}
                    contentStyle={{ borderRadius: 12, border: "1px solid #d8e0dd", fontSize: 12, boxShadow: "0 4px 16px rgba(15,25,22,0.1)" }}
                    formatter={(value) => [`${value} bookings`, "Requests"]}
                    labelFormatter={(_, payload) => payload?.[0]?.payload?.fullDate ?? ""}
                  />
                  <Bar dataKey="bookings" maxBarSize={30} radius={[6, 6, 0, 0]}>
                    {sevenDaySeries.map((entry, index) => (
                      <Bar key={index} dataKey="bookings" fill={entry.isToday ? BRAND : BRAND_LIGHT} />
                    ))}
                  </Bar>
                </BarChart>
              ) : (
                <AreaChart data={sevenDaySeries} margin={{ top: 10, right: 10, left: -22, bottom: 0 }}>
                  <defs>
                    <linearGradient id="bookingGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={BRAND} stopOpacity={0.35} />
                      <stop offset="95%" stopColor={BRAND} stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ecf0ee" />
                  <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#63716a" }} axisLine={{ stroke: "#d8e0dd" }} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#63716a" }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ borderRadius: 12, border: "1px solid #d8e0dd", fontSize: 12, boxShadow: "0 4px 16px rgba(15,25,22,0.1)" }}
                    formatter={(value) => [`${value} bookings`, "Requests"]}
                    labelFormatter={(_, payload) => payload?.[0]?.payload?.fullDate ?? ""}
                  />
                  <Area type="monotone" dataKey="bookings" stroke={BRAND} strokeWidth={2.5} fill="url(#bookingGrad)" />
                </AreaChart>
              )}
            </ResponsiveContainer>
          </div>
        </Card>

        {/* ---------- Status mix ---------- */}
        <Card className="p-5 sm:p-6">
          <h3 className="font-bold text-ink-900">Booking mix</h3>
          <p className="text-xs text-ink-400 mt-0.5">Where every request stands today</p>
          {totalBookings === 0 ? (
            <p className="mt-6 text-sm text-ink-500">No bookings yet in this jurisdiction.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {bookingStatusCounts
                .filter((b) => Number(b.count) > 0)
                .sort((a, b) => Number(b.count) - Number(a.count))
                .slice(0, 6)
                .map((b) => {
                  const count = Number(b.count) || 0;
                  const pct = Math.round((count / totalBookings) * 100);
                  return (
                    <li key={b.status}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-semibold text-ink-700">{getBookingStatusLabel(b.status)}</span>
                        <span className="text-ink-400 tabular-nums">
                          {count} • {pct}%
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-ink-100 overflow-hidden">
                        <div
                          className={cn("h-full rounded-full", ["cancelled", "disputed"].includes(b.status) ? "bg-danger-400" : "bg-brand-500")}
                          style={{ width: `${Math.max(pct, 3)}%` }}
                        />
                      </div>
                    </li>
                  );
                })}
            </ul>
          )}
          <Link href="/admin/analytics" className="mt-5 inline-flex items-center gap-1.5 text-xs font-bold text-brand-700 hover:text-brand-800">
            Open full analytics
            <ArrowRight className="size-3.5" aria-hidden />
          </Link>
        </Card>
      </div>

      {/* ---------- Recent bookings ---------- */}
      <Card className="mt-6 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-line">
          <h3 className="font-bold text-ink-900">Recent requests</h3>
          <Link href="/admin/bookings" className={buttonClasses({ variant: "ghost", size: "sm" })}>
            View all
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>
        {bookings.length === 0 ? (
          <EmptyState compact icon={<ClipboardList />} title="No requests yet" description="New bookings across the society will stream in here." />
        ) : (
          <>
            <table className="hidden md:table w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-ink-400 uppercase tracking-wide border-b border-line">
                  <th className="px-5 py-3 font-semibold">Booking</th>
                  <th className="px-5 py-3 font-semibold">Category</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 font-semibold text-right">Amount</th>
                  <th className="px-5 py-3 font-semibold">Raised</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {bookings.map(({ booking, category }) => (
                  <tr key={booking.id} className="hover:bg-ink-50/60">
                    <td className="px-5 py-3">
                      <p className="font-semibold text-ink-900 line-clamp-1 max-w-64">{booking.serviceDescription}</p>
                      <p className="text-2xs font-mono text-ink-400 mt-0.5">{bookingRef(booking.id)}</p>
                    </td>
                    <td className="px-5 py-3 text-ink-700">{category?.name ?? "—"}</td>
                    <td className="px-5 py-3">
                      <StatusBadge status={booking.status} size="sm" />
                    </td>
                    <td className="px-5 py-3 text-right tabular-nums text-ink-800 font-semibold">
                      {booking.totalAmount ? formatINR(booking.totalAmount) : "—"}
                    </td>
                    <td className="px-5 py-3 text-ink-500 whitespace-nowrap">{relativeTime(booking.createdAt)}</td>
                    <td className="px-5 py-3 text-right">
                      <Link href={`/admin/bookings/${booking.id}`} className={buttonClasses({ variant: "ghost", size: "sm" })}>
                        Open
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <ul className="md:hidden divide-y divide-line">
              {bookings.map(({ booking, category }) => (
                <li key={booking.id}>
                  <Link href={`/admin/bookings/${booking.id}`} className="block px-4 py-3.5 hover:bg-ink-50/60">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-ink-900 truncate">{category?.name ?? "Service"}</p>
                      <StatusBadge status={booking.status} size="sm" />
                    </div>
                    <p className="text-xs text-ink-500 line-clamp-1 mt-1">{booking.serviceDescription}</p>
                    <p className="text-2xs text-ink-400 mt-1.5 font-mono">
                      {bookingRef(booking.id)} • {formatDate(booking.createdAt)}
                      {booking.totalAmount ? ` • ${formatINR(booking.totalAmount)}` : ""}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </Card>
    </PageContainer>
  );
}

function MiniStat({ icon, label, value, tone = "default" }: { icon: React.ReactNode; label: string; value: string; tone?: "default" | "danger" }) {
  return (
    <Card className="p-4 flex items-center gap-3">
      <span
        className={cn(
          "size-9 rounded-xl flex items-center justify-center shrink-0 [&>svg]:size-4.5",
          tone === "danger" ? "bg-danger-50 text-danger-600" : "bg-brand-50 text-brand-700"
        )}
        aria-hidden
      >
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-lg font-extrabold text-ink-900 leading-tight tabular-nums">{value}</p>
        <p className="text-2xs text-ink-500">{label}</p>
      </div>
    </Card>
  );
}
