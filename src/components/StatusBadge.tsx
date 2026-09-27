"use client";

const statusConfig: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  draft: { label: "Draft", bg: "bg-slate-100", text: "text-slate-600", dot: "bg-slate-400" },
  submitted: { label: "Submitted", bg: "bg-blue-50", text: "text-blue-700", dot: "bg-blue-400" },
  quoted: { label: "Quotes Received", bg: "bg-indigo-50", text: "text-indigo-700", dot: "bg-indigo-400" },
  provider_selected: { label: "Provider Selected", bg: "bg-purple-50", text: "text-purple-700", dot: "bg-purple-400" },
  accepted: { label: "Accepted", bg: "bg-cyan-50", text: "text-cyan-700", dot: "bg-cyan-400" },
  arrived_pending_confirmation: { label: "Arrival Pending", bg: "bg-yellow-50", text: "text-yellow-700", dot: "bg-yellow-400" },
  arrived: { label: "Provider Arrived", bg: "bg-teal-50", text: "text-teal-700", dot: "bg-teal-400" },
  price_change_pending: { label: "Price Change Pending", bg: "bg-orange-50", text: "text-orange-700", dot: "bg-orange-400" },
  price_confirmed: { label: "Price Confirmed", bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-400" },
  work_started_pending_confirmation: { label: "Work Start Pending", bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-400" },
  work_started: { label: "Work In Progress", bg: "bg-blue-50", text: "text-blue-700", dot: "bg-blue-500" },
  completed_pending_confirmation: { label: "Completion Pending", bg: "bg-violet-50", text: "text-violet-700", dot: "bg-violet-400" },
  completed: { label: "Completed", bg: "bg-green-50", text: "text-green-700", dot: "bg-green-500" },
  payment_pending: { label: "Payment Pending", bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-400" },
  paid: { label: "Paid", bg: "bg-green-50", text: "text-green-700", dot: "bg-green-500" },
  rated: { label: "Rated", bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-600" },
  cancellation_pending: { label: "Cancellation Pending", bg: "bg-red-50", text: "text-red-700", dot: "bg-red-400" },
  cancelled: { label: "Cancelled", bg: "bg-red-50", text: "text-red-700", dot: "bg-red-500" },
  disputed: { label: "Disputed", bg: "bg-red-50", text: "text-red-800", dot: "bg-red-600" },
  // Provider availability
  available: { label: "Available", bg: "bg-green-50", text: "text-green-700", dot: "bg-green-500" },
  unavailable: { label: "Unavailable", bg: "bg-slate-100", text: "text-slate-600", dot: "bg-slate-400" },
  busy: { label: "Busy", bg: "bg-yellow-50", text: "text-yellow-700", dot: "bg-yellow-400" },
  // Verification
  verified: { label: "Verified", bg: "bg-green-50", text: "text-green-700", dot: "bg-green-500" },
  pending: { label: "Pending", bg: "bg-yellow-50", text: "text-yellow-700", dot: "bg-yellow-400" },
  failed: { label: "Failed", bg: "bg-red-50", text: "text-red-700", dot: "bg-red-500" },
  review_required: { label: "Review Required", bg: "bg-orange-50", text: "text-orange-700", dot: "bg-orange-400" },
};

interface StatusBadgeProps {
  status: string;
  size?: "sm" | "md";
}

export function StatusBadge({ status, size = "md" }: StatusBadgeProps) {
  const config = statusConfig[status] ?? {
    label: status.replace(/_/g, " "),
    bg: "bg-slate-100",
    text: "text-slate-600",
    dot: "bg-slate-400",
  };

  const sizeClasses = size === "sm"
    ? "text-xs px-2 py-0.5"
    : "text-xs px-3 py-1";

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-semibold uppercase tracking-wide ${config.bg} ${config.text} ${sizeClasses}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot} flex-shrink-0`} />
      {config.label}
    </span>
  );
}
