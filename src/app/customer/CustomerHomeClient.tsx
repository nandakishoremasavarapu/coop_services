"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  ArrowUpRight,
  Phone,
  Search,
  Zap,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/cn";
import { bookingRef, relativeTime } from "@/lib/format";
import { ServiceIcon } from "@/lib/serviceIcons";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageContainer, PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/badge";
import { BookingTimeline } from "@/components/ui/timeline";
import type { ServiceCategory } from "@/lib/types";

interface BookingItem {
  booking: {
    id: string;
    status: string;
    serviceDescription: string;
    address?: string;
    preferredTime?: string | null;
    isEmergency?: boolean | null;
    totalAmount?: string | null;
    createdAt: string;
  };
  category: { name: string } | null;
}

const FALLBACK_CATEGORY_NAMES = [
  "Electrical Services",
  "Plumbing Services",
  "Carpentry Services",
  "Cleaning Services",
  "Painting Services",
  "AC & Cooling Services",
  "Masonry & Construction",
  "Technical & Appliance Services",
];

export default function CustomerHomeClient() {
  const router = useRouter();
  const [categories, setCategories] = useState<ServiceCategory[] | null>(null);
  const [bookings, setBookings] = useState<BookingItem[] | null>(null);
  const [profileName, setProfileName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    apiFetch("/api/services/categories")
      .then((r) => r.json())
      .then((d) => setCategories(d.categories ?? []))
      .catch(() => setCategories([]));

    apiFetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (d?.user?.profileName) setProfileName(d.user.profileName);
      })
      .catch(() => {});

    apiFetch("/api/bookings?role=customer")
      .then((r) => r.json())
      .then((d) => setBookings(d.bookings ?? []))
      .catch(() => setBookings([]));
  }, []);

  const activeBooking = bookings?.find(
    (b) => !["completed", "cancelled", "paid", "rated", "disputed"].includes(b.booking.status)
  );

  const recentOrders = (bookings ?? [])
    .slice()
    .sort((a, b) => +new Date(b.booking.createdAt) - +new Date(a.booking.createdAt))
    .slice(0, 3);

  const displayedCategories = (categories && categories.length > 0 ? categories : null) ?? (
    FALLBACK_CATEGORY_NAMES.map((name, i) => ({ id: `fallback-${i}`, name, icon: name } as unknown as ServiceCategory))
  );

  const visibleCategories = searchQuery.trim()
    ? displayedCategories.filter((c) => c.name.toLowerCase().includes(searchQuery.trim().toLowerCase()))
    : displayedCategories.slice(0, 8);

  const openCategory = (cat: ServiceCategory) => {
    const params = new URLSearchParams();
    if (!cat.id.startsWith("fallback-")) params.set("categoryId", cat.id);
    params.set("categoryName", cat.name);
    router.push(`/customer/book?${params.toString()}`);
  };

  const firstName = profileName.split(" ")[0] || "there";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <PageContainer width="wide" className="max-w-7xl">
      <PageHeader
        title={
          <>
            {greeting}{profileName ? `, ${firstName}` : ""} <span aria-hidden>👋</span>
          </>
        }
        description="Book verified cooperative services, or track your current request below."
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* ================================================= Main column */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-5 order-2 lg:order-1">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4.5 text-ink-400" aria-hidden />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for a service — fan repair, tap leakage, painting…"
              aria-label="Search services"
              className="w-full h-12 sm:h-13 rounded-2xl border border-line-strong bg-panel pl-11 pr-4 text-[15px] shadow-card placeholder:text-ink-400 focus:outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-600/15 transition-colors"
            />
          </div>

          {/* Service categories */}
          <section aria-labelledby="services-heading">
            <div className="flex items-center justify-between mb-3">
              <h2 id="services-heading" className="text-base font-bold text-ink-900">
                What do you need help with?
              </h2>
              {!searchQuery && displayedCategories.length > 8 && (
                <Link href="/customer/book" className="text-sm font-bold text-brand-700 hover:underline underline-offset-4">
                  All services
                </Link>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
              {visibleCategories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => openCategory(cat)}
                  className="group rounded-2xl border border-line bg-panel p-4 text-left shadow-card hover:shadow-raised hover:border-brand-300 transition-all min-h-27.5 flex flex-col"
                >
                  <span aria-hidden className="size-10.5 rounded-xl bg-brand-50 text-brand-700 flex items-center justify-center group-hover:bg-brand-700 group-hover:text-white transition-colors">
                    <ServiceIcon category={cat.name} size={22} />
                  </span>
                  <span className="mt-3 text-sm font-bold text-ink-900 leading-snug flex-1">
                    {cat.name.replace(/ Services?$/, "")}
                  </span>
                  <span className="mt-1 text-xs font-semibold text-brand-700 inline-flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    Book <ArrowUpRight className="size-3.5" aria-hidden />
                  </span>
                </button>
              ))}
              {visibleCategories.length === 0 && (
                <Card className="col-span-full px-6 py-8 text-center">
                  <p className="text-sm font-semibold text-ink-700">No services match “{searchQuery}”</p>
                  <p className="text-xs text-ink-400 mt-1">Try a different term, or browse the full booking form.</p>
                  <Button variant="secondary" size="sm" className="mt-4" onClick={() => router.push("/customer/book")}>
                    Open booking form
                  </Button>
                </Card>
              )}
            </div>
          </section>

          {/* Recent orders */}
          {bookings !== null && recentOrders.length > 0 && (
            <section aria-labelledby="recent-heading">
              <div className="flex items-center justify-between mb-3">
                <h2 id="recent-heading" className="text-base font-bold text-ink-900">Recent orders</h2>
                <Link href="/customer/orders" className="text-sm font-bold text-brand-700 hover:underline underline-offset-4">
                  View all
                </Link>
              </div>
              <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
                {recentOrders.map(({ booking, category }) => (
                  <Link
                    key={booking.id}
                    href={`/customer/orders/${booking.id}`}
                    className="group rounded-2xl border border-line bg-panel p-4 shadow-card hover:shadow-raised hover:border-brand-300 transition-all"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span aria-hidden className="size-9 rounded-xl bg-brand-50 text-brand-700 flex items-center justify-center">
                        <ServiceIcon category={category?.name} size={18} />
                      </span>
                      <StatusBadge status={booking.status} size="sm" />
                    </div>
                    <p className="mt-2.5 text-sm font-bold text-ink-900 leading-snug line-clamp-2">
                      {booking.serviceDescription}
                    </p>
                    <p className="mt-1.5 text-xs text-ink-400 font-mono">
                      {bookingRef(booking.id)} • {relativeTime(booking.createdAt)}
                    </p>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* ================================================= Side column */}
        <div className="lg:col-span-5 xl:col-span-4 space-y-5 order-1 lg:order-2 lg:sticky lg:top-20">
          {/* Active booking tracker */}
          <Card className="overflow-hidden">
            {activeBooking ? (
              <Link href={`/customer/orders/${activeBooking.booking.id}`} className="block p-5 group">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-bold uppercase tracking-[0.08em] text-brand-700 flex items-center gap-2">
                    <span className="relative flex size-2" aria-hidden>
                      <span className="absolute inline-flex h-full w-full rounded-full bg-brand-500 opacity-60 animate-ping" />
                      <span className="relative inline-flex rounded-full size-2 bg-brand-600" />
                    </span>
                    Active booking
                  </p>
                  <StatusBadge status={activeBooking.booking.status} size="sm" />
                </div>
                <h3 className="mt-2.5 text-[15px] font-bold text-ink-900 leading-snug group-hover:text-brand-800 transition-colors">
                  {activeBooking.booking.serviceDescription}
                </h3>
                <p className="mt-1 text-xs text-ink-400 font-mono">{bookingRef(activeBooking.booking.id)}</p>

                <div className="mt-4 overflow-x-auto no-scrollbar -mx-1 px-1">
                  <BookingTimeline
                    status={activeBooking.booking.status}
                    orientation="horizontal"
                    className={cn("min-w-105")}
                  />
                </div>

                <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-brand-700">
                  Track &amp; manage <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
                </span>
              </Link>
            ) : (
              <div className="p-5">
                <div className="flex items-center gap-3.5">
                  <span aria-hidden className="size-12 rounded-2xl bg-accent-50 text-accent-700 flex items-center justify-center">
                    <Zap className="size-6" />
                  </span>
                  <div className="min-w-0">
                    <h3 className="text-[15px] font-bold text-ink-900 leading-snug">Need help right now?</h3>
                    <p className="text-xs text-ink-500 mt-0.5 leading-snug">
                      Emergency requests reach nearby technicians within minutes.
                    </p>
                  </div>
                </div>
                <Button
                  variant="primary"
                  size="lg"
                  className="w-full mt-4"
                  onClick={() => router.push("/customer/book?emergency=true")}
                >
                  Book a service now
                </Button>
              </div>
            )}
          </Card>

          {/* Cooperative guarantee */}
          <Card className="p-5 bg-brand-950 border-brand-950 text-white">
            <p className="text-xs font-bold uppercase tracking-[0.1em] text-brand-300">Why Shram Setu?</p>
            <ul className="mt-3.5 space-y-3">
              {[
                { t: "Verified local members", d: "Identity & trade audited by your society" },
                { t: "Fair, benchmarked pricing", d: "Union rate cards — no surge, no haggling" },
                { t: "Escrow-protected payments", d: "Released only after you confirm the work" },
              ].map((f) => (
                <li key={f.t} className="flex gap-3">
                  <span aria-hidden className="mt-1 size-2 rounded-full bg-accent-400 shrink-0" />
                  <div>
                    <p className="text-sm font-bold leading-snug">{f.t}</p>
                    <p className="text-xs text-brand-100/70 mt-0.5 leading-snug">{f.d}</p>
                  </div>
                </li>
              ))}
            </ul>
          </Card>

          {/* Society helpdesk */}
          <Card className="p-4.5 flex items-center gap-3.5">
            <span aria-hidden className="size-11 rounded-xl bg-brand-50 text-brand-700 flex items-center justify-center shrink-0">
              <Phone className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-ink-900">Society helpdesk</p>
              <p className="text-xs text-ink-500">Mon–Sat, 9:00–18:00</p>
            </div>
            <a
              href="tel:18004198800"
              className="shrink-0 rounded-xl bg-brand-700 text-white px-3.5 py-2 text-xs font-bold hover:bg-brand-800 transition-colors"
            >
              Call
            </a>
          </Card>
        </div>
      </div>
    </PageContainer>
  );
}
