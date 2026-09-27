"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Briefcase, ChevronRight } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { bookingRef, formatDate, formatINR } from "@/lib/format";
import { ServiceIcon } from "@/lib/serviceIcons";
import { StatusBadge } from "@/components/ui/badge";
import { PageContainer, PageHeader } from "@/components/ui/page-header";
import { SegmentedTabs } from "@/components/ui/tabs";
import { EmptyState } from "@/components/ui/states";

type Tab = "active" | "done" | "all";

interface JobItem {
  booking: {
    id: string;
    status: string;
    serviceDescription: string;
    finalPrice?: string | null;
    createdAt: string;
  };
  category: { name: string } | null;
}

const ACTIVE = [
  "quoted",
  "provider_selected",
  "accepted",
  "arrived_pending_confirmation",
  "arrived",
  "price_change_pending",
  "price_confirmed",
  "work_started",
  "completed_pending_confirmation",
];
const DONE = ["completed", "paid", "rated", "cancelled", "cancellation_pending", "disputed"];

export default function ProviderJobsPage() {
  const [jobs, setJobs] = useState<JobItem[] | null>(null);
  const [tab, setTab] = useState<Tab>("active");

  useEffect(() => {
    apiFetch("/api/bookings?role=provider")
      .then((r) => r.json())
      .then((d) => setJobs((d.bookings ?? []).filter((b: JobItem) => b.booking.status !== "submitted")))
      .catch(() => setJobs([]));
  }, []);

  const activeJobs = (jobs ?? []).filter(({ booking }) => ACTIVE.includes(booking.status));
  const doneJobs = (jobs ?? []).filter(({ booking }) => DONE.includes(booking.status));
  const visible = tab === "active" ? activeJobs : tab === "done" ? doneJobs : (jobs ?? []);

  return (
    <PageContainer width="default">
      <PageHeader
        backHref="/provider"
        title="My jobs"
        description="Jobs you're assigned to — track status and act right from the card."
      />

      <SegmentedTabs
        aria-label="Filter jobs"
        value={tab}
        onChange={setTab}
        options={[
          { value: "active", label: "Active", count: activeJobs.length },
          { value: "done", label: "Completed", count: doneJobs.length },
          { value: "all", label: "All", count: (jobs ?? []).length },
        ]}
      />

      <div className="mt-5">
        {jobs === null ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className="skeleton h-40 rounded-2xl" />
            ))}
          </div>
        ) : visible.length === 0 ? (
          <EmptyState
            icon={<Briefcase />}
            title={tab === "active" ? "No active jobs" : tab === "done" ? "No completed jobs yet" : "No jobs yet"}
            description={
              tab === "active"
                ? "Quote on open requests — when a customer selects you, the job lands here."
                : "Your finished and settled jobs will be listed here."
            }
          />
        ) : (
          <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {visible.map(({ booking, category }) => (
              <li key={booking.id}>
                <Link
                  href={`/provider/jobs/${booking.id}`}
                  className="group flex flex-col h-full rounded-2xl border border-line bg-panel p-4 shadow-card hover:shadow-raised hover:border-brand-300 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="size-10 rounded-xl bg-brand-50 text-brand-700 flex items-center justify-center shrink-0" aria-hidden>
                        <ServiceIcon category={category?.name} size={20} />
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-ink-900 truncate">{category?.name ?? "Service"}</p>
                        <p className="text-2xs text-ink-400 font-mono">{bookingRef(booking.id)}</p>
                      </div>
                    </div>
                    {booking.finalPrice && (
                      <p className="text-sm font-extrabold text-ink-900 tabular-nums shrink-0">{formatINR(booking.finalPrice)}</p>
                    )}
                  </div>

                  <p className="mt-3 text-sm text-ink-600 leading-relaxed line-clamp-2 flex-1">{booking.serviceDescription}</p>

                  <div className="mt-4 pt-3 border-t border-line flex items-center justify-between gap-2">
                    <StatusBadge status={booking.status} size="sm" />
                    <span className="text-xs text-ink-400">{formatDate(booking.createdAt)}</span>
                  </div>

                  <span className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-brand-700 opacity-0 group-hover:opacity-100 transition-opacity">
                    Open job
                    <ChevronRight className="size-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </PageContainer>
  );
}
