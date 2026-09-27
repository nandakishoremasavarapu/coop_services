"use client";
import { useState, useEffect } from "react";
import { Search, ExternalLink } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import Link from "next/link";
import { apiFetch } from "@/lib/api";

export default function AdminBookingsPage() {
  const [bookings, setBookings] = useState<{
    booking: { id: string; status: string; serviceDescription: string; totalAmount?: string | null; isEmergency?: boolean | null; createdAt: string };
    category: { name: string } | null;
    service: { name: string } | null;
  }[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  useEffect(() => {
    apiFetch("/api/bookings?role=society_admin")
      .then((r) => r.json())
      .then((d) => setBookings((d as { bookings: typeof bookings }).bookings ?? []))
      .finally(() => setLoading(false));
  }, []);

  const filtered = bookings.filter(({ booking, category }) => {
    const matchSearch = !search ||
      booking.id.includes(search) ||
      booking.serviceDescription.toLowerCase().includes(search.toLowerCase()) ||
      category?.name.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "all" || booking.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const statuses = ["all", "submitted", "quoted", "accepted", "work_started", "completed", "paid", "rated", "cancelled", "disputed"];

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Bookings Monitor</h1>
        <p className="text-slate-500 text-sm mt-1">Track all service requests and their current status</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by ID, service or description..."
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
          {statuses.map((s) => (
            <option key={s} value={s}>{s === "all" ? "All Statuses" : s.replace(/_/g, " ")}</option>
          ))}
        </select>
      </div>

      {loading && <div className="flex justify-center py-12"><LoadingSpinner /></div>}

      {!loading && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-5 py-3 text-slate-500 font-semibold">Booking ID</th>
                  <th className="text-left px-5 py-3 text-slate-500 font-semibold">Service</th>
                  <th className="text-left px-5 py-3 text-slate-500 font-semibold">Description</th>
                  <th className="text-left px-5 py-3 text-slate-500 font-semibold">Status</th>
                  <th className="text-left px-5 py-3 text-slate-500 font-semibold">Amount</th>
                  <th className="text-left px-5 py-3 text-slate-500 font-semibold">Date</th>
                  <th className="text-left px-5 py-3 text-slate-500 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map(({ booking, category, service }) => (
                  <tr key={booking.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3 font-mono text-xs text-slate-500">
                      #{booking.id.slice(-8).toUpperCase()}
                      {booking.isEmergency && <span className="ml-1 text-red-500">🚨</span>}
                    </td>
                    <td className="px-5 py-3">
                      <div className="font-medium text-slate-800">{category?.name ?? "—"}</div>
                      {service && <div className="text-xs text-slate-400">{service.name}</div>}
                    </td>
                    <td className="px-5 py-3 max-w-xs">
                      <div className="text-slate-600 truncate">{booking.serviceDescription}</div>
                    </td>
                    <td className="px-5 py-3">
                      <StatusBadge status={booking.status} size="sm" />
                    </td>
                    <td className="px-5 py-3 font-semibold">
                      {booking.totalAmount ? `₹${parseFloat(booking.totalAmount).toFixed(0)}` : "—"}
                    </td>
                    <td className="px-5 py-3 text-slate-400 text-xs">
                      {new Date(booking.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    </td>
                    <td className="px-5 py-3">
                      <Link
                        href={`/admin/bookings/${booking.id}`}
                        className="flex items-center gap-1 text-blue-600 hover:text-blue-700 text-xs font-semibold"
                      >
                        <ExternalLink size={12} /> View
                      </Link>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-5 py-8 text-center text-slate-400">No bookings found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="px-5 py-3 border-t border-slate-100 text-sm text-slate-500">
            Showing {filtered.length} of {bookings.length} bookings
          </div>
        </div>
      )}
    </div>
  );
}
