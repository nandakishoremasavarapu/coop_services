"""Admin stats, settings and welfare management tests."""

from conftest import login


async def test_admin_stats_shape(admin_client):
    response = await admin_client.get("/api/admin/stats")
    assert response.status_code == 200
    stats = response.json()
    for key in (
        "userCounts",
        "bookingStatusCounts",
        "providerAvailCounts",
        "providerVerifCounts",
        "societyCount",
        "avgRating",
        "totalPayments",
        "disputeCount",
        "recentBookings",
        "bookingsByCategory",
    ):
        assert key in stats

    roles = {row["role"]: row["count"] for row in stats["userCounts"]}
    assert roles.get("customer") == 3
    assert roles.get("provider") == 5
    assert roles.get("federation_admin") == 1

    statuses = {row["status"]: row["count"] for row in stats["bookingStatusCounts"]}
    assert statuses.get("paid") == 1
    assert statuses.get("work_started") == 1
    assert statuses.get("quoted") == 1

    assert stats["societyCount"] == 2
    assert stats["avgRating"] == "5.0"
    assert stats["totalPayments"] == "495"
    # recentBookings rows must use YYYY-MM-DD dates (frontend chart format).
    for row in stats["recentBookings"]:
        assert len(row["date"]) == 10 and row["date"][4] == "-"


async def test_admin_stats_blocked_for_provider(client):
    provider = await login(client, "provider")
    response = await provider.get("/api/admin/stats")
    assert response.status_code in (401, 403)


async def test_settings_get_defaults(admin_client):
    response = await admin_client.get("/api/admin/settings")
    assert response.status_code == 200
    settings = response.json()["settings"]
    assert settings["feeConfig"]["platformFeePct"] == 10
    assert len(settings["serviceAreas"]) == 3
    assert settings["integrations"]["paymentGateway"] == "razorpay_upi"


async def test_settings_update_persists(admin_client):
    response = await admin_client.post(
        "/api/admin/settings", json={"feeConfig": {"platformFeePct": 12}}
    )
    assert response.status_code == 200
    assert response.json()["settings"]["feeConfig"]["platformFeePct"] == 12
    # Other fee fields preserved by the deep merge.
    assert response.json()["settings"]["feeConfig"]["minVisitFee"] == 150

    # Still 12 after a fresh GET (persisted in the database, not memory).
    again = (await admin_client.get("/api/admin/settings")).json()["settings"]
    assert again["feeConfig"]["platformFeePct"] == 12


async def test_welfare_get(admin_client):
    response = await admin_client.get("/api/admin/welfare")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["stats"]["totalPoolCorpus"] == 348500
    assert len(data["schemes"]) >= 3
    assert len(data["claims"]) == 3


async def test_welfare_claim_lifecycle(admin_client):
    # Register a new claim.
    response = await admin_client.post(
        "/api/admin/welfare",
        json={
            "action": "new_claim",
            "providerName": "Test Member",
            "schemeId": "scheme-health",
            "amount": 9000,
            "hospital": "District Hospital",
            "diagnosis": "Flu",
        },
    )
    assert response.status_code == 200
    claim = response.json()["claim"]
    assert claim["status"] == "pending"
    assert claim["amount"] == 9000

    # Approve (disburse) it.
    response = await admin_client.post(
        "/api/admin/welfare",
        json={"action": "approve_claim", "claimId": claim["id"]},
    )
    assert response.status_code == 200
    assert response.json()["claim"]["status"] == "disbursed"
    stats = response.json()["stats"]
    assert stats["totalClaimsPaid"] == 95000 + 9000
    assert stats["totalPoolCorpus"] == 348500 - 9000

    # It shows as disbursed on GET.
    data = (await admin_client.get("/api/admin/welfare")).json()
    match = [c for c in data["claims"] if c["id"] == claim["id"]]
    assert match[0]["status"] == "disbursed"


async def test_welfare_reject_claim(admin_client):
    claims = (await admin_client.get("/api/admin/welfare")).json()["claims"]
    pending = next(c for c in claims if c["status"] == "pending")
    response = await admin_client.post(
        "/api/admin/welfare",
        json={"action": "reject_claim", "claimId": pending["id"], "reason": "Audit"},
    )
    assert response.status_code == 200
    assert response.json()["claim"]["status"] == "rejected"


async def test_welfare_instant_relief(admin_client):
    response = await admin_client.post(
        "/api/admin/welfare",
        json={"action": "instant_relief", "providerName": "Distressed Member", "amount": 4000},
    )
    assert response.status_code == 200
    stats = response.json()["stats"]
    assert stats["emergencyReserve"] == 120000 - 4000
    assert response.json()["claim"]["status"] == "disbursed"


async def test_welfare_invalid_action(admin_client):
    response = await admin_client.post("/api/admin/welfare", json={"action": "nope"})
    assert response.status_code == 400


async def test_seed_endpoint_is_idempotent(client):
    """The database is already seeded by the test fixture, so repeated seeding
    (via the API endpoint) must be a no-op with no duplicate records."""
    first = await client.post("/api/seed")
    assert first.status_code == 200
    assert first.json()["success"] is True

    second = await client.post("/api/seed")
    assert second.status_code == 200
    assert all(value == 0 for value in second.json()["summary"].values())

    # And the data itself is not duplicated.
    categories = (await client.get("/api/services/categories")).json()["categories"]
    assert len(categories) == 25
    providers = (await client.get("/api/providers")).json()["providers"]
    assert len(providers) == 5
