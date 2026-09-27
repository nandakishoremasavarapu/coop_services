"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ChevronRight, Clock, Inbox, MapPin, Zap } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { bookingRef, formatDateTime } from "@/lib/format";
import { ServiceIcon } from "@/lib/serviceIcons";
import { PageContainer, PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/states";

interface LeadItem {
  booking: {
    id: string;
    status: string;
    serviceDescription: string;
    address: string;
    city?: string | null;
    createdAt: string;
    isEmergency?: boolean | null;
  };
  category: { name: string } | null;
}

export default function ProviderRequestsPage() {
  const [requests, setRequests] = useState<LeadItem[] | null>(null);

  useEffect(() => {
    apiFetch("/api/bookings?role=provider")
      .then((r) => r.json())
      .then((d) => {
        const all = d.bookings ?? [];
        setRequests(all.filter((b: LeadItem) => b.booking.status === "submitted"));
      })
      .catch(() => setRequests([]));
  }, []);

  return (
    <PageContainer width="default">
      <PageHeader
        backHref="/provider"
        title="New service requests"
        description="Broadcasts matching your skills and service area — quote fast to win the job."
      />

      {requests === null ? (
        <div className="grid sm:grid-cols-2 gap-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-36 rounded-2xl" />
          ))}
        </div>
      ) : requests.length === 0 ? (
        <EmptyState
          icon={<Inbox />}
          title="No open requests"
          description="New customer broadcasts will appear here the moment they arrive. Keep your availability on."
        />
      ) : (
        <ul className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {requests.map(({ booking, category }) => (
            <li key={booking.id}>
              <Link
                href={`/provider/requests/${booking.id}`}
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
                  {booking.isEmergency && (
                    <Badge intent="danger" dot={false}>
                      <Zap className="size-3 mr-0.5" aria-hidden />
                      Emergency
                    </Badge>
                  )}
                </div>

                <p className="mt-3 text-sm text-ink-600 leading-relaxed line-clamp-2 flex-1">
                  {booking.serviceDescription}
                </p>

                <div className="mt-4 pt-3 border-t border-line space-y-1.5 text-xs text-ink-500">
                  <span className="flex items-center gap-1.5 truncate">
                    <MapPin className="size-3.5 text-accent-600 shrink-0" aria-hidden />
                    {booking.city ?? booking.address}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Clock className="size-3.5 shrink-0" aria-hidden />
                    {formatDateTime(booking.createdAt)}
                  </span>
                </div>

                <span className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-brand-700">
                  Open & quote
                  <ChevronRight className="size-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </PageContainer>
  );
}
