"use client";
import { Star } from "lucide-react";

export default function AdminRatingsPage() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Ratings & Complaints</h1>
        <p className="text-slate-500 text-sm mt-1">Monitor service quality and manage disputes</p>
      </div>
      <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100 text-center">
        <Star size={48} className="text-amber-400 mx-auto mb-4" />
        <h2 className="font-bold text-slate-700 mb-2">Ratings Monitor</h2>
        <p className="text-slate-500 text-sm">Customer ratings and complaint management will appear here as bookings are completed and reviewed.</p>
      </div>
    </div>
  );
}
