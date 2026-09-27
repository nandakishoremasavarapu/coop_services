import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

// Initial State for Cooperative Welfare & Insurance Pool
let welfareState = {
  stats: {
    totalPoolCorpus: 348500, // ₹3,48,500 accumulated from 3% booking welfare allocations + cooperative subsidy
    totalClaimsPaid: 95000,  // ₹95,000 paid out this year
    activeCoveredMembers: 48, // 48 verified member-owners
    monthlyInflow: 28400,     // ₹28,400 monthly welfare inflow
    emergencyReserve: 120000, // ₹1,20,000 instant mutual aid reserve
  },
  schemes: [
    {
      id: "scheme-health",
      name: "Aarogya Sahakari Health Shield",
      code: "AS-HLTH-2026",
      type: "Health & Hospitalization",
      coverageAmount: "₹2,00,000",
      coverageNum: 200000,
      monthlyDeduction: "₹150 / month (Paid by Pool)",
      status: "Active",
      beneficiaries: 48,
      insurer: "United India Insurance (Coop Consortium)",
      description: "Cashless in-patient hospitalization for member-owner, spouse, and up to 2 children at 120+ empanelled district hospitals across Kerala.",
      features: [
        "Zero waiting period for on-duty workplace illness",
        "Pre & post-hospitalization medical bills covered for 30 days",
        "Free annual health & vision checkup camp at Society premises",
      ],
    },
    {
      id: "scheme-accident",
      name: "Suraksha On-Duty Accident & Disability Cover",
      code: "SK-ACCD-2026",
      type: "Accident & Trauma",
      coverageAmount: "₹5,00,000",
      coverageNum: 500000,
      monthlyDeduction: "₹100 / month (Govt. Subsidized)",
      status: "Active",
      beneficiaries: 48,
      insurer: "Kerala State Labour Welfare Board",
      description: "24/7 on-call coverage for ladder falls, high-voltage shocks, chemical burns, and structural injuries during dispatch or commute.",
      features: [
        "Immediate emergency hospitalization advance up to ₹25,000 within 2 hours",
        "Temporary total disability stipend of ₹4,000 / week during recuperation",
        "Permanent partial & total disability capital disbursement",
      ],
    },
    {
      id: "scheme-tools",
      name: "Sahakari Tool & Equipment Protection Grant",
      code: "ST-TOOL-2026",
      type: "Equipment Insurance",
      coverageAmount: "₹35,000",
      coverageNum: 35000,
      monthlyDeduction: "Covered by Platform Welfare Levy",
      status: "Active",
      beneficiaries: 48,
      insurer: "Cooperative Mutual Aid Fund",
      description: "Zero-interest tool replacement grant for stolen, water-damaged, or burnt power tools, drill machines, ladders, and plumbing dies.",
      features: [
        "Fast-track 24-hour approval on society steward inspection",
        "Direct wholesale tool requisition from Cooperative Central Depot",
        "No depreciation deducted for certified member-owners",
      ],
    },
    {
      id: "scheme-pension",
      name: "Kalyan Nidhi Retirement & Mutual Dividend",
      code: "KN-RET-2026",
      type: "Pension & Dividend",
      coverageAmount: "₹1,200 / month + Annual Dividend",
      coverageNum: 1200,
      monthlyDeduction: "Voluntary matched contribution",
      status: "Active",
      beneficiaries: 36,
      insurer: "Kerala Sahakarana Pension Board",
      description: "Contributory cooperative pension scheme ensuring financial dignity for tradespeople after age 60, with annual dividend rights.",
      features: [
        "100% matched contribution from Cooperative Federation surplus",
        "Nominee survivor pension in event of premature demise",
        "Annual union patronage bonus disbursed during Onam festival",
      ],
    },
    {
      id: "scheme-education",
      name: "Vidyajyothi Member Children Scholarship",
      code: "VJ-EDU-2026",
      type: "Education Aid",
      coverageAmount: "₹10,000 / year",
      coverageNum: 10000,
      monthlyDeduction: "Funded via Society CSR & Welfare Fund",
      status: "Active",
      beneficiaries: 24,
      insurer: "Labour Welfare Educational Endowment",
      description: "Merit scholarships and tuition grants for higher secondary, polytechnic, and vocational diplomas for children of active member-owners.",
      features: [
        "Covers textbook, examination fees, and digital learning devices",
        "Special grant for daughters entering engineering and technical trades",
      ],
    },
  ],
  claims: [
    {
      id: "CLM-2026-081",
      providerName: "Ramesh P. K.",
      trade: "Senior Electrician",
      providerPhone: "+91 9200000001",
      schemeId: "scheme-accident",
      schemeName: "Suraksha On-Duty Accident Cover",
      claimType: "Accident & Wage Stipend",
      amount: 14500,
      dateSubmitted: "2026-09-25",
      incidentDate: "2026-09-24",
      hospital: "Ernakulam General Hospital",
      diagnosis: "Second-degree flash burn on forearm during main panel fuse replacement. 10 days work rest advised.",
      evidenceFile: "Medical_Report_Burn_081.pdf",
      status: "pending", // "pending" | "approved" | "disbursed" | "rejected"
      payoutMethod: "Direct NEFT to Ernakulam District Coop Bank (A/C **4891)",
      societySteward: "Ernakulam Central Society (Verified)",
    },
    {
      id: "CLM-2026-079",
      providerName: "Manoj Kumar V.",
      trade: "Master Plumber",
      providerPhone: "+91 9200000002",
      schemeId: "scheme-tools",
      schemeName: "Sahakari Tool Replacement Grant",
      claimType: "Tool Damage",
      amount: 8200,
      dateSubmitted: "2026-09-22",
      incidentDate: "2026-09-21",
      hospital: "N/A - Tool Depot Inspection",
      diagnosis: "Rotary hammer drill motor burnt out during emergency sewer excavation for Society #14.",
      evidenceFile: "Steward_Damage_Inspection.jpg",
      status: "approved",
      payoutMethod: "Cooperative Tool Depot Voucher #TV-882",
      societySteward: "Kozhikode North Cooperative (Verified)",
    },
    {
      id: "CLM-2026-072",
      providerName: "Abdul Rahman",
      trade: "HVAC & AC Technician",
      providerPhone: "+91 9200000004",
      schemeId: "scheme-health",
      schemeName: "Aarogya Sahakari Health Shield",
      claimType: "Hospitalization",
      amount: 32000,
      dateSubmitted: "2026-09-18",
      incidentDate: "2026-09-15",
      hospital: "Lakeshore Hospital, Kochi",
      diagnosis: "Emergency appendectomy. In-patient hospitalization for 4 days.",
      evidenceFile: "Hospital_Discharge_Summary.pdf",
      status: "disbursed",
      payoutMethod: "Cashless TPA Settlement #TPA-99120",
      societySteward: "Ernakulam Central Society",
    },
    {
      id: "CLM-2026-068",
      providerName: "Praveen Chandran",
      trade: "Carpenter & Woodworker",
      providerPhone: "+91 9200000005",
      schemeId: "scheme-accident",
      schemeName: "Suraksha On-Duty Accident Cover",
      claimType: "Minor Injury",
      amount: 6500,
      dateSubmitted: "2026-09-10",
      incidentDate: "2026-09-09",
      hospital: "Taluk Hospital, Aluva",
      diagnosis: "Circular saw hand laceration requiring 4 stitches and 5-day recuperation.",
      evidenceFile: "Medical_Bill_Stitches.pdf",
      status: "disbursed",
      payoutMethod: "Direct NEFT to SBI (A/C **1109)",
      societySteward: "Ernakulam Central Society",
    },
  ],
  members: [
    {
      id: "mem-1",
      name: "Suresh Kumar K.",
      trade: "Senior Electrician",
      phone: "+91 9200000001",
      unionId: "KL-EL-49102",
      society: "Ernakulam Central Society",
      policyNumber: "POL-KL-2026-0041",
      welfareContributed: 4250,
      coveredSchemes: ["Health", "Accident", "Tools", "Pension"],
      status: "Active & Fully Insured",
      lastCheckup: "12 Aug 2026",
    },
    {
      id: "mem-2",
      name: "Rajesh M. Nair",
      trade: "Master Plumber",
      phone: "+91 9200000002",
      unionId: "KL-PL-22019",
      society: "Ernakulam Central Society",
      policyNumber: "POL-KL-2026-0088",
      welfareContributed: 3890,
      coveredSchemes: ["Health", "Accident", "Tools", "Pension"],
      status: "Active & Fully Insured",
      lastCheckup: "04 Jul 2026",
    },
    {
      id: "mem-3",
      name: "Vijayan T.",
      trade: "Civil Mason & Tiler",
      phone: "+91 9200000003",
      unionId: "KL-MS-91823",
      society: "Kozhikode North Cooperative",
      policyNumber: "POL-KL-2026-0102",
      welfareContributed: 3120,
      coveredSchemes: ["Health", "Accident", "Pension"],
      status: "Active & Fully Insured",
      lastCheckup: "19 Sep 2026",
    },
    {
      id: "mem-4",
      name: "Anas K. P.",
      trade: "AC & Refrigeration Mechanic",
      phone: "+91 9200000004",
      unionId: "KL-HV-77192",
      society: "Kozhikode North Cooperative",
      policyNumber: "POL-KL-2026-0145",
      welfareContributed: 4980,
      coveredSchemes: ["Health", "Accident", "Tools", "Pension", "Scholarship"],
      status: "Active & Fully Insured",
      lastCheckup: "28 Aug 2026",
    },
    {
      id: "mem-5",
      name: "Gopan Balakrishnan",
      trade: "Master Carpenter",
      phone: "+91 9200000005",
      unionId: "KL-CP-33910",
      society: "Thiruvananthapuram South",
      policyNumber: "POL-KL-2026-0211",
      welfareContributed: 2850,
      coveredSchemes: ["Health", "Accident", "Tools"],
      status: "Active & Fully Insured",
      lastCheckup: "15 Jun 2026",
    },
  ],
};

export async function GET() {
  try {
    const session = await getSession();
    return NextResponse.json({
      success: true,
      ...welfareState,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Welfare API GET error:", error);
    return NextResponse.json({ error: "Failed to fetch welfare data" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    const body = await request.json();
    const { action } = body;

    if (action === "approve_claim") {
      const { claimId, payoutMethod } = body;
      const claim = welfareState.claims.find((c) => c.id === claimId);
      if (claim) {
        claim.status = "disbursed";
        if (payoutMethod) claim.payoutMethod = payoutMethod;
        welfareState.stats.totalClaimsPaid += claim.amount;
        welfareState.stats.totalPoolCorpus = Math.max(0, welfareState.stats.totalPoolCorpus - claim.amount);
      }
      return NextResponse.json({
        success: true,
        message: `Claim ${claimId} approved and disbursed successfully!`,
        claim,
        stats: welfareState.stats,
      });
    }

    if (action === "reject_claim") {
      const { claimId, reason } = body;
      const claim = welfareState.claims.find((c) => c.id === claimId);
      if (claim) {
        claim.status = "rejected";
        (claim as any).rejectionReason = reason || "Incomplete hospital discharge paperwork";
      }
      return NextResponse.json({
        success: true,
        message: `Claim ${claimId} marked as rejected.`,
        claim,
      });
    }

    if (action === "new_claim") {
      const { providerName, trade, schemeId, amount, hospital, diagnosis, payoutMethod } = body;
      const scheme = welfareState.schemes.find((s) => s.id === schemeId);
      const newClaim = {
        id: `CLM-2026-0${Math.floor(82 + Math.random() * 20)}`,
        providerName: providerName || "Verified Member",
        trade: trade || "Technician",
        providerPhone: "+91 9200000001",
        schemeId: schemeId || "scheme-health",
        schemeName: scheme?.name || "Aarogya Sahakari Health Shield",
        claimType: scheme?.type || "Medical",
        amount: Number(amount) || 12000,
        dateSubmitted: new Date().toISOString().split("T")[0],
        incidentDate: new Date().toISOString().split("T")[0],
        hospital: hospital || "District Cooperative Hospital",
        diagnosis: diagnosis || "On-duty occupational strain requiring care",
        evidenceFile: "Medical_Records_Verified.pdf",
        status: "pending",
        payoutMethod: payoutMethod || "Direct NEFT to Bank Account",
        societySteward: "Society Steward Verified",
      };

      welfareState.claims.unshift(newClaim);
      return NextResponse.json({
        success: true,
        message: "New welfare claim registered successfully and queued for disbursement review.",
        claim: newClaim,
      });
    }

    if (action === "instant_relief") {
      const { providerName, amount, reason } = body;
      const reliefAmount = Number(amount) || 5000;
      welfareState.stats.emergencyReserve = Math.max(0, welfareState.stats.emergencyReserve - reliefAmount);
      welfareState.stats.totalClaimsPaid += reliefAmount;

      const reliefClaim = {
        id: `RELIEF-2026-${Math.floor(100 + Math.random() * 900)}`,
        providerName: providerName || "Emergency Member",
        trade: "Emergency Relief",
        providerPhone: "+91 9200000001",
        schemeId: "scheme-accident",
        schemeName: "Immediate Mutual Aid Distress Grant",
        claimType: "Instant Distress Grant",
        amount: reliefAmount,
        dateSubmitted: new Date().toISOString().split("T")[0],
        incidentDate: new Date().toISOString().split("T")[0],
        hospital: "Emergency Mutual Aid",
        diagnosis: reason || "Immediate distress assistance dispatched prior to formal claims processing",
        evidenceFile: "Emergency_Steward_Authorization.pdf",
        status: "disbursed",
        payoutMethod: "Instant UPI Direct to Member Phone",
        societySteward: "Dispatched by Federation Official",
      };

      welfareState.claims.unshift(reliefClaim);
      return NextResponse.json({
        success: true,
        message: `₹${reliefAmount.toLocaleString("en-IN")} Instant Distress Relief dispatched directly to ${providerName}!`,
        stats: welfareState.stats,
      });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    console.error("Welfare API POST error:", error);
    return NextResponse.json({ error: "Failed to process welfare request" }, { status: 500 });
  }
}
