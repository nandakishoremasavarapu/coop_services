import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

// Default settings state (persisted in memory for demo / administration)
let currentSettings = {
  feeConfig: {
    platformFeePct: 10,
    welfareFundPct: 3,
    societyAdminPct: 2,
    emergencyMultiplier: 1.25,
    minVisitFee: 150,
  },
  notificationRules: {
    smsOnDispatch: true,
    whatsappUpdates: true,
    audioAlerts: true,
    arrivalReminderMins: 15,
    dailyDigestHour: "09:00",
    emergencyBroadcast: true,
  },
  serviceAreas: [
    {
      id: "zone-1",
      name: "Ernakulam Central Society",
      district: "Ernakulam",
      pincodes: ["682001", "682016", "682035", "682020"],
      radiusKm: 15,
      activeProviders: 18,
      status: "active",
    },
    {
      id: "zone-2",
      name: "Kozhikode North Cooperative",
      district: "Kozhikode",
      pincodes: ["673001", "673004", "673011"],
      radiusKm: 12,
      activeProviders: 12,
      status: "active",
    },
    {
      id: "zone-3",
      name: "Thiruvananthapuram South",
      district: "Thiruvananthapuram",
      pincodes: ["695001", "695014", "695036"],
      radiusKm: 20,
      activeProviders: 14,
      status: "active",
    },
  ],
  rolePermissions: {
    societyAdmin: {
      verifyProviders: true,
      assignJobs: true,
      adjustQuotes: true,
      mediateDisputes: true,
      viewDividends: true,
      modifyCatalog: false,
    },
    federationAdmin: {
      verifyProviders: true,
      assignJobs: true,
      adjustQuotes: true,
      mediateDisputes: true,
      viewDividends: true,
      modifyCatalog: true,
      auditFederation: true,
      changeFeePolicy: true,
    },
  },
  integrations: {
    paymentGateway: "razorpay_upi",
    paymentMode: "sandbox",
    identityVerification: "aadhaar_sandbox",
    mapsProvider: "openstreetmap",
    smsGateway: "nic_gov",
    status: {
      payments: "connected",
      identity: "connected",
      maps: "connected",
      sms: "connected",
    },
  },
};

export async function GET() {
  try {
    const session = await getSession();
    // Allow admin access or dev access
    return NextResponse.json({
      settings: currentSettings,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Admin settings GET error:", error);
    return NextResponse.json({ error: "Failed to load settings" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    const body = await request.json();

    // Merge incoming updates
    currentSettings = {
      ...currentSettings,
      ...body,
      feeConfig: { ...currentSettings.feeConfig, ...(body.feeConfig || {}) },
      notificationRules: { ...currentSettings.notificationRules, ...(body.notificationRules || {}) },
      rolePermissions: { ...currentSettings.rolePermissions, ...(body.rolePermissions || {}) },
      integrations: { ...currentSettings.integrations, ...(body.integrations || {}) },
      serviceAreas: body.serviceAreas || currentSettings.serviceAreas,
    };

    return NextResponse.json({
      success: true,
      message: "Settings updated successfully",
      settings: currentSettings,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Admin settings POST error:", error);
    return NextResponse.json({ error: "Failed to save settings" }, { status: 500 });
  }
}
