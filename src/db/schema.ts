import {
  pgTable,
  text,
  integer,
  boolean,
  timestamp,
  numeric,
  pgEnum,
  uuid,
  jsonb,
} from "drizzle-orm/pg-core";

// Enums
export const userRoleEnum = pgEnum("user_role", [
  "customer",
  "provider",
  "society_admin",
  "federation_admin",
  "super_admin",
]);

export const verificationStatusEnum = pgEnum("verification_status", [
  "pending",
  "verified",
  "failed",
  "review_required",
]);

export const availabilityStatusEnum = pgEnum("availability_status", [
  "available",
  "unavailable",
  "busy",
]);

export const bookingStatusEnum = pgEnum("booking_status", [
  "draft",
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
  "completed",
  "payment_pending",
  "paid",
  "rated",
  "cancellation_pending",
  "cancelled",
  "disputed",
]);

export const paymentMethodEnum = pgEnum("payment_method", ["online", "cash"]);

export const paymentStatusEnum = pgEnum("payment_status", [
  "pending",
  "initiated",
  "success",
  "failed",
  "refunded",
]);

export const disputeStatusEnum = pgEnum("dispute_status", [
  "open",
  "under_review",
  "resolved",
  "closed",
]);

// Users
export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  phone: text("phone").unique().notNull(),
  email: text("email").unique(),
  passwordHash: text("password_hash"),
  role: userRoleEnum("role").notNull().default("customer"),
  isActive: boolean("is_active").default(true).notNull(),
  language: text("language").default("en"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Identity Verification
export const identityVerifications = pgTable("identity_verifications", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .references(() => users.id)
    .notNull(),
  method: text("method").default("manual"),
  status: verificationStatusEnum("status").default("pending").notNull(),
  verifiedAt: timestamp("verified_at"),
  reviewedBy: uuid("reviewed_by"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Federations
export const federations = pgTable("federations", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  region: text("region"),
  status: text("status").default("active"),
  adminUserId: uuid("admin_user_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Cooperative Societies
export const societies = pgTable("societies", {
  id: uuid("id").defaultRandom().primaryKey(),
  federationId: uuid("federation_id").references(() => federations.id),
  name: text("name").notNull(),
  serviceArea: text("service_area"),
  address: text("address"),
  status: text("status").default("active"),
  adminUserId: uuid("admin_user_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Customer Profiles
export const customerProfiles = pgTable("customer_profiles", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .references(() => users.id)
    .notNull(),
  fullName: text("full_name").notNull(),
  dateOfBirth: text("date_of_birth"),
  gender: text("gender"),
  address: text("address"),
  city: text("city"),
  pincode: text("pincode"),
  latitude: numeric("latitude", { precision: 10, scale: 7 }),
  longitude: numeric("longitude", { precision: 10, scale: 7 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Service Provider Profiles
export const providerProfiles = pgTable("provider_profiles", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .references(() => users.id)
    .notNull(),
  societyId: uuid("society_id").references(() => societies.id),
  displayName: text("display_name").notNull(),
  experience: integer("experience").default(0),
  serviceArea: text("service_area"),
  address: text("address"),
  city: text("city"),
  pincode: text("pincode"),
  latitude: numeric("latitude", { precision: 10, scale: 7 }),
  longitude: numeric("longitude", { precision: 10, scale: 7 }),
  availability: availabilityStatusEnum("availability").default("available"),
  verificationStatus: verificationStatusEnum("verification_status").default(
    "pending"
  ),
  ratingAvg: numeric("rating_avg", { precision: 3, scale: 2 }).default("0"),
  ratingCount: integer("rating_count").default(0),
  bio: text("bio"),
  profilePhotoUrl: text("profile_photo_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Service Categories
export const serviceCategories = pgTable("service_categories", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  icon: text("icon").notNull(),
  description: text("description"),
  isActive: boolean("is_active").default(true),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Specific Services
export const specificServices = pgTable("specific_services", {
  id: uuid("id").defaultRandom().primaryKey(),
  categoryId: uuid("category_id")
    .references(() => serviceCategories.id)
    .notNull(),
  name: text("name").notNull(),
  description: text("description"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Skills
export const skills = pgTable("skills", {
  id: uuid("id").defaultRandom().primaryKey(),
  categoryId: uuid("category_id").references(() => serviceCategories.id),
  name: text("name").notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Provider Skills
export const providerSkills = pgTable("provider_skills", {
  id: uuid("id").defaultRandom().primaryKey(),
  providerId: uuid("provider_id")
    .references(() => providerProfiles.id)
    .notNull(),
  skillId: uuid("skill_id")
    .references(() => skills.id)
    .notNull(),
  yearsExp: integer("years_exp").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Certifications
export const certifications = pgTable("certifications", {
  id: uuid("id").defaultRandom().primaryKey(),
  providerId: uuid("provider_id")
    .references(() => providerProfiles.id)
    .notNull(),
  type: text("type").notNull(),
  issuer: text("issuer"),
  issueDate: text("issue_date"),
  expiryDate: text("expiry_date"),
  verificationStatus: verificationStatusEnum("verification_status").default(
    "pending"
  ),
  documentUrl: text("document_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Bookings
export const bookings = pgTable("bookings", {
  id: uuid("id").defaultRandom().primaryKey(),
  customerId: uuid("customer_id")
    .references(() => users.id)
    .notNull(),
  providerId: uuid("provider_id").references(() => users.id),
  societyId: uuid("society_id").references(() => societies.id),
  categoryId: uuid("category_id").references(() => serviceCategories.id),
  serviceId: uuid("service_id").references(() => specificServices.id),
  serviceDescription: text("service_description").notNull(),
  mediaUrls: jsonb("media_urls").$type<string[]>().default([]),
  address: text("address").notNull(),
  city: text("city"),
  pincode: text("pincode"),
  latitude: numeric("latitude", { precision: 10, scale: 7 }),
  longitude: numeric("longitude", { precision: 10, scale: 7 }),
  preferredTime: timestamp("preferred_time"),
  isEmergency: boolean("is_emergency").default(false),
  status: bookingStatusEnum("status").default("submitted").notNull(),
  finalPrice: numeric("final_price", { precision: 10, scale: 2 }),
  platformFee: numeric("platform_fee", { precision: 10, scale: 2 }),
  totalAmount: numeric("total_amount", { precision: 10, scale: 2 }),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Quotes (Provider Estimates)
export const quotes = pgTable("quotes", {
  id: uuid("id").defaultRandom().primaryKey(),
  bookingId: uuid("booking_id")
    .references(() => bookings.id)
    .notNull(),
  providerId: uuid("provider_id")
    .references(() => users.id)
    .notNull(),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  note: text("note"),
  version: integer("version").default(1),
  status: text("status").default("submitted"),
  estimatedArrival: text("estimated_arrival"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Price Revisions
export const priceRevisions = pgTable("price_revisions", {
  id: uuid("id").defaultRandom().primaryKey(),
  bookingId: uuid("booking_id")
    .references(() => bookings.id)
    .notNull(),
  originalAmount: numeric("original_amount", { precision: 10, scale: 2 }),
  proposedAmount: numeric("proposed_amount", { precision: 10, scale: 2 }).notNull(),
  reason: text("reason").notNull(),
  requesterId: uuid("requester_id").references(() => users.id),
  customerApproved: boolean("customer_approved"),
  status: text("status").default("pending"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  resolvedAt: timestamp("resolved_at"),
});

// Milestone Confirmations
export const milestoneConfirmations = pgTable("milestone_confirmations", {
  id: uuid("id").defaultRandom().primaryKey(),
  bookingId: uuid("booking_id")
    .references(() => bookings.id)
    .notNull(),
  milestone: text("milestone").notNull(),
  actorId: uuid("actor_id").references(() => users.id),
  actorRole: text("actor_role"),
  status: text("status").default("pending"),
  confirmedAt: timestamp("confirmed_at"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Payments
export const payments = pgTable("payments", {
  id: uuid("id").defaultRandom().primaryKey(),
  bookingId: uuid("booking_id")
    .references(() => bookings.id)
    .notNull(),
  method: paymentMethodEnum("method").notNull(),
  expectedAmount: numeric("expected_amount", { precision: 10, scale: 2 }),
  paidAmount: numeric("paid_amount", { precision: 10, scale: 2 }),
  status: paymentStatusEnum("status").default("pending"),
  transactionRef: text("transaction_ref"),
  qrData: text("qr_data"),
  collectedBy: uuid("collected_by").references(() => users.id),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Invoices
export const invoices = pgTable("invoices", {
  id: uuid("id").defaultRandom().primaryKey(),
  bookingId: uuid("booking_id")
    .references(() => bookings.id)
    .notNull(),
  invoiceNumber: text("invoice_number").notNull().unique(),
  serviceAmount: numeric("service_amount", { precision: 10, scale: 2 }),
  platformFee: numeric("platform_fee", { precision: 10, scale: 2 }),
  totalAmount: numeric("total_amount", { precision: 10, scale: 2 }),
  paymentStatus: text("payment_status").default("pending"),
  issuedAt: timestamp("issued_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Ratings and Reviews
export const ratings = pgTable("ratings", {
  id: uuid("id").defaultRandom().primaryKey(),
  bookingId: uuid("booking_id")
    .references(() => bookings.id)
    .notNull(),
  customerId: uuid("customer_id").references(() => users.id),
  providerId: uuid("provider_id").references(() => users.id),
  rating: integer("rating").notNull(),
  reviewText: text("review_text"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Messages / Conversations
export const conversations = pgTable("conversations", {
  id: uuid("id").defaultRandom().primaryKey(),
  bookingId: uuid("booking_id").references(() => bookings.id),
  participantIds: jsonb("participant_ids").$type<string[]>().default([]),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const messages = pgTable("messages", {
  id: uuid("id").defaultRandom().primaryKey(),
  conversationId: uuid("conversation_id")
    .references(() => conversations.id)
    .notNull(),
  senderId: uuid("sender_id").references(() => users.id),
  content: text("content"),
  mediaUrl: text("media_url"),
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Cancellations
export const cancellations = pgTable("cancellations", {
  id: uuid("id").defaultRandom().primaryKey(),
  bookingId: uuid("booking_id")
    .references(() => bookings.id)
    .notNull(),
  requesterId: uuid("requester_id").references(() => users.id),
  requesterRole: text("requester_role"),
  reason: text("reason"),
  acknowledgedBy: uuid("acknowledged_by").references(() => users.id),
  status: text("status").default("pending"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  resolvedAt: timestamp("resolved_at"),
});

// Disputes
export const disputes = pgTable("disputes", {
  id: uuid("id").defaultRandom().primaryKey(),
  bookingId: uuid("booking_id")
    .references(() => bookings.id)
    .notNull(),
  raisedById: uuid("raised_by_id").references(() => users.id),
  reason: text("reason").notNull(),
  evidenceUrls: jsonb("evidence_urls").$type<string[]>().default([]),
  status: disputeStatusEnum("status").default("open"),
  resolution: text("resolution"),
  resolverId: uuid("resolver_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  resolvedAt: timestamp("resolved_at"),
});

// Welfare / Insurance
export const welfareRecords = pgTable("welfare_records", {
  id: uuid("id").defaultRandom().primaryKey(),
  providerId: uuid("provider_id")
    .references(() => providerProfiles.id)
    .notNull(),
  scheme: text("scheme").notNull(),
  policyRef: text("policy_ref"),
  status: text("status").default("active"),
  startDate: text("start_date"),
  endDate: text("end_date"),
  claimStatus: text("claim_status"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Notifications
export const notifications = pgTable("notifications", {
  id: uuid("id").defaultRandom().primaryKey(),
  recipientId: uuid("recipient_id")
    .references(() => users.id)
    .notNull(),
  type: text("type").notNull(),
  title: text("title").notNull(),
  content: text("content"),
  isRead: boolean("is_read").default(false),
  relatedEntityId: uuid("related_entity_id"),
  relatedEntityType: text("related_entity_type"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Audit Events
export const auditEvents = pgTable("audit_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  actorId: uuid("actor_id").references(() => users.id),
  actorRole: text("actor_role"),
  entityType: text("entity_type"),
  entityId: uuid("entity_id"),
  action: text("action").notNull(),
  oldState: jsonb("old_state"),
  newState: jsonb("new_state"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
