"use client";

import { useState, useEffect } from "react";
import { Search, Users } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/cn";
import { formatDate, formatINR } from "@/lib/format";
import { PageContainer, PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Toast } from "@/components/ui/states";
import { EmptyState } from "@/components/ui/states";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { Modal } from "@/components/ui/modal";
import { SegmentedTabs } from "@/components/ui/tabs";
import { StarRating } from "@/components/StarRating";

interface ProviderData {
  provider: {
    id: string;
    displayName: string;
    experience?: number | null;
    serviceArea?: string | null;
    city?: string | null;
    availability: string;
    verificationStatus: string;
    ratingAvg?: string | null;
    ratingCount?: number | null;
    createdAt: string;
  };
  user: {
    id: string;
    phone: string;
    email?: string | null;
    isActive?: boolean | null;
    createdAt: string;
  } | null;
  society: {
    name: string;
  } | null;
}

type StatusFilter = "all" | "pending" | "verified" | "review_required" | "failed";

const VERIFICATION_BADGE: Record<string, { intent: "success" | "warning" | "info" | "danger"; label: string }> = {
  verified: { intent: "success", label: "Verified" },
  pending: { intent: "warning", label: "Pending" },
  review_required: { intent: "info", label: "Review required" },
  failed: { intent: "danger", label: "Failed" },
};

export default function AdminProvidersPage() {
  const [providers, setProviders] = useState<ProviderData[] | null>(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<StatusFilter>("all");
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [verifyTarget, setVerifyTarget] = useState<{ providerId: string; name: string; action: "verified" | "review_required" | "failed" } | null>(null);
  const [verifyNotes, setVerifyNotes] = useState("");
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const fetchProviders = () => {
    apiFetch("/api/admin/providers")
      .then((r) => r.json())
      .then((d) => setProviders((d as { providers: ProviderData[] }).providers ?? []))
      .catch(() => setProviders([]));
  };

  useEffect(() => {
    const t = setTimeout(fetchProviders, 0);
    return () => clearTimeout(t);
  }, []);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const handleVerify = async () => {
    if (!verifyTarget) return;
    setVerifyingId(verifyTarget.providerId);
    try {
      const res = await apiFetch(`/api/admin/providers/${verifyTarget.providerId}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: verifyTarget.action, notes: verifyNotes }),
      });
      if (res.ok) {
        showToast(
          verifyTarget.action === "verified"
            ? `${verifyTarget.name} is now a verified member.`
            : `Verification updated for ${verifyTarget.name}.`
        );
        setVerifyTarget(null);
        setVerifyNotes("");
        fetchProviders();
      } else {
        showToast("Update failed — please try again.");
      }
    } finally {
      setVerifyingId(null);
    }
  };

  const filtered = (providers ?? []).filter((p) => {
    const matchSearch =
      !search ||
      p.provider.displayName.toLowerCase().includes(search.toLowerCase()) ||
      p.user?.phone.includes(search) ||
      p.society?.name.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "all" || p.provider.verificationStatus === filterStatus;
    return matchSearch && matchStatus;
  });

  const counts: Record<StatusFilter, number> = {
    all: (providers ?? []).length,
    verified: (providers ?? []).filter((p) => p.provider.verificationStatus === "verified").length,
    pending: (providers ?? []).filter((p) => p.provider.verificationStatus === "pending").length,
    review_required: (providers ?? []).filter((p) => p.provider.verificationStatus === "review_required").length,
    failed: (providers ?? []).filter((p) => p.provider.verificationStatus === "failed").length,
  };

  return (
    <PageContainer width="wide">
      <PageHeader
        title="Providers & members"
        description="Review applications, manage verification and see member capacity."
      />

      <Card className="p-4 mb-4 flex flex-col lg:flex-row gap-3 lg:items-end">
        <Field label="Search members" className="flex-1">
          <Input
            icon={<Search />}
            placeholder="Name, phone or society…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </Field>
        <div>
          <p className="text-sm font-semibold text-ink-800 mb-1.5">Verification</p>
          <SegmentedTabs<StatusFilter>
            aria-label="Filter by verification status"
            value={filterStatus}
            onChange={setFilterStatus}
            options={[
              { value: "all", label: "All", count: counts.all },
              { value: "pending", label: "Pending", count: counts.pending },
              { value: "verified", label: "Verified", count: counts.verified },
              { value: "review_required", label: "Review", count: counts.review_required },
              { value: "failed", label: "Failed", count: counts.failed },
            ]}
          />
        </div>
      </Card>

      {providers === null ? (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-48 rounded-2xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Users />}
          title="No members match"
          description="Adjust the search or verification filter to see more members."
        />
      ) : (
        <ul className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(({ provider, user, society }) => {
            const meta = VERIFICATION_BADGE[provider.verificationStatus] ?? VERIFICATION_BADGE.pending;
            const actionable = provider.verificationStatus !== "verified";
            return (
              <li key={provider.id} className="rounded-2xl border border-line bg-panel p-4.5 shadow-card flex flex-col gap-3.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar name={provider.displayName} size="lg" online={provider.availability === "available"} />
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-ink-900 truncate">{provider.displayName}</p>
                      <p className="text-xs text-ink-500 tabular-nums">{user?.phone ?? "—"}</p>
                    </div>
                  </div>
                  <Badge intent={meta.intent} size="sm" className="shrink-0">{meta.label}</Badge>
                </div>

                <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
                  <div>
                    <dt className="text-ink-400">Society</dt>
                    <dd className="font-semibold text-ink-800 truncate">{society?.name ?? "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-ink-400">Experience</dt>
                    <dd className="font-semibold text-ink-800">{provider.experience ? `${provider.experience} yrs` : "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-ink-400">Area</dt>
                    <dd className="font-semibold text-ink-800 truncate">{provider.serviceArea || provider.city || "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-ink-400">Availability</dt>
                    <dd className="font-semibold text-ink-800 capitalize">{provider.availability}</dd>
                  </div>
                </dl>

                <div className="flex items-center justify-between">
                  {Number(provider.ratingAvg) > 0 ? (
                    <StarRating rating={Number(provider.ratingAvg)} size={13} />
                  ) : (
                    <span className="text-2xs text-ink-400">Not rated yet</span>
                  )}
                  <span className="text-2xs text-ink-400">Joined {formatDate(provider.createdAt)}</span>
                </div>

                {actionable && (
                  <div className="flex items-center gap-2 pt-3 border-t border-line">
                    <Button
                      size="sm"
                      variant="success"
                      className="flex-1"
                      loading={verifyingId === provider.id}
                      onClick={() => setVerifyTarget({ providerId: provider.id, name: provider.displayName, action: "verified" })}
                    >
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      className="flex-1"
                      disabled={verifyingId === provider.id}
                      onClick={() => setVerifyTarget({ providerId: provider.id, name: provider.displayName, action: "review_required" })}
                    >
                      Request review
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="flex-1"
                      disabled={verifyingId === provider.id}
                      onClick={() => setVerifyTarget({ providerId: provider.id, name: provider.displayName, action: "failed" })}
                    >
                      Reject
                    </Button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {/* ---------- Verification action modal ---------- */}
      <Modal
        open={!!verifyTarget}
        onClose={() => setVerifyTarget(null)}
        title={
          verifyTarget?.action === "verified"
            ? "Approve member"
            : verifyTarget?.action === "review_required"
              ? "Request further review"
              : "Reject application"
        }
        description={verifyTarget ? `For ${verifyTarget.name}` : undefined}
        footer={
          <>
            <Button variant="secondary" onClick={() => setVerifyTarget(null)}>
              Cancel
            </Button>
            <Button
              variant={verifyTarget?.action === "verified" ? "success" : verifyTarget?.action === "failed" ? "destructive" : "primary"}
              loading={verifyingId === verifyTarget?.providerId}
              onClick={handleVerify}
            >
              Confirm
            </Button>
          </>
        }
      >
        <Field label="Notes for the record" hint="Logged in the cooperative audit trail">
          <Textarea
            rows={3}
            value={verifyNotes}
            onChange={(e) => setVerifyNotes(e.target.value)}
            placeholder="e.g. ITI certificate & ID verified at the society desk…"
          />
        </Field>
        {verifyTarget?.action === "failed" && (
          <p className="mt-3 rounded-xl bg-danger-50 border border-danger-200 px-3.5 py-2.5 text-xs text-danger-700 leading-relaxed">
            Rejection pauses this member&apos;s ability to receive leads. You can reverse this later from the
            same directory.
          </p>
        )}
      </Modal>

      {toastMsg && <Toast message={toastMsg} onDismiss={() => setToastMsg(null)} />}
    </PageContainer>
  );
}
