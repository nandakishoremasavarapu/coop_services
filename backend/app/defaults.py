"""Default platform settings and cooperative welfare state.

These mirror the values previously hard-coded in the Next.js API routes so the
admin pages behave identically. They are persisted into MongoDB on first seed
and can then be edited through the admin UI.
"""

from typing import Any, Dict

DEFAULT_ADMIN_SETTINGS: Dict[str, Any] = {
    "feeConfig": {
        "platformFeePct": 10,
        "welfareFundPct": 3,
        "societyAdminPct": 2,
        "emergencyMultiplier": 1.25,
        "minVisitFee": 150,
    },
    "notificationRules": {
        "smsOnDispatch": True,
        "whatsappUpdates": True,
        "audioAlerts": True,
        "arrivalReminderMins": 15,
        "dailyDigestHour": "09:00",
        "emergencyBroadcast": True,
    },
    "serviceAreas": [
        {
            "id": "zone-1",
            "name": "Ernakulam Central Society",
            "district": "Ernakulam",
            "pincodes": ["682001", "682016", "682035", "682020"],
            "radiusKm": 15,
            "activeProviders": 18,
            "status": "active",
        },
        {
            "id": "zone-2",
            "name": "Kozhikode North Cooperative",
            "district": "Kozhikode",
            "pincodes": ["673001", "673004", "673011"],
            "radiusKm": 12,
            "activeProviders": 12,
            "status": "active",
        },
        {
            "id": "zone-3",
            "name": "Thiruvananthapuram South",
            "district": "Thiruvananthapuram",
            "pincodes": ["695001", "695014", "695036"],
            "radiusKm": 20,
            "activeProviders": 14,
            "status": "active",
        },
    ],
    "rolePermissions": {
        "societyAdmin": {
            "verifyProviders": True,
            "assignJobs": True,
            "adjustQuotes": True,
            "mediateDisputes": True,
            "viewDividends": True,
            "modifyCatalog": False,
        },
        "federationAdmin": {
            "verifyProviders": True,
            "assignJobs": True,
            "adjustQuotes": True,
            "mediateDisputes": True,
            "viewDividends": True,
            "modifyCatalog": True,
            "auditFederation": True,
            "changeFeePolicy": True,
        },
    },
    "integrations": {
        "paymentGateway": "razorpay_upi",
        "paymentMode": "sandbox",
        "identityVerification": "aadhaar_sandbox",
        "mapsProvider": "openstreetmap",
        "smsGateway": "nic_gov",
        "status": {
            "payments": "connected",
            "identity": "connected",
            "maps": "connected",
            "sms": "connected",
        },
    },
}

DEFAULT_WELFARE_STATE: Dict[str, Any] = {
    "stats": {
        "totalPoolCorpus": 348500,
        "totalClaimsPaid": 95000,
        "activeCoveredMembers": 48,
        "monthlyInflow": 28400,
        "emergencyReserve": 120000,
    },
    "schemes": [
        {
            "id": "scheme-health",
            "name": "Aarogya Sahakari Health Shield",
            "code": "AS-HLTH-2026",
            "type": "Health & Hospitalization",
            "coverageAmount": "₹2,00,000",
            "coverageNum": 200000,
            "monthlyDeduction": "₹150 / month (Paid by Pool)",
            "status": "Active",
            "beneficiaries": 48,
            "insurer": "United India Insurance (Coop Consortium)",
            "description": (
                "Cashless in-patient hospitalization for member-owner, spouse, and up to "
                "2 children at 120+ empanelled district hospitals across Kerala."
            ),
            "features": [
                "Zero waiting period for on-duty workplace illness",
                "Pre & post-hospitalization medical bills covered for 30 days",
                "Free annual health & vision checkup camp at Society premises",
            ],
        },
        {
            "id": "scheme-accident",
            "name": "Suraksha On-Duty Accident & Disability Cover",
            "code": "SK-ACCD-2026",
            "type": "Accident & Trauma",
            "coverageAmount": "₹5,00,000",
            "coverageNum": 500000,
            "monthlyDeduction": "₹100 / month (Govt. Subsidized)",
            "status": "Active",
            "beneficiaries": 48,
            "insurer": "Kerala State Labour Welfare Board",
            "description": (
                "24/7 on-call coverage for ladder falls, high-voltage shocks, chemical "
                "burns, and structural injuries during dispatch or commute."
            ),
            "features": [
                "Immediate emergency hospitalization advance up to ₹25,000 within 2 hours",
                "Temporary total disability stipend of ₹4,000 / week during recuperation",
                "Permanent partial & total disability capital disbursement",
            ],
        },
        {
            "id": "scheme-tools",
            "name": "Sahakari Tool & Equipment Protection Grant",
            "code": "ST-TOOL-2026",
            "type": "Equipment Insurance",
            "coverageAmount": "₹35,000",
            "coverageNum": 35000,
            "monthlyDeduction": "Covered by Platform Welfare Levy",
            "status": "Active",
            "beneficiaries": 48,
            "insurer": "Cooperative Mutual Aid Fund",
            "description": (
                "Zero-interest tool replacement grant for stolen, water-damaged, or burnt "
                "power tools, drill machines, ladders, and plumbing dies."
            ),
            "features": [
                "Fast-track 24-hour approval on society steward inspection",
                "Direct wholesale tool requisition from Cooperative Central Depot",
                "No depreciation deducted for certified member-owners",
            ],
        },
        {
            "id": "scheme-pension",
            "name": "Kalyan Nidhi Retirement & Mutual Dividend",
            "code": "KN-RET-2026",
            "type": "Pension & Dividend",
            "coverageAmount": "₹1,50,000 corpus",
            "coverageNum": 150000,
            "monthlyDeduction": "₹75 / month (Member Co-pay)",
            "status": "Active",
            "beneficiaries": 48,
            "insurer": "Sahakari Pension Trust",
            "description": (
                "Mutual dividend accumulation from cooperative surplus with a lifetime "
                "pension annuity option after 20 years of continuous membership."
            ),
            "features": [
                "Annual dividend bonus credited from society operational surplus",
                "Portable corpus with inter-society transfer facility",
                "Survivor benefit of ₹50,000 to nominated family member",
            ],
        },
    ],
    "claims": [
        {
            "id": "CLM-2026-081",
            "providerName": "Ramesh P. K.",
            "trade": "Senior Electrician",
            "providerPhone": "+91 9200000001",
            "schemeId": "scheme-accident",
            "schemeName": "Suraksha On-Duty Accident Cover",
            "claimType": "Accident & Wage Stipend",
            "amount": 14500,
            "dateSubmitted": "2026-09-25",
            "incidentDate": "2026-09-24",
            "hospital": "Ernakulam General Hospital",
            "diagnosis": (
                "Second-degree flash burn on forearm during main panel fuse replacement. "
                "10 days work rest advised."
            ),
            "evidenceFile": "Medical_Report_Burn_081.pdf",
            "status": "pending",
            "payoutMethod": "Direct NEFT to Ernakulam District Coop Bank (A/C **4891)",
            "societySteward": "Ernakulam Central Society (Verified)",
        },
        {
            "id": "CLM-2026-079",
            "providerName": "Manoj Kumar V.",
            "trade": "Master Plumber",
            "providerPhone": "+91 9200000002",
            "schemeId": "scheme-tools",
            "schemeName": "Sahakari Tool Replacement Grant",
            "claimType": "Tool Damage",
            "amount": 8200,
            "dateSubmitted": "2026-09-22",
            "incidentDate": "2026-09-21",
            "hospital": "N/A - Tool Depot Inspection",
            "diagnosis": (
                "Rotary hammer drill motor burnt out during emergency sewer excavation "
                "for Society #14."
            ),
            "evidenceFile": "Steward_Damage_Inspection.jpg",
            "status": "approved",
            "payoutMethod": "Cooperative Tool Depot Voucher #TV-882",
            "societySteward": "Kozhikode North Cooperative (Verified)",
        },
        {
            "id": "CLM-2026-072",
            "providerName": "Abdul Rahman",
            "trade": "HVAC & AC Technician",
            "providerPhone": "+91 9200000004",
            "schemeId": "scheme-health",
            "schemeName": "Aarogya Sahakari Health Shield",
            "claimType": "Hospitalization",
            "amount": 32000,
            "dateSubmitted": "2026-09-18",
            "incidentDate": "2026-09-15",
            "hospital": "Lakeshore Hospital, Kochi",
            "diagnosis": "Emergency appendectomy. In-patient hospitalization for 4 days.",
            "evidenceFile": "Discharge_Summary_072.pdf",
            "status": "disbursed",
            "payoutMethod": "Cashless pre-authorization at empanelled hospital",
            "societySteward": "Ernakulam Central Society (Verified)",
        },
    ],
    "members": [
        {
            "id": "member-1",
            "name": "Suresh Electrician",
            "trade": "Senior Electrician",
            "society": "Thiruvananthapuram Workers Cooperative Society",
            "coverage": "Health + Accident",
            "monthlyContribution": 250,
            "status": "Active",
        },
        {
            "id": "member-2",
            "name": "Mohanan Plumber",
            "trade": "Master Plumber",
            "society": "Thiruvananthapuram Workers Cooperative Society",
            "coverage": "Health + Accident + Tools",
            "monthlyContribution": 325,
            "status": "Active",
        },
        {
            "id": "member-3",
            "name": "Sreeja Cleaner",
            "trade": "Deep Cleaning Specialist",
            "society": "Thiruvananthapuram Workers Cooperative Society",
            "coverage": "Health + Accident",
            "monthlyContribution": 250,
            "status": "Active",
        },
    ],
}
