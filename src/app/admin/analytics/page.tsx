"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Award,
  BarChart4,
  ClipboardList,
  HandCoins,
  LineChart as LineChartIcon,
  Target,
  Users,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  AreaChart,
  Area,
} from "recharts";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/cn";
import { formatINR } from "@/lib/format";
import { getBookingStatusLabel } from "@/lib/status";
import { PageContainer, PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { buttonClasses } from "@/components/ui/button";
import { LoadingBlock } from "@/components/ui/states";

interface Stats {
  bookingStatusCounts: { status: string; count: number }[];
  recentBookings: { date: string; count: number }[];
  providerAvailCounts: { availability: string; count: number }[];
  avgRating: string;
  totalPayments: string;
}

const BRAND = "#135b45";
const BRAND_LIGHT = "#2f8a66";

export default function AdminAnalyticsPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [trendView, setTrendView] = useState<"area" | "line">("area");

  useEffect(() => {
    apiFetch("/api/admin/stats")
      .then((r) => r.json())
      .then((d) => {
        if (d && !d.error) {
          setStats(d as Stats);
        } else {
          setStats({
            bookingStatusCounts: Array.isArray(d?.bookingStatusCounts) ? d.bookingStatusCounts : [],
            recentBookings: Array.isArray(d?.recentBookings) ? d.recentBookings : [],
            providerAvailCounts: Array.isArray(d?.providerAvailCounts) ? d.providerAvailCounts : [],
            avgRating: d?.avgRating || "0.0",
            totalPayments: d?.totalPayments || "0",
          });
        }
      })
      .catch(() => {});
  }, []);

  if (!stats) {
    return <LoadingBlock label="Crunching the numbers…" className="py-24" />;
  }

  const bookingStatusCounts = Array.isArray(stats.bookingStatusCounts) ? stats.bookingStatusCounts : [];
  const recentBookings = Array.isArray(stats.recentBookings) ? stats.recentBookings : [];
  const providerAvailCounts = Array.isArray(stats.providerAvailCounts) ? stats.providerAvailCounts : [];

  // 7-day rolling window built around real recorded counts only.
  const sevenDaySeries = [];
  const now = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const isoDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const matched = recentBookings.find((r) => r.date === isoDate || (r.date && r.date.startsWith(isoDate)));
    sevenDaySeries.push({
      date: d.toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
      day: d.toLocaleDateString("en-IN", { weekday: "short" }),
      bookings: matched ? Number(matched.count) || 0 : 0,
      isToday: i === 0,
    });
  }

  const totalCount = bookingStatusCounts.reduce((s, b) => s + (Number(b.count) || 0), 0);
  const completedCount = bookingStatusCounts
    .filter((b) => ["completed", "paid", "rated"].includes(b.status))
    .reduce((s, b) => s + (Number(b.count) || 0), 0);
  const completionRate = totalCount > 0 ? ((completedCount / totalCount) * 100).toFixed(1) : "0";

  const availableProviders = providerAvailCounts.find((p) => p.availability === "available")?.count ?? 0;
  const pendingPipeline = bookingStatusCounts
    .filter((b) => ["submitted", "quoted"].includes(b.status))
    .reduce((s, b) => s + (Number(b.count) || 0), 0);

  const weeklyTotal = sevenDaySeries.reduce((s, d) => s + d.bookings, 0);
  const weeklyAvg = (weeklyTotal / 7).toFixed(1);
  const peakDay = [...sevenDaySeries].sort((a, b) => b.bookings - a.bookings)[0];

  const statusData = bookingStatusCounts
    .filter((b) => Number(b.count) > 0)
    .sort((a, b) => Number(b.count) - Number(a.count))
    .map((b) => ({ name: getBookingStatusLabel(b.status), count: Number(b.count) || 0 }));

  // Honest, data-derived operational insights (no fabricated forecasts).
  const insights: { title: string; body: string; intent: "warning" | "success" | "info" }[] = [];
  if (pendingPipeline > 0 && availableProviders === 0) {
    insights.push({
      title: "Unstaffed demand",
      body: `${pendingPipeline} open request${pendingPipeline === 1 ? "" : "s"} but no providers are on duty right now. Ping members to come online.`,
      intent: "warning",
    });
  } else if (pendingPipeline > 0) {
    insights.push({
      title: "Open pipeline",
      body: `${pendingPipeline} request${pendingPipeline === 1 ? "" : "s"} still need provider action — quotes or acceptance.`,
      intent: "info",
    });
  }
  if (completedCount > 0 && Number(completionRate) < 60) {
    insights.push({
      title: "Completion slipping",
      body: `Only ${completionRate}% of requests reached completion. Check stuck active jobs in the monitor.`,
      intent: "warning",
    });
  } else if (completedCount > 0) {
    insights.push({
      title: "Healthy completion",
      body: `${completionRate}% of all requests complete. Keep the dispatch cadence steady.`,
      intent: "success",
    });
  }
  if (weeklyTotal === 0) {
    insights.push({
      title: "Quiet week",
      body: "No bookings were recorded in the last 7 days. Consider a resident awareness drive via member societies.",
      intent: "info",
    });
  } else {
    insights.push({
      title: "Weekly cadence",
      body: `${weeklyTotal} bookings this week (avg ${weeklyAvg}/day), peaking on ${peakDay?.day}.`,
      intent: "success",
    });
  }

  return (
    <PageContainer width="wide">
      <PageHeader
        title="Analytics & insights"
        description="Demand, completion and payout trends across the society."
        actions={
          <Link href="/admin/bookings" className={buttonClasses({ variant: "secondary", size: "sm" })}>
            Open bookings monitor
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        }
      />

      {/* ---------- KPIs ---------- */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard icon={<ClipboardList />} label="Total bookings" value={String(totalCount)} sub={`${pendingPipeline} in open pipeline`} />
        <StatCard icon={<Target />} label="Completion rate" value={`${completionRate}%`} sub={`${completedCount} reached completion`} />
        <StatCard icon={<Award />} label="Avg member rating" value={stats.avgRating ?? "—"} sub="Across rated jobs" />
        <StatCard icon={<HandCoins />} label="Collections" value={formatINR(stats.totalPayments ?? 0)} sub="Lifetime settled value" />
      </div>

      {/* ---------- Charts ---------- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mt-6">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <CardTitle>Booking velocity</CardTitle>
                <CardDescription>Daily demand over the last 7 days</CardDescription>
              </div>
              <div className="flex items-center rounded-xl bg-ink-100 p-1 gap-1 shrink-0">
                {(
                  [
                    { key: "area", icon: LineChartIcon, label: "Trend" },
                    { key: "line", icon: BarChart4, label: "Line" },
                  ] as const
                ).map((v) => (
                  <button
                    key={v.key}
                    type="button"
                    onClick={() => setTrendView(v.key)}
                    aria-pressed={trendView === v.key}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-bold transition-colors",
                      trendView === v.key ? "bg-panel text-brand-700 shadow-card" : "text-ink-500 hover:text-ink-900"
                    )}
                  >
                    <v.icon className="size-3.5" aria-hidden />
                    {v.label}
                  </button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="h-52 w-full" role="img" aria-label="Seven day booking trend">
              <ResponsiveContainer width="100%" height="100%">
                {trendView === "area" ? (
                  <AreaChart data={sevenDaySeries} margin={{ top: 10, right: 10, left: -22, bottom: 0 }}>
                    <defs>
                      <linearGradient id="analyticsGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={BRAND} stopOpacity={0.35} />
                        <stop offset="95%" stopColor={BRAND} stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ecf0ee" vertical={false} />
                    <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#63716a" }} axisLine={{ stroke: "#d8e0dd" }} tickLine={false} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#63716a" }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{ borderRadius: 12, border: "1px solid #d8e0dd", fontSize: 12 }}
                      formatter={(value) => [`${value} bookings`, "Requests"]}
                    />
                    <Area type="monotone" dataKey="bookings" stroke={BRAND} strokeWidth={2.5} fill="url(#analyticsGrad)" dot={{ r: 3, fill: BRAND, strokeWidth: 2, stroke: "#fff" }} />
                  </AreaChart>
                ) : (
                  <LineChart data={sevenDaySeries} margin={{ top: 10, right: 10, left: -22, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ecf0ee" vertical={false} />
                    <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#63716a" }} axisLine={{ stroke: "#d8e0dd" }} tickLine={false} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#63716a" }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{ borderRadius: 12, border: "1px solid #d8e0dd", fontSize: 12 }}
                      formatter={(value) => [`${value} bookings`, "Requests"]}
                    />
                    <Line type="monotone" dataKey="bookings" stroke={BRAND_LIGHT} strokeWidth={2.5} dot={{ r: 3.5, fill: BRAND_LIGHT }} />
                  </LineChart>
                )}
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Status breakdown</CardTitle>
            <CardDescription>{statusData.length} live stages across {totalCount} bookings</CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            {statusData.length > 0 ? (
              <div className="h-52 w-full" role="img" aria-label="Booking status breakdown">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={statusData} layout="vertical" margin={{ top: 4, right: 10, left: 10, bottom: 0 }}>
                    <XAxis type="number" tick={{ fontSize: 11, fill: "#63716a" }} allowDecimals={false} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "#33413c" }} width={110} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{ borderRadius: 12, border: "1px solid #d8e0dd", fontSize: 12 }}
                      formatter={(value) => [`${value} bookings`, "Count"]}
                    />
                    <Bar dataKey="count" fill={BRAND} maxBarSize={20} radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="h-52 flex items-center justify-center text-sm text-ink-400">No booking data yet</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ---------- Operational insights (data-derived) ---------- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
        {insights.map((insight) => (
          <Card
            key={insight.title}
            className={cn(
              "p-5 border-l-4",
              insight.intent === "warning" && "border-l-warning-500",
              insight.intent === "success" && "border-l-success-500",
              insight.intent === "info" && "border-l-info-500"
            )}
          >
            <p className="text-sm font-bold text-ink-900">{insight.title}</p>
            <p className="mt-1.5 text-sm text-ink-600 leading-relaxed">{insight.body}</p>
          </Card>
        ))}
      </div>

      <Card className="mt-6 p-5 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-ink-900 inline-flex items-center gap-2">
            <Users className="size-4.5 text-brand-700" aria-hidden />
            {availableProviders} provider{availableProviders === 1 ? "" : "s"} on duty
          </p>
          <p className="text-xs text-ink-500 mt-1">
            Capacity is healthiest when at least three members are available per active society.
          </p>
        </div>
        <Link href="/admin/providers" className={buttonClasses({ variant: "secondary", size: "sm", className: "shrink-0" })}>
          Manage members
        </Link>
      </Card>
    </PageContainer>
  );
}
