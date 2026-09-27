"use client";

import React, { useEffect, useState } from "react";
import {
  ArrowRight,
  BadgeCheck,
  Bell,
  ClipboardList,
  HandCoins,
  Landmark,
  MessageSquare,
  Phone,
  ShieldCheck,
  Star,
  UserRound,
  Wallet,
  Wrench,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { Brand } from "@/components/shells/brand";
import { AuthDialog, type GatewayRole } from "@/components/auth/AuthDialog";
import { ServiceIcon } from "@/lib/serviceIcons";
import { Button, buttonClasses } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import type { ServiceCategory } from "@/lib/types";

const ROLE_GATEWAYS: {
  key: GatewayRole;
  title: string;
  who: string;
  description: string;
  points: string[];
  cta: string;
  icon: React.ReactNode;
}[] = [
  {
    key: "customer",
    title: "Customer",
    who: "Citizen / Household",
    description: "Book trusted home services from verified cooperative members with transparent pricing.",
    points: ["Verified local technicians", "Transparent rate cards", "Escrow-protected payments"],
    cta: "Book a service",
    icon: <UserRound className="size-5.5" />,
  },
  {
    key: "provider",
    title: "Service Provider",
    who: "Member-owner / Skilled tradesperson",
    description: "Join your labour cooperative, receive work requests directly and keep what you earn.",
    points: ["Direct job dispatch", "Fair 90% member share", "Welfare & insurance cover"],
    cta: "Join as provider",
    icon: <Wrench className="size-5.5" />,
  },
  {
    key: "admin",
    title: "Administration",
    who: "Federation / Society officials",
    description: "Govern members, bookings, transactions, welfare schemes and cooperative analytics.",
    points: ["Member verification", "Operations dashboards", "Welfare fund management"],
    cta: "Open console",
    icon: <Landmark className="size-5.5" />,
  },
];

const HOW_IT_WORKS = [
  {
    step: "1",
    title: "Describe the job",
    text: "Pick a service, describe the issue, add photos or a voice note and choose a time.",
    icon: ClipboardList,
  },
  {
    step: "2",
    title: "Compare cooperative quotes",
    text: "Nearby certified members respond with fair, benchmarked estimates — no surge pricing.",
    icon: HandCoins,
  },
  {
    step: "3",
    title: "Track work in real time",
    text: "Chat with your technician and follow every milestone until completion.",
    icon: MessageSquare,
  },
  {
    step: "4",
    title: "Pay & rate",
    text: "Settle securely and rate the work — your review protects the cooperative standard.",
    icon: Star,
  },
];

export default function LandingPage() {
  const [authOpen, setAuthOpen] = useState(false);
  const [authRole, setAuthRole] = useState<GatewayRole>("customer");
  const [categories, setCategories] = useState<ServiceCategory[] | null>(null);

  useEffect(() => {
    apiFetch("/api/services/categories")
      .then((r) => r.json())
      .then((d) => setCategories(d.categories ?? []))
      .catch(() => setCategories([]));
  }, []);

  const openAuth = (role: GatewayRole) => {
    setAuthRole(role);
    setAuthOpen(true);
  };

  return (
    <div className="min-h-dvh bg-panel text-ink-900">
      {/* ============================================================ Top navigation */}
      <header className="sticky top-0 z-50 bg-panel/90 backdrop-blur-md border-b border-line">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 sm:h-18 flex items-center justify-between gap-4">
          <Brand href="/" sub="Cooperative Services" size={36} />
          <nav aria-label="Site" className="hidden md:flex items-center gap-7 text-sm font-semibold text-ink-500">
            <a href="#services" className="hover:text-ink-900 transition-colors">Services</a>
            <a href="#how" className="hover:text-ink-900 transition-colors">How it works</a>
            <a href="#cooperative" className="hover:text-ink-900 transition-colors">Cooperative promise</a>
          </nav>
          <Button onClick={() => openAuth("customer")} variant="primary" size="sm" className="rounded-full px-5">
            Sign in
          </Button>
        </div>
      </header>

      <main>
        {/* ============================================================ Hero */}
        <section className="relative overflow-hidden bg-canvas border-b border-line">
          <div
            aria-hidden
            className="absolute inset-0 opacity-[0.4] [background-image:radial-gradient(circle_at_1px_1px,var(--color-line-strong)_1px,transparent_0)] [background-size:26px_26px]"
          />
          <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14 sm:py-20 lg:py-24 grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
            {/* Copy */}
            <div className="max-w-xl">
              <p className="inline-flex items-center gap-2 rounded-full bg-brand-50 border border-brand-200 px-3.5 py-1.5 text-xs font-bold text-brand-800">
                <ShieldCheck className="size-4" aria-hidden />
                Cooperative-owned • Worker-first • Transparent
              </p>
              <h1 className="mt-5 text-4xl sm:text-5xl lg:text-[3.4rem] font-extrabold tracking-tight text-ink-950 leading-[1.08] text-balance">
                Trusted home services, owned by the{" "}
                <span className="text-brand-700">workers themselves</span>
              </h1>
              <p className="mt-5 text-base sm:text-lg text-ink-600 leading-relaxed">
                Shram Setu connects households with verified, fairly-paid electricians, plumbers,
                carpenters and 20+ other trades — run by labour cooperatives, not middlemen.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row gap-3">
                <Button onClick={() => openAuth("customer")} size="lg" className="w-full sm:w-auto">
                  Book a service
                  <ArrowRight className="size-4.5" aria-hidden />
                </Button>
                <Button onClick={() => openAuth("provider")} size="lg" variant="outline" className="w-full sm:w-auto">
                  Join as a provider
                </Button>
              </div>

              {/* Plausible product facts — no vanity metrics */}
              <dl className="mt-10 grid grid-cols-3 gap-4 max-w-md">
                {[
                  { k: `${categories?.length ?? "20+"}+`, v: "Service trades" },
                  { k: "0%", v: "Commission markup" },
                  { k: "100%", v: "Direct payouts" },
                ].map((f) => (
                  <div key={f.v} className="border-l-2 border-brand-200 pl-3">
                    <dt className="text-2xl font-extrabold text-ink-900 tabular-nums">{f.k}</dt>
                    <dd className="text-xs text-ink-500 font-medium mt-0.5">{f.v}</dd>
                  </div>
                ))}
              </dl>
            </div>

            {/* Product illustration */}
            <div className="relative mx-auto w-full max-w-md lg:max-w-lg" aria-hidden>
              <div className="absolute -inset-8 bg-gradient-to-tr from-brand-100/60 via-transparent to-accent-100/60 blur-3xl rounded-full" />
              <div className="relative space-y-3.5">
                {/* Booking card */}
                <div className="bg-panel rounded-2xl border border-line shadow-raised p-5 -rotate-1 motion-safe:animate-[enter-up_0.5s_var(--ease-out-soft)_both]">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="size-10 rounded-xl bg-brand-50 text-brand-700 flex items-center justify-center">
                        <Wrench className="size-5" />
                      </span>
                      <div>
                        <p className="text-sm font-bold text-ink-900">Fan repair &amp; installation</p>
                        <p className="text-xs text-ink-400">Booking #BK-4F2A1C</p>
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 text-brand-800 px-2.5 py-1 text-xs font-semibold">
                      <span className="size-1.5 rounded-full bg-brand-500 animate-pulse" />
                      In progress
                    </span>
                  </div>
                  <div className="mt-4 flex items-center gap-2 text-xs text-ink-400">
                    <span className="h-1.5 flex-1 rounded-full bg-brand-500" />
                    <span className="h-1.5 flex-1 rounded-full bg-brand-500" />
                    <span className="h-1.5 flex-1 rounded-full bg-brand-500" />
                    <span className="h-1.5 flex-1 rounded-full bg-ink-100" />
                  </div>
                </div>

                {/* Provider card */}
                <div className="bg-panel rounded-2xl border border-line shadow-card p-5 rotate-1 ml-6 sm:ml-10 motion-safe:animate-[enter-up_0.5s_0.1s_var(--ease-out-soft)_both]">
                  <div className="flex items-center gap-3.5">
                    <span className="size-11 rounded-xl bg-brand-700 text-white flex items-center justify-center text-sm font-bold">RK</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-ink-900 flex items-center gap-1.5">
                        Ramesh Kumar
                        <BadgeCheck className="size-4 text-brand-600" />
                      </p>
                      <p className="text-xs text-ink-500">Senior electrician • Member since 2019</p>
                    </div>
                    <span className="inline-flex items-center gap-1 rounded-full bg-accent-50 text-accent-700 px-2 py-1 text-xs font-bold">
                      <Star className="size-3.5 fill-accent-500 text-accent-500" />
                      4.9
                    </span>
                  </div>
                </div>

                {/* Wallet card */}
                <div className="bg-brand-900 text-white rounded-2xl shadow-raised p-5 -rotate-1 mr-6 sm:mr-10 motion-safe:animate-[enter-up_0.5s_0.2s_var(--ease-out-soft)_both]">
                  <div className="flex items-center gap-3">
                    <span className="size-10 rounded-xl bg-white/10 flex items-center justify-center">
                      <Wallet className="size-5" />
                    </span>
                    <div>
                      <p className="text-xs text-brand-200 font-semibold uppercase tracking-wide">Today&apos;s payout</p>
                      <p className="text-xl font-extrabold tabular-nums">₹1,450</p>
                    </div>
                    <span className="ml-auto text-2xs font-bold bg-success-500/20 text-success-200 border border-success-400/30 rounded-full px-2.5 py-1">
                      90% member share
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ============================================================ Role gateway */}
        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14 sm:py-20">
          <div className="max-w-2xl">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-ink-950">Choose your portal</h2>
            <p className="mt-2.5 text-ink-600">
              One platform, three experiences — households booking services, members doing the work,
              and the cooperative officials who govern them.
            </p>
          </div>
          <div className="mt-8 grid md:grid-cols-3 gap-5">
            {ROLE_GATEWAYS.map((g) => (
              <div
                key={g.key}
                className="group rounded-3xl border border-line bg-panel p-6 shadow-card hover:shadow-raised hover:border-brand-300 transition-all flex flex-col"
              >
                <span className="size-12 rounded-2xl bg-brand-50 text-brand-700 flex items-center justify-center" aria-hidden>
                  {g.icon}
                </span>
                <h3 className="mt-4 text-lg font-extrabold text-ink-950">{g.title}</h3>
                <p className="text-xs font-bold uppercase tracking-wide text-brand-700 mt-0.5">{g.who}</p>
                <p className="mt-2.5 text-sm text-ink-600 leading-relaxed">{g.description}</p>
                <ul className="mt-4 space-y-2">
                  {g.points.map((pt) => (
                    <li key={pt} className="flex items-center gap-2 text-sm text-ink-700">
                      <BadgeCheck className="size-4 text-brand-600 shrink-0" aria-hidden />
                      {pt}
                    </li>
                  ))}
                </ul>
                <div className="mt-6 pt-4 border-t border-line">
                  <Button onClick={() => openAuth(g.key)} variant="secondary" className="w-full group-hover:bg-brand-700 group-hover:text-white group-hover:border-brand-700 transition-colors">
                    {g.cta}
                    <ArrowRight className="size-4" aria-hidden />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ============================================================ Services */}
        <section id="services" className="bg-canvas border-y border-line">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14 sm:py-20">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div className="max-w-2xl">
                <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-ink-950">Every household trade, one cooperative</h2>
                <p className="mt-2.5 text-ink-600">
                  Real service categories served by certified member-owners in your district.
                </p>
              </div>
              <Button onClick={() => openAuth("customer")} variant="outline">
                Browse &amp; book
                <ArrowRight className="size-4" aria-hidden />
              </Button>
            </div>

            <div className="mt-8 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
              {categories === null
                ? Array.from({ length: 10 }).map((_, i) => <div key={i} className="skeleton h-24 rounded-2xl" />)
                : categories.slice(0, 15).map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => openAuth("customer")}
                      className="group rounded-2xl border border-line bg-panel p-4 text-left shadow-card hover:shadow-raised hover:border-brand-300 transition-all"
                    >
                      <span className="size-10 rounded-xl bg-brand-50 text-brand-700 inline-flex items-center justify-center" aria-hidden>
                        <ServiceIcon category={cat.name} />
                      </span>
                      <p className="mt-3 text-sm font-bold text-ink-900 leading-snug group-hover:text-brand-800 transition-colors">
                        {cat.name.replace(/ Services?$/, "")}
                      </p>
                      {cat.description && (
                        <p className="mt-0.5 text-xs text-ink-400 leading-snug line-clamp-2">{cat.description}</p>
                      )}
                    </button>
                  ))}
            </div>
          </div>
        </section>

        {/* ============================================================ How it works */}
        <section id="how" className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14 sm:py-20">
          <div className="max-w-2xl">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-ink-950">How booking works</h2>
            <p className="mt-2.5 text-ink-600">From first tap to fair payment — a transparent journey for both sides.</p>
          </div>
          <ol className="mt-10 grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {HOW_IT_WORKS.map((s) => (
              <li key={s.step} className="relative rounded-3xl border border-line bg-panel p-6 shadow-card">
                <span className="absolute top-5 right-6 text-4xl font-extrabold text-ink-100 tabular-nums select-none" aria-hidden>
                  {s.step}
                </span>
                <span className="size-11 rounded-2xl bg-brand-50 text-brand-700 flex items-center justify-center" aria-hidden>
                  <s.icon className="size-5.5" />
                </span>
                <h3 className="mt-4 font-bold text-ink-900">{s.title}</h3>
                <p className="mt-1.5 text-sm text-ink-500 leading-relaxed">{s.text}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* ============================================================ Cooperative promise */}
        <section id="cooperative" className="bg-brand-950 text-white">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14 sm:py-20 grid lg:grid-cols-2 gap-10 items-center">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-brand-300">The cooperative promise</p>
              <h2 className="mt-3 text-2xl sm:text-3xl font-extrabold tracking-tight text-balance">
                Every rupee is recorded in the cooperative ledger
              </h2>
              <p className="mt-4 text-brand-100/85 leading-relaxed">
                No private intermediary, no surge pricing, no hidden fees. Democratic pricing benchmarks
                protect both citizens and workers, while a solidarity fund covers member welfare,
                insurance and emergency relief.
              </p>

              {/* Fair split visualizer */}
              <div className="mt-7 space-y-2.5">
                <div className="h-3 w-full rounded-full bg-white/10 overflow-hidden flex">
                  <div className="bg-success-400 h-full" style={{ width: "82%" }} title="Worker payout" />
                  <div className="bg-accent-400 h-full" style={{ width: "10%" }} title="Solidarity fund" />
                  <div className="bg-white/40 h-full" style={{ width: "8%" }} title="Platform upkeep" />
                </div>
                <ul className="flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-brand-100/80">
                  <li className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-success-400" />82% worker payout</li>
                  <li className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-accent-400" />10% welfare solidarity</li>
                  <li className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-white/40" />8% platform upkeep</li>
                </ul>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              {[
                { icon: BadgeCheck, t: "Verified members", d: "Identity and trade certification audited by the society before any dispatch." },
                { icon: HandCoins, t: "Fair-rate benchmarks", d: "Union rate cards keep estimates honest before work begins." },
                { icon: ShieldCheck, t: "Escrow protection", d: "Payments are milestone-locked and released only after you confirm." },
                { icon: Bell, t: "Welfare fund", d: "Members receive insurance, health cover and emergency relief." },
              ].map((f) => (
                <div key={f.t} className="rounded-3xl bg-white/8 border border-white/12 p-5">
                  <f.icon className="size-6 text-accent-300" aria-hidden />
                  <h3 className="mt-3 font-bold">{f.t}</h3>
                  <p className="mt-1.5 text-sm text-brand-100/75 leading-relaxed">{f.d}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ============================================================ CTA strip */}
        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14 sm:py-16">
          <div className="rounded-3xl bg-canvas border border-line px-6 sm:px-10 py-10 sm:py-12 flex flex-col md:flex-row md:items-center gap-6 justify-between">
            <div className="max-w-xl">
              <h2 className="text-2xl font-extrabold tracking-tight text-ink-950 text-balance">
                Your neighbourhood cooperative is one tap away
              </h2>
              <p className="mt-2 text-ink-600">Sign in to book a service, or register your trade with the federation.</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 shrink-0">
              <Button onClick={() => openAuth("customer")} size="lg">Book a service</Button>
              <a href="tel:18004198800" className={buttonClasses({ variant: "outline", size: "lg" })}>
                <Phone className="size-4.5" aria-hidden />
                Helpline
              </a>
            </div>
          </div>
        </section>
      </main>

      {/* ============================================================ Footer */}
      <footer className="border-t border-line bg-panel">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 flex flex-col md:flex-row gap-6 md:items-center justify-between">
          <Brand href="/" sub="Cooperative digital services marketplace" size={30} />
          <p className="text-xs text-ink-400 max-w-md leading-relaxed">
            Regulated under the Multi-State Co-operative Societies framework. Built as digital public
            infrastructure for labour federations and their members.
          </p>
          <button
            type="button"
            onClick={() => openAuth("customer")}
            className="text-sm font-bold text-brand-700 hover:underline underline-offset-4 shrink-0"
          >
            Sign in →
          </button>
        </div>
      </footer>

      <AuthDialog open={authOpen} onClose={() => setAuthOpen(false)} defaultRole={authRole} />
    </div>
  );
}
