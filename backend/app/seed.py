"""Idempotent database seeding.

Creates the initial service catalogue, cooperative structure, demo accounts
and a small amount of demo activity. Safe to run repeatedly: existing records
are matched by natural keys (phone, name, ...) and never duplicated, and no
data is ever deleted or overwritten.

Run standalone:  python -m app.seed     (from the backend/ directory)
Or via API:      POST /api/seed
"""

import asyncio
import logging
from datetime import datetime, timedelta, timezone
from typing import Any, Dict

from .database import (
    ADMIN_SETTINGS,
    BOOKINGS,
    CUSTOMER_PROFILES,
    FEDERATIONS,
    IDENTITY_VERIFICATIONS,
    INVOICES,
    NOTIFICATIONS,
    PAYMENTS,
    PROVIDER_PROFILES,
    PROVIDER_SKILLS,
    QUOTES,
    RATINGS,
    SERVICE_CATEGORIES,
    SKILLS,
    SOCIETIES,
    SPECIFIC_SERVICES,
    USERS,
    WELFARE_RECORDS,
    WELFARE_STATE,
    ensure_indexes,
    get_database,
)
from .defaults import DEFAULT_ADMIN_SETTINGS, DEFAULT_WELFARE_STATE
from .security import hash_password

logger = logging.getLogger("shramsetu.seed")

CATEGORY_DATA = [
    {"name": "Electrical Services", "icon": "Zap", "description": "Fan repair, switchboard repair, wiring, lighting", "sortOrder": 1},
    {"name": "Plumbing Services", "icon": "Droplets", "description": "Pipes, taps, leakage, drainage and related plumbing work", "sortOrder": 2},
    {"name": "Carpentry Services", "icon": "Hammer", "description": "Furniture, woodwork, doors, cabinets and repairs", "sortOrder": 3},
    {"name": "Painting Services", "icon": "Paintbrush", "description": "Interior/exterior painting and touch-up work", "sortOrder": 4},
    {"name": "Cleaning Services", "icon": "Sparkles", "description": "Home, office, deep and routine cleaning", "sortOrder": 5},
    {"name": "Gardening & Landscaping", "icon": "Leaf", "description": "Gardening, lawn, plant and basic landscaping services", "sortOrder": 6},
    {"name": "Driver Services", "icon": "Car", "description": "On-demand and scheduled driver services", "sortOrder": 7},
    {"name": "Technical & Appliance Services", "icon": "Wrench", "description": "Appliance and technical repair/maintenance", "sortOrder": 8},
    {"name": "Domestic Help Services", "icon": "Home", "description": "Routine household assistance", "sortOrder": 9},
    {"name": "Caregiving Services", "icon": "Heart", "description": "Care and support for dependents", "sortOrder": 10},
    {"name": "Masonry & Construction", "icon": "Building2", "description": "Basic civil, masonry and repair work", "sortOrder": 11},
    {"name": "AC & Cooling Services", "icon": "Wind", "description": "AC/cooling installation, service and maintenance", "sortOrder": 12},
    {"name": "Laundry & Dry Cleaning", "icon": "WashingMachine", "description": "Collection, cleaning, ironing and return services", "sortOrder": 13},
    {"name": "Moving & Shifting", "icon": "Truck", "description": "Local packing, loading, transport and shifting", "sortOrder": 14},
    {"name": "Security Services", "icon": "Shield", "description": "Guard/security support through authorized providers", "sortOrder": 15},
    {"name": "Beauty & Personal Care", "icon": "Scissors", "description": "At-home personal care services", "sortOrder": 16},
    {"name": "Pest Control Services", "icon": "Bug", "description": "Pest inspection/control through qualified providers", "sortOrder": 17},
    {"name": "Home Maintenance", "icon": "Tool", "description": "General maintenance jobs", "sortOrder": 18},
    {"name": "Vehicle Services", "icon": "CarFront", "description": "Vehicle cleaning/basic maintenance", "sortOrder": 19},
    {"name": "Education & Tutoring", "icon": "BookOpen", "description": "Tutoring and educational support", "sortOrder": 20},
    {"name": "Agricultural & Farm Services", "icon": "Tractor", "description": "Farm/garden labour and agricultural support", "sortOrder": 21},
    {"name": "Glass & Aluminium Services", "icon": "Square", "description": "Glass, aluminium frames and related installation/repair", "sortOrder": 22},
    {"name": "Welding & Fabrication", "icon": "Flame", "description": "Welding, metal fabrication and repair", "sortOrder": 23},
    {"name": "Computer & Digital Services", "icon": "Monitor", "description": "Computer, printer and basic digital support", "sortOrder": 24},
    {"name": "Sanitation & Waste Management", "icon": "Trash2", "description": "Sanitation, waste-handling and related services", "sortOrder": 25},
]

SPECIFIC_SERVICES_BY_CATEGORY = {
    "Electrical Services": [
        "Fan Installation / Repair",
        "Switchboard / Socket Repair",
        "Home Wiring",
        "Light Fitting",
        "Inverter / Battery Service",
        "Other Electrical Work",
    ],
    "Plumbing Services": [
        "Tap / Faucet Repair",
        "Pipe Leakage Fix",
        "Drain Cleaning",
        "Toilet / Commode Repair",
        "Water Tank Cleaning",
        "Other Plumbing Work",
    ],
    "Cleaning Services": [
        "Home Deep Cleaning",
        "Office Cleaning",
        "Kitchen Cleaning",
        "Bathroom Cleaning",
        "Sofa / Carpet Cleaning",
        "Other Cleaning Work",
    ],
    "Carpentry Services": [
        "Furniture Repair",
        "Door / Window Repair",
        "Cabinet Assembly",
        "Other Carpentry Work",
    ],
    "Painting Services": [
        "Interior Painting",
        "Exterior Painting",
        "Touch-up / Patch Painting",
        "Other Painting Work",
    ],
}

DEMO_USERS = [
    {"phone": "9000000001", "email": "fed.admin@coop.in", "password": "admin123", "role": "federation_admin"},
    {"phone": "9000000002", "email": "society.admin.tvm@coop.in", "password": "admin123", "role": "society_admin"},
    {"phone": "9000000003", "email": "society.admin.ekm@coop.in", "password": "admin123", "role": "society_admin"},
    {"phone": "9100000001", "email": "customer1@example.com", "password": "password123", "role": "customer"},
    {"phone": "9100000002", "email": "customer2@example.com", "password": "password123", "role": "customer"},
    {"phone": "9100000003", "email": "customer3@example.com", "password": "password123", "role": "customer"},
    {"phone": "9200000001", "email": "provider1@coop.in", "password": "password123", "role": "provider"},
    {"phone": "9200000002", "email": "provider2@coop.in", "password": "password123", "role": "provider"},
    {"phone": "9200000003", "email": "provider3@coop.in", "password": "password123", "role": "provider"},
    {"phone": "9200000004", "email": "provider4@coop.in", "password": "password123", "role": "provider"},
    {"phone": "9200000005", "email": "provider5@coop.in", "password": "password123", "role": "provider"},
]

CUSTOMER_PROFILE_DATA = {
    "9100000001": {"fullName": "Priya Menon", "gender": "female", "address": "45 Pattom Road", "city": "Thiruvananthapuram", "pincode": "695004", "latitude": "8.5241", "longitude": "76.9366"},
    "9100000002": {"fullName": "Rajan Kumar", "gender": "male", "address": "12 MG Road", "city": "Ernakulam", "pincode": "682016", "latitude": "9.9312", "longitude": "76.2673"},
    "9100000003": {"fullName": "Anjali Krishnan", "gender": "female", "address": "78 Statue Junction", "city": "Thiruvananthapuram", "pincode": "695001", "latitude": "8.4855", "longitude": "76.9492"},
}

PROVIDER_PROFILE_DATA = [
    {"phone": "9200000001", "society": "A", "displayName": "Suresh Electrician", "experience": 8, "serviceArea": "Thiruvananthapuram", "city": "Thiruvananthapuram", "pincode": "695004", "latitude": "8.5241", "longitude": "76.9366", "availability": "available", "verificationStatus": "verified", "ratingAvg": "4.7", "ratingCount": 43, "bio": "Certified electrician with 8 years experience. Cooperative member since 2018."},
    {"phone": "9200000002", "society": "A", "displayName": "Mohanan Plumber", "experience": 12, "serviceArea": "Thiruvananthapuram", "city": "Thiruvananthapuram", "pincode": "695004", "latitude": "8.5300", "longitude": "76.9400", "availability": "available", "verificationStatus": "verified", "ratingAvg": "4.5", "ratingCount": 67, "bio": "Expert plumber with 12 years of household and commercial experience."},
    {"phone": "9200000003", "society": "A", "displayName": "Sreeja Cleaner", "experience": 5, "serviceArea": "Thiruvananthapuram", "city": "Thiruvananthapuram", "pincode": "695001", "latitude": "8.4900", "longitude": "76.9500", "availability": "busy", "verificationStatus": "verified", "ratingAvg": "4.9", "ratingCount": 89, "bio": "Professional cleaning specialist for homes and offices."},
    {"phone": "9200000004", "society": "B", "displayName": "Vijayan Carpenter", "experience": 15, "serviceArea": "Ernakulam", "city": "Ernakulam", "pincode": "682016", "latitude": "9.9312", "longitude": "76.2673", "availability": "available", "verificationStatus": "verified", "ratingAvg": "4.6", "ratingCount": 112, "bio": "Master carpenter with expertise in furniture and interior woodwork."},
    {"phone": "9200000005", "society": "B", "displayName": "Lakshmi Helper", "experience": 3, "serviceArea": "Ernakulam", "city": "Ernakulam", "pincode": "682016", "latitude": "9.9200", "longitude": "76.2600", "availability": "available", "verificationStatus": "pending", "ratingAvg": "4.3", "ratingCount": 18, "bio": "Domestic help specialist trained in household management."},
]

SKILLS_BY_CATEGORY = {
    "Electrical Services": ["Fan Repair", "Wiring", "Panel Work"],
    "Plumbing Services": ["Pipe Fitting", "Drainage", "Water Tank"],
    "Cleaning Services": ["Deep Cleaning", "Carpet Cleaning"],
    "Carpentry Services": ["Furniture Repair", "Door Fitting"],
    "Domestic Help Services": ["Household Assistance", "Cooking Support"],
}

PROVIDER_SKILL_YEARS = {
    "9200000001": ("Electrical Services", ["Fan Repair", "Wiring"], 8),
    "9200000002": ("Plumbing Services", ["Pipe Fitting", "Drainage"], 12),
    "9200000003": ("Cleaning Services", ["Deep Cleaning"], 5),
    "9200000004": ("Carpentry Services", ["Furniture Repair"], 15),
    "9200000005": ("Domestic Help Services", ["Household Assistance"], 3),
}


async def seed_database(db=None, force: bool = False) -> Dict[str, Any]:
    """Seed the database. Returns a summary of what was created."""
    if db is None:
        db = get_database()

    now = datetime.now(timezone.utc)
    summary: Dict[str, Any] = {
        "categories": 0,
        "specificServices": 0,
        "societies": 0,
        "users": 0,
        "profiles": 0,
        "bookings": 0,
        "notifications": 0,
    }

    # ------------------------------------------------------------------
    # Service categories + specific services
    # ------------------------------------------------------------------
    category_ids: Dict[str, Any] = {}
    for category in CATEGORY_DATA:
        existing = await db[SERVICE_CATEGORIES].find_one({"name": category["name"]})
        if existing:
            category_ids[category["name"]] = existing["_id"]
            continue
        doc = {
            **category,
            "isActive": True,
            "createdAt": now,
            "updatedAt": now,
        }
        result = await db[SERVICE_CATEGORIES].insert_one(doc)
        category_ids[category["name"]] = result.inserted_id
        summary["categories"] += 1

    for category_name, service_names in SPECIFIC_SERVICES_BY_CATEGORY.items():
        category_id = category_ids.get(category_name)
        if not category_id:
            continue
        for name in service_names:
            exists = await db[SPECIFIC_SERVICES].find_one(
                {"categoryId": category_id, "name": name}
            )
            if exists:
                continue
            await db[SPECIFIC_SERVICES].insert_one(
                {
                    "categoryId": category_id,
                    "name": name,
                    "description": None,
                    "isActive": True,
                    "createdAt": now,
                }
            )
            summary["specificServices"] += 1

    # ------------------------------------------------------------------
    # Federation + societies
    # ------------------------------------------------------------------
    federation = await db[FEDERATIONS].find_one({"name": "Kerala Labour Federation"})
    if not federation:
        result = await db[FEDERATIONS].insert_one(
            {
                "name": "Kerala Labour Federation",
                "region": "Kerala",
                "status": "active",
                "adminUserId": None,
                "createdAt": now,
            }
        )
        federation = await db[FEDERATIONS].find_one({"_id": result.inserted_id})

    society_docs = {
        "A": {
            "federationId": federation["_id"],
            "name": "Thiruvananthapuram Workers Cooperative Society",
            "serviceArea": "Thiruvananthapuram",
            "address": "MG Road, Thiruvananthapuram, Kerala",
            "status": "active",
        },
        "B": {
            "federationId": federation["_id"],
            "name": "Ernakulam Labour Cooperative Society",
            "serviceArea": "Ernakulam",
            "address": "MG Road, Ernakulam, Kerala",
            "status": "active",
        },
    }
    society_ids: Dict[str, Any] = {}
    for key, society in society_docs.items():
        existing = await db[SOCIETIES].find_one({"name": society["name"]})
        if existing:
            society_ids[key] = existing["_id"]
            continue
        result = await db[SOCIETIES].insert_one({**society, "createdAt": now})
        society_ids[key] = result.inserted_id
        summary["societies"] += 1

    # ------------------------------------------------------------------
    # Users + profiles
    # ------------------------------------------------------------------
    user_ids: Dict[str, Any] = {}
    for demo_user in DEMO_USERS:
        existing = await db[USERS].find_one({"phone": demo_user["phone"]})
        if existing:
            user_ids[demo_user["phone"]] = existing["_id"]
            continue
        doc = {
            "phone": demo_user["phone"],
            "email": demo_user["email"],
            "passwordHash": hash_password(demo_user["password"]),
            "role": demo_user["role"],
            "isActive": True,
            "language": "en",
            "createdAt": now,
            "updatedAt": now,
        }
        result = await db[USERS].insert_one(doc)
        user_ids[demo_user["phone"]] = result.inserted_id
        summary["users"] += 1

    # Link federation admin.
    fed_admin_id = user_ids.get("9000000001")
    if fed_admin_id:
        await db[FEDERATIONS].update_one(
            {"_id": federation["_id"], "adminUserId": None},
            {"$set": {"adminUserId": fed_admin_id}},
        )

    # Customer profiles
    for phone, profile_data in CUSTOMER_PROFILE_DATA.items():
        user_id = user_ids.get(phone)
        if not user_id:
            continue
        if await db[CUSTOMER_PROFILES].find_one({"userId": user_id}):
            continue
        await db[CUSTOMER_PROFILES].insert_one(
            {
                "userId": user_id,
                "dateOfBirth": None,
                "address": profile_data["address"],
                "city": profile_data["city"],
                "pincode": profile_data["pincode"],
                "latitude": profile_data.get("latitude"),
                "longitude": profile_data.get("longitude"),
                "gender": profile_data.get("gender"),
                "createdAt": now,
                "updatedAt": now,
                **{"fullName": profile_data["fullName"]},
            }
        )
        summary["profiles"] += 1

    # Provider profiles
    provider_profile_ids: Dict[str, Any] = {}
    for profile_data in PROVIDER_PROFILE_DATA:
        user_id = user_ids.get(profile_data["phone"])
        if not user_id:
            continue
        existing = await db[PROVIDER_PROFILES].find_one({"userId": user_id})
        if existing:
            provider_profile_ids[profile_data["phone"]] = existing["_id"]
            continue
        result = await db[PROVIDER_PROFILES].insert_one(
            {
                "userId": user_id,
                "societyId": society_ids.get(profile_data["society"]),
                "displayName": profile_data["displayName"],
                "experience": profile_data["experience"],
                "serviceArea": profile_data["serviceArea"],
                "address": None,
                "city": profile_data["city"],
                "pincode": profile_data["pincode"],
                "latitude": profile_data.get("latitude"),
                "longitude": profile_data.get("longitude"),
                "availability": profile_data["availability"],
                "verificationStatus": profile_data["verificationStatus"],
                "ratingAvg": profile_data["ratingAvg"],
                "ratingCount": profile_data["ratingCount"],
                "bio": profile_data["bio"],
                "profilePhotoUrl": None,
                "createdAt": now,
                "updatedAt": now,
            }
        )
        provider_profile_ids[profile_data["phone"]] = result.inserted_id
        summary["profiles"] += 1

        if not await db[IDENTITY_VERIFICATIONS].find_one({"userId": user_id}):
            await db[IDENTITY_VERIFICATIONS].insert_one(
                {
                    "userId": user_id,
                    "method": "aadhaar",
                    "status": "verified" if profile_data["verificationStatus"] == "verified" else "pending",
                    "verifiedAt": now if profile_data["verificationStatus"] == "verified" else None,
                    "reviewedBy": None,
                    "notes": "Verified by society admin"
                    if profile_data["verificationStatus"] == "verified"
                    else "Pending review",
                    "createdAt": now,
                    "updatedAt": now,
                }
            )

    # Welfare records for the first three providers
    for profile_data in PROVIDER_PROFILE_DATA[:3]:
        provider_profile_id = provider_profile_ids.get(profile_data["phone"])
        if not provider_profile_id:
            continue
        if await db[WELFARE_RECORDS].find_one({"providerId": provider_profile_id}):
            continue
        import secrets as _secrets

        await db[WELFARE_RECORDS].insert_one(
            {
                "providerId": provider_profile_id,
                "scheme": "Kerala Labour Welfare Fund",
                "policyRef": f"KLWF-{_secrets.token_hex(4).upper()}",
                "status": "active",
                "startDate": "2023-01-01",
                "endDate": "2025-12-31",
                "claimStatus": "none",
                "createdAt": now,
            }
        )

    # Skills + provider skills
    skill_ids: Dict[str, Any] = {}
    for category_name, skill_names in SKILLS_BY_CATEGORY.items():
        category_id = category_ids.get(category_name)
        if not category_id:
            continue
        for skill_name in skill_names:
            existing = await db[SKILLS].find_one(
                {"categoryId": category_id, "name": skill_name}
            )
            if existing:
                skill_ids[skill_name] = existing["_id"]
                continue
            result = await db[SKILLS].insert_one(
                {"categoryId": category_id, "name": skill_name, "createdAt": now}
            )
            skill_ids[skill_name] = result.inserted_id

    for phone, (category_name, skill_names, years) in PROVIDER_SKILL_YEARS.items():
        provider_profile_id = provider_profile_ids.get(phone)
        if not provider_profile_id:
            continue
        for skill_name in skill_names:
            skill_id = skill_ids.get(skill_name)
            if not skill_id:
                continue
            if await db[PROVIDER_SKILLS].find_one(
                {"providerId": provider_profile_id, "skillId": skill_id}
            ):
                continue
            await db[PROVIDER_SKILLS].insert_one(
                {
                    "providerId": provider_profile_id,
                    "skillId": skill_id,
                    "yearsExp": years,
                    "createdAt": now,
                }
            )

    # ------------------------------------------------------------------
    # Sample bookings + related activity (only when bookings is empty)
    # ------------------------------------------------------------------
    if await db[BOOKINGS].count_documents({}) == 0:
        customer1 = user_ids.get("9100000001")
        customer2 = user_ids.get("9100000002")
        provider1 = user_ids.get("9200000001")
        provider2 = user_ids.get("9200000002")
        el_cat = category_ids.get("Electrical Services")
        pl_cat = category_ids.get("Plumbing Services")
        society_a = society_ids.get("A")

        if customer1 and customer2 and provider1 and provider2 and el_cat and society_a:
            sample_bookings = [
                {
                    "customerId": customer1,
                    "providerId": provider1,
                    "societyId": society_a,
                    "categoryId": el_cat,
                    "serviceId": None,
                    "serviceDescription": "My ceiling fan is making a loud noise and running slowly. Need urgent check.",
                    "mediaUrls": [],
                    "address": "45 Pattom Road, Thiruvananthapuram",
                    "city": "Thiruvananthapuram",
                    "pincode": "695004",
                    "latitude": "8.5241",
                    "longitude": "76.9366",
                    "preferredTime": now - timedelta(days=2),
                    "isEmergency": False,
                    "status": "paid",
                    "finalPrice": "450.00",
                    "platformFee": "45.00",
                    "totalAmount": "495.00",
                    "notes": None,
                    "createdAt": now - timedelta(days=2),
                    "updatedAt": now - timedelta(days=1),
                },
                {
                    "customerId": customer2,
                    "providerId": provider2,
                    "societyId": society_a,
                    "categoryId": pl_cat,
                    "serviceId": None,
                    "serviceDescription": "Bathroom tap is leaking continuously. Need immediate repair.",
                    "mediaUrls": [],
                    "address": "12 MG Road, Ernakulam",
                    "city": "Ernakulam",
                    "pincode": "682016",
                    "latitude": "9.9312",
                    "longitude": "76.2673",
                    "preferredTime": now,
                    "isEmergency": False,
                    "status": "work_started",
                    "finalPrice": "380.00",
                    "platformFee": "38.00",
                    "totalAmount": "418.00",
                    "notes": None,
                    "createdAt": now - timedelta(days=1),
                    "updatedAt": now,
                },
                {
                    "customerId": customer1,
                    "providerId": None,
                    "societyId": None,
                    "categoryId": el_cat,
                    "serviceId": None,
                    "serviceDescription": "Need to install 3 new light fixtures in the living room.",
                    "mediaUrls": [],
                    "address": "45 Pattom Road, Thiruvananthapuram",
                    "city": "Thiruvananthapuram",
                    "pincode": "695004",
                    "latitude": "8.5241",
                    "longitude": "76.9366",
                    "preferredTime": now + timedelta(days=1),
                    "isEmergency": False,
                    "status": "quoted",
                    "finalPrice": None,
                    "platformFee": None,
                    "totalAmount": None,
                    "notes": None,
                    "createdAt": now - timedelta(hours=6),
                    "updatedAt": now,
                },
            ]
            inserted_bookings = []
            for booking in sample_bookings:
                result = await db[BOOKINGS].insert_one(dict(booking))
                inserted_bookings.append(result.inserted_id)
            summary["bookings"] += len(inserted_bookings)

            # Quotes for the third (open) booking
            if len(inserted_bookings) >= 3:
                await db[QUOTES].insert_many(
                    [
                        {
                            "bookingId": inserted_bookings[2],
                            "providerId": provider1,
                            "amount": "850.00",
                            "note": "Will use quality fixtures. Can come tomorrow morning.",
                            "version": 1,
                            "status": "submitted",
                            "estimatedArrival": "9:00 AM tomorrow",
                            "createdAt": now - timedelta(hours=5),
                        },
                        {
                            "bookingId": inserted_bookings[2],
                            "providerId": provider2,
                            "amount": "750.00",
                            "note": "Experienced with light installations. Can come this evening.",
                            "version": 1,
                            "status": "submitted",
                            "estimatedArrival": "5:00 PM today",
                            "createdAt": now - timedelta(hours=4),
                        },
                    ]
                )

            # Payment / invoice / rating for the first (completed) booking
            if inserted_bookings:
                await db[PAYMENTS].insert_one(
                    {
                        "bookingId": inserted_bookings[0],
                        "method": "online",
                        "expectedAmount": "495.00",
                        "paidAmount": "495.00",
                        "status": "success",
                        "transactionRef": f"TXN{int(now.timestamp() * 1000)}",
                        "collectedBy": customer1,
                        "notes": None,
                        "createdAt": now - timedelta(days=1),
                        "updatedAt": now - timedelta(days=1),
                    }
                )
                await db[INVOICES].insert_one(
                    {
                        "bookingId": inserted_bookings[0],
                        "invoiceNumber": f"INV-{int(now.timestamp() * 1000)}",
                        "serviceAmount": "450.00",
                        "platformFee": "45.00",
                        "totalAmount": "495.00",
                        "paymentStatus": "paid",
                        "issuedAt": now - timedelta(days=1),
                        "createdAt": now - timedelta(days=1),
                    }
                )
                await db[RATINGS].insert_one(
                    {
                        "bookingId": inserted_bookings[0],
                        "customerId": customer1,
                        "providerId": provider1,
                        "rating": 5,
                        "reviewText": "Excellent work! Fixed the fan quickly and professionally. Very happy with the service.",
                        "createdAt": now - timedelta(days=1),
                    }
                )

    # ------------------------------------------------------------------
    # Demo notifications (only when none exist)
    # ------------------------------------------------------------------
    if await db[NOTIFICATIONS].count_documents({}) == 0:
        customer1 = user_ids.get("9100000001")
        provider1 = user_ids.get("9200000001")
        demo_notifications = []
        if customer1:
            demo_notifications.extend(
                [
                    {
                        "recipientId": customer1,
                        "type": "quote_received",
                        "title": "2 new quotes received",
                        "content": "Suresh Electrician and Mohanan Plumber quoted your light fixture request.",
                        "isRead": False,
                        "relatedEntityId": None,
                        "relatedEntityType": "booking",
                        "createdAt": now - timedelta(hours=4),
                    },
                    {
                        "recipientId": customer1,
                        "type": "work_started",
                        "title": "Work has started",
                        "content": "Mohanan Plumber started the bathroom tap repair.",
                        "isRead": True,
                        "relatedEntityId": None,
                        "relatedEntityType": "booking",
                        "createdAt": now - timedelta(days=1),
                    },
                ]
            )
        if provider1:
            demo_notifications.append(
                {
                    "recipientId": provider1,
                    "type": "payment_recorded",
                    "title": "Payment recorded",
                    "content": "₹495.00 was recorded for the ceiling fan repair job.",
                    "isRead": False,
                    "relatedEntityId": None,
                    "relatedEntityType": "booking",
                    "createdAt": now - timedelta(days=1),
                }
            )
        if demo_notifications:
            await db[NOTIFICATIONS].insert_many(demo_notifications)
            summary["notifications"] = len(demo_notifications)

    # ------------------------------------------------------------------
    # Admin settings + welfare state defaults
    # ------------------------------------------------------------------
    if not await db[ADMIN_SETTINGS].find_one({"_id": "main"}):
        await db[ADMIN_SETTINGS].insert_one(
            {"_id": "main", "settings": DEFAULT_ADMIN_SETTINGS, "updatedAt": now}
        )
    if not await db[WELFARE_STATE].find_one({"_id": "main"}):
        await db[WELFARE_STATE].insert_one(
            {"_id": "main", "state": DEFAULT_WELFARE_STATE, "updatedAt": now}
        )

    return summary


async def main() -> None:  # pragma: no cover - CLI entry point
    logging.basicConfig(level=logging.INFO)
    db = get_database()
    await ensure_indexes(db)
    summary = await seed_database(db)
    logger.info("Seed complete: %s", summary)


if __name__ == "__main__":  # pragma: no cover
    asyncio.run(main())
