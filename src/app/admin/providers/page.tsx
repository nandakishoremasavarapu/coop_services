"use client";
import { useState, useEffect } from "react";
import { Search, CheckCircle, XCircle, Clock, Star, Filter } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { StarRating } from "@/components/StarRating";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { apiFetch } from "@/lib/api";

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

export default function AdminProvidersPage() {
  const [providers, setProviders] = useState<ProviderData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [showVerifyModal, setShowVerifyModal] = useState<{ providerId: string; action: string } | null>(null);
  const [verifyNotes, setVerifyNotes] = useState("");

  const fetchProviders = () => {
    apiFetch("/api/admin/providers")
      .then((r) => r.json())
      .then((d) => setProviders((d as { providers: ProviderData[] }).providers ?? []))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchProviders(); }, []);

  const handleVerify = async (providerId: string, status: string, notes: string) => {
    setVerifyingId(providerId);
    try {
      await apiFetch(`/api/admin/providers/${providerId}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, notes }),
      });
      fetchProviders();
      setShowVerifyModal(null);
      setVerifyNotes("");
    } finally {
      setVerifyingId(null);
    }
  };

  const filtered = providers.filter((p) => {
    const matchSearch = !search ||
      p.provider.displayName.toLowerCase().includes(search.toLowerCase()) ||
      p.user?.phone.includes(search) ||
      p.society?.name.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "all" || p.provider.verificationStatus === filterStatus;
    return matchSearch && matchStatus;
  });

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Provider / Member Directory</h1>
        <p className="text-slate-500 text-sm mt-1">Manage verification, availability and member status</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, phone or society..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
          <option value="all">All Verification Status</option>
          <option value="pending">Pending</option>
          <option value="verified">Verified</option>
          <option value="failed">Failed</option>
          <option value="review_required">Review Required</option>
        </select>
      </div>

      {/* Summary Badges */}
      <div className="flex flex-wrap gap-2 mb-4">
        {[
          { status: "all", label: `All (${providers.length})` },
          { status: "verified", label: `Verified (${providers.filter((p) => p.provider.verificationStatus === "verified").length})` },
          { status: "pending", label: `Pending (${providers.filter((p) => p.provider.verificationStatus === "pending").length})` },
          { status: "review_required", label: `Review (${providers.filter((p) => p.provider.verificationStatus === "review_required").length})` },
        ].map(({ status, label }) => (
          <button
            key={status}
            onClick={() => setFilterStatus(status)}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
              filterStatus === status ? "bg-blue-600 text-white" : "bg-white text-slate-600 border border-slate-200 hover:border-blue-300"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading && <div className="flex justify-center py-12"><LoadingSpinner /></div>}

      {!loading && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-5 py-3 text-slate-500 font-semibold">Provider</th>
                  <th className="text-left px-5 py-3 text-slate-500 font-semibold">Society</th>
                  <th className="text-left px-5 py-3 text-slate-500 font-semibold">Availability</th>
                  <th className="text-left px-5 py-3 text-slate-500 font-semibold">Verification</th>
                  <th className="text-left px-5 py-3 text-slate-500 font-semibold">Rating</th>
                  <th className="text-left px-5 py-3 text-slate-500 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map(({ provider, user, society }) => (
                  <tr key={provider.id} className="hover:bg-slate-50">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center font-bold text-blue-600">
                          {provider.displayName.charAt(0)}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-800">{provider.displayName}</div>
                          <div className="text-xs text-slate-400">{user?.phone}</div>
                          {provider.experience && (
                            <div className="text-xs text-slate-400">{provider.experience}y exp</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="text-sm text-slate-600">{society?.name ?? "—"}</div>
                      <div className="text-xs text-slate-400">{provider.city ?? provider.serviceArea}</div>
                    </td>
                    <td className="px-5 py-4">
                      <StatusBadge status={provider.availability} size="sm" />
                    </td>
                    <td className="px-5 py-4">
                      <StatusBadge status={provider.verificationStatus} size="sm" />
                    </td>
                    <td className="px-5 py-4">
                      {Number(provider.ratingAvg) > 0 ? (
                        <div className="flex items-center gap-1">
                          <Star size={12} className="text-amber-400 fill-amber-400" />
                          <span className="font-semibold text-slate-700">{provider.ratingAvg}</span>
                          <span className="text-xs text-slate-400">({provider.ratingCount})</span>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">No ratings</span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex gap-1.5">
                        {provider.verificationStatus !== "verified" && (
                          <button
                            onClick={() => setShowVerifyModal({ providerId: provider.id, action: "verified" })}
                            disabled={verifyingId === provider.id}
                            className="px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-xs font-semibold hover:bg-green-200 transition-colors disabled:opacity-50 flex items-center gap-1"
                          >
                            <CheckCircle size={12} /> Verify
                          </button>
                        )}
                        {provider.verificationStatus !== "failed" && (
                          <button
                            onClick={() => setShowVerifyModal({ providerId: provider.id, action: "failed" })}
                            disabled={verifyingId === provider.id}
                            className="px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-xs font-semibold hover:bg-red-200 transition-colors disabled:opacity-50 flex items-center gap-1"
                          >
                            <XCircle size={12} /> Reject
                          </button>
                        )}
                        {provider.verificationStatus !== "review_required" && (
                          <button
                            onClick={() => handleVerify(provider.id, "review_required", "Flagged for review")}
                            disabled={verifyingId === provider.id}
                            className="px-3 py-1.5 bg-orange-100 text-orange-700 rounded-lg text-xs font-semibold hover:bg-orange-200 transition-colors disabled:opacity-50 flex items-center gap-1"
                          >
                            <Clock size={12} /> Review
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5 py-8 text-center text-slate-400">
                      No providers found matching your filters
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Verify Modal */}
      {showVerifyModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
            <h3 className="font-bold text-slate-900 mb-4">
              {showVerifyModal.action === "verified" ? "✅ Verify Provider" : "❌ Reject Verification"}
            </h3>
            <textarea
              value={verifyNotes}
              onChange={(e) => setVerifyNotes(e.target.value)}
              placeholder="Add notes (optional)..."
              rows={3}
              className="w-full border border-slate-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
            />
            <div className="flex gap-2">
              <button
                onClick={() => handleVerify(showVerifyModal.providerId, showVerifyModal.action, verifyNotes)}
                className={`flex-1 py-2.5 rounded-xl text-white font-semibold text-sm ${
                  showVerifyModal.action === "verified" ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"
                }`}
              >
                Confirm {showVerifyModal.action === "verified" ? "Verification" : "Rejection"}
              </button>
              <button
                onClick={() => setShowVerifyModal(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-semibold text-sm hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
