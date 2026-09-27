export interface User {
  id: string;
  phone: string;
  email?: string | null;
  role: "customer" | "provider" | "society_admin" | "federation_admin" | "super_admin";
  profileName: string;
  profile?: CustomerProfile | ProviderProfile | null;
}

export interface CustomerProfile {
  id: string;
  userId: string;
  fullName: string;
  dateOfBirth?: string | null;
  gender?: string | null;
  address?: string | null;
  city?: string | null;
  pincode?: string | null;
  latitude?: string | null;
  longitude?: string | null;
}

export interface ProviderProfile {
  id: string;
  userId: string;
  societyId?: string | null;
  displayName: string;
  experience?: number | null;
  serviceArea?: string | null;
  address?: string | null;
  city?: string | null;
  pincode?: string | null;
  availability: "available" | "unavailable" | "busy";
  verificationStatus: "pending" | "verified" | "failed" | "review_required";
  ratingAvg?: string | null;
  ratingCount?: number | null;
  bio?: string | null;
  profilePhotoUrl?: string | null;
}

export interface ServiceCategory {
  id: string;
  name: string;
  icon: string;
  description?: string | null;
  isActive?: boolean | null;
  sortOrder?: number | null;
}

export interface SpecificService {
  id: string;
  categoryId: string;
  name: string;
  description?: string | null;
  isActive?: boolean | null;
}

export interface Booking {
  id: string;
  customerId: string;
  providerId?: string | null;
  societyId?: string | null;
  categoryId?: string | null;
  serviceId?: string | null;
  serviceDescription: string;
  mediaUrls?: string[] | null;
  address: string;
  city?: string | null;
  pincode?: string | null;
  latitude?: string | null;
  longitude?: string | null;
  preferredTime?: string | null;
  isEmergency?: boolean | null;
  status: string;
  finalPrice?: string | null;
  platformFee?: string | null;
  totalAmount?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Quote {
  id: string;
  bookingId: string;
  providerId: string;
  amount: string;
  note?: string | null;
  version?: number | null;
  status?: string | null;
  estimatedArrival?: string | null;
  createdAt: string;
}

export interface PriceRevision {
  id: string;
  bookingId: string;
  originalAmount?: string | null;
  proposedAmount: string;
  reason: string;
  requesterId?: string | null;
  customerApproved?: boolean | null;
  status?: string | null;
  createdAt: string;
  resolvedAt?: string | null;
}

export interface Payment {
  id: string;
  bookingId: string;
  method: "online" | "cash";
  expectedAmount?: string | null;
  paidAmount?: string | null;
  status: string;
  transactionRef?: string | null;
  qrData?: string | null;
  createdAt: string;
}

export interface Invoice {
  id: string;
  bookingId: string;
  invoiceNumber: string;
  serviceAmount?: string | null;
  platformFee?: string | null;
  totalAmount?: string | null;
  paymentStatus?: string | null;
  issuedAt?: string | null;
}

export interface Rating {
  id: string;
  bookingId: string;
  customerId?: string | null;
  providerId?: string | null;
  rating: number;
  reviewText?: string | null;
  createdAt: string;
}

export interface Society {
  id: string;
  federationId?: string | null;
  name: string;
  serviceArea?: string | null;
  address?: string | null;
  status?: string | null;
}

export interface Notification {
  id: string;
  recipientId: string;
  type: string;
  title: string;
  content?: string | null;
  isRead?: boolean | null;
  relatedEntityId?: string | null;
  relatedEntityType?: string | null;
  createdAt: string;
}
