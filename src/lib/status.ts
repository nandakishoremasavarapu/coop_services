/**
 * Unified status vocabulary for bookings, provider availability and
 * verification. Maps every backend status to a human label and a small set
 * of visual intents (instead of a rainbow of per-status colors).
 */

export type StatusIntent =
  | "neutral"
  | "info"
  | "brand"
  | "warning"
  | "success"
  | "danger";

export interface StatusMeta {
  label: string;
  intent: StatusIntent;
}

const BOOKING_STATUS: Record<string, StatusMeta> = {
  draft: { label: "Draft", intent: "neutral" },
  submitted: { label: "Request Submitted", intent: "info" },
  quoted: { label: "Quotes Received", intent: "info" },
  provider_selected: { label: "Provider Selected", intent: "brand" },
  accepted: { label: "Booking Confirmed", intent: "brand" },
  arrived_pending_confirmation: { label: "Arrival — Confirm", intent: "warning" },
  arrived: { label: "Provider Arrived", intent: "brand" },
  price_change_pending: { label: "Price Change — Review", intent: "warning" },
  price_confirmed: { label: "Price Confirmed", intent: "brand" },
  work_started_pending_confirmation: { label: "Work Start — Confirm", intent: "warning" },
  work_started: { label: "Work In Progress", intent: "brand" },
  completed_pending_confirmation: { label: "Completion — Verify", intent: "warning" },
  completed: { label: "Work Completed", intent: "success" },
  payment_pending: { label: "Payment Pending", intent: "warning" },
  paid: { label: "Paid", intent: "success" },
  rated: { label: "Rated", intent: "success" },
  cancellation_pending: { label: "Cancellation Pending", intent: "danger" },
  cancelled: { label: "Cancelled", intent: "danger" },
  disputed: { label: "Disputed", intent: "danger" },
};

const AVAILABILITY_STATUS: Record<string, StatusMeta> = {
  available: { label: "Online", intent: "success" },
  unavailable: { label: "Offline", intent: "neutral" },
  busy: { label: "Busy", intent: "warning" },
};

const VERIFICATION_STATUS: Record<string, StatusMeta> = {
  verified: { label: "Verified", intent: "success" },
  pending: { label: "Pending Review", intent: "warning" },
  review_required: { label: "Review Required", intent: "info" },
  failed: { label: "Rejected", intent: "danger" },
};

const PAYMENT_STATUS: Record<string, StatusMeta> = {
  pending: { label: "Pending", intent: "warning" },
  paid: { label: "Paid", intent: "success" },
  completed: { label: "Completed", intent: "success" },
  failed: { label: "Failed", intent: "danger" },
  refunded: { label: "Refunded", intent: "info" },
};

const KNOWN: Record<string, StatusMeta> = {
  ...BOOKING_STATUS,
  ...AVAILABILITY_STATUS,
  ...VERIFICATION_STATUS,
  ...PAYMENT_STATUS,
};

export function getStatusMeta(status: string): StatusMeta {
  const meta = KNOWN[status];
  if (meta) return meta;
  const label = status
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
  return { label, intent: "neutral" };
}

export function getBookingStatusLabel(status: string): string {
  return getStatusMeta(status).label;
}

/** Booking lifecycle steps used by the order timeline. */
export const BOOKING_LIFECYCLE: { key: string; label: string; statuses: string[] }[] = [
  { key: "submitted", label: "Request Submitted", statuses: ["submitted"] },
  { key: "quoted", label: "Quotes Received", statuses: ["quoted"] },
  { key: "confirmed", label: "Booking Confirmed", statuses: ["provider_selected", "accepted"] },
  { key: "arrived", label: "Provider Arrived", statuses: ["arrived_pending_confirmation", "arrived"] },
  { key: "work", label: "Work In Progress", statuses: ["price_change_pending", "price_confirmed", "work_started_pending_confirmation", "work_started"] },
  { key: "completed", label: "Work Completed", statuses: ["completed_pending_confirmation", "completed"] },
  { key: "paid", label: "Payment", statuses: ["payment_pending", "paid"] },
  { key: "rated", label: "Rating", statuses: ["rated"] },
];

export type LifecycleState = "done" | "current" | "upcoming" | "skipped";

export function getLifecycleStates(status: string): LifecycleState[] {
  // Terminal negative states render every step as upcoming (timeline hidden anyway).
  if (["cancelled", "cancellation_pending", "disputed"].includes(status)) {
    return BOOKING_LIFECYCLE.map(() => "upcoming");
  }
  let currentIndex = BOOKING_LIFECYCLE.findIndex((step) => step.statuses.includes(status));
  if (currentIndex === -1) currentIndex = 0;
  return BOOKING_LIFECYCLE.map((_, i) => (i < currentIndex ? "done" : i === currentIndex ? "current" : "upcoming"));
}

export const BOOKING_STATUS_GROUPS = {
  active: [
    "submitted",
    "quoted",
    "provider_selected",
    "accepted",
    "arrived_pending_confirmation",
    "arrived",
    "price_change_pending",
    "price_confirmed",
    "work_started_pending_confirmation",
    "work_started",
    "completed_pending_confirmation",
  ],
  completed: ["completed", "payment_pending", "paid", "rated"],
  cancelled: ["cancellation_pending", "cancelled", "disputed"],
};

export const ROLE_LABELS: Record<string, string> = {
  customer: "Customer",
  provider: "Service Provider",
  society_admin: "Society Admin",
  federation_admin: "Federation Admin",
  super_admin: "Super Admin",
};

export function roleLabel(role: string): string {
  return ROLE_LABELS[role] ?? role.replace(/_/g, " ");
}
