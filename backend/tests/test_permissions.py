"""Authorization / permission-boundary tests.

These verify the hardening added to the FastAPI backend:
- roles come from the database, not from client input;
- resource ownership is verified before updates;
- admin endpoints are protected;
- customers cannot read other customers' bookings.
"""

from conftest import login


async def _create_booking(client) -> dict:
    categories = (await client.get("/api/services/categories")).json()["categories"]
    response = await client.post(
        "/api/bookings",
        json={
            "categoryId": categories[0]["id"],
            "serviceDescription": "Test job",
            "address": "1 Test Street",
        },
    )
    assert response.status_code == 200
    return response.json()["booking"]


async def test_provider_cannot_create_booking(provider_client):
    response = await provider_client.post(
        "/api/bookings",
        json={"serviceDescription": "x", "address": "y"},
    )
    assert response.status_code == 401


async def test_anonymous_cannot_list_bookings(client):
    response = await client.get("/api/bookings")
    assert response.status_code == 401


async def test_customer_cannot_accept_booking(client):
    """Only the selected provider may accept - and only providers at all."""
    customer = await login(client, "customer")
    booking = await _create_booking(customer)
    response = await customer.patch(
        f"/api/bookings/{booking['id']}", json={"action": "accept_booking"}
    )
    assert response.status_code == 403


async def test_other_provider_cannot_accept_booking(client):
    """A provider who was NOT selected must not hijack the job."""
    customer = await login(client, "customer")
    booking = await _create_booking(customer)
    quotes = (await customer.get(f"/api/bookings/{booking['id']}")).json()["quotes"]
    selected_provider = quotes[0]["quote"]["providerId"]

    await customer.patch(
        f"/api/bookings/{booking['id']}",
        json={"action": "select_provider", "providerId": selected_provider, "initialAmount": "350.00"},
    )

    # provider3 is a different provider.
    other = await login(client, "provider3")
    response = await other.patch(
        f"/api/bookings/{booking['id']}", json={"action": "accept_booking"}
    )
    assert response.status_code == 403


async def test_customer_cannot_view_other_customers_booking(client):
    customer1 = await login(client, "customer")
    booking = await _create_booking(customer1)

    # customer2 (different account) must not see customer1's booking.
    customer2 = await login(client, "customer2")
    response = await customer2.get(f"/api/bookings/{booking['id']}")
    assert response.status_code == 404


async def test_price_revision_only_by_assigned_provider(client):
    customer = await login(client, "customer")
    booking = await _create_booking(customer)
    quotes = (await customer.get(f"/api/bookings/{booking['id']}")).json()["quotes"]
    selected = quotes[0]["quote"]["providerId"]
    await customer.patch(
        f"/api/bookings/{booking['id']}",
        json={"action": "select_provider", "providerId": selected, "initialAmount": "350.00"},
    )
    provider = await login(client, "provider3")  # NOT the assigned provider
    response = await provider.post(
        "/api/price-revisions",
        json={"bookingId": booking["id"], "proposedAmount": "500.00", "reason": "Extra parts"},
    )
    assert response.status_code == 403


async def test_admin_endpoints_blocked_for_customers(client):
    customer = await login(client, "customer")
    for path in ("/api/admin/stats", "/api/admin/providers", "/api/admin/settings", "/api/admin/welfare"):
        response = await customer.get(path)
        assert response.status_code in (401, 403), path


async def test_admin_verify_provider(admin_client, client):
    providers = (await admin_client.get("/api/admin/providers")).json()["providers"]
    target = next(p for p in providers if p["provider"]["verificationStatus"] == "pending")

    response = await admin_client.post(
        f"/api/admin/providers/{target['provider']['id']}/verify",
        json={"status": "verified", "notes": "Documents checked"},
    )
    assert response.status_code == 200
    assert "verified" in response.json()["message"]

    detail = (await client.get(f"/api/providers/{target['provider']['id']}")).json()
    assert detail["provider"]["provider"]["verificationStatus"] == "verified"
    assert detail["verification"]["status"] == "verified"


async def test_customer_cannot_verify_provider(client):
    customer = await login(client, "customer")
    providers = (await client.get("/api/providers")).json()["providers"]
    target = providers[0]["provider"]
    response = await customer.post(
        f"/api/admin/providers/{target['id']}/verify", json={"status": "verified"}
    )
    assert response.status_code == 401


async def test_notification_marking_is_scoped_to_recipient(client):
    customer = await login(client, "customer")
    notifications = (await customer.get("/api/notifications")).json()["notifications"]
    assert len(notifications) >= 1

    other = await login(client, "customer2")
    # customer2 trying to mark customer1's notification -> not found (404).
    response = await other.patch(
        "/api/notifications", json={"notificationId": notifications[0]["id"]}
    )
    assert response.status_code == 404


async def test_mark_all_notifications_read(customer_client):
    response = await customer_client.patch("/api/notifications", json={})
    assert response.status_code == 200
    notifications = (await customer_client.get("/api/notifications")).json()["notifications"]
    assert all(n["isRead"] for n in notifications)


async def test_provider_profile_update_by_owner(provider_client):
    me = (await provider_client.get("/api/auth/me")).json()["user"]
    profile_id = me["profile"]["id"]

    response = await provider_client.patch(
        f"/api/providers/{profile_id}",
        json={"bio": "Updated bio", "availability": "busy", "serviceArea": "New Area"},
    )
    assert response.status_code == 200
    updated = response.json()["provider"]
    assert updated["bio"] == "Updated bio"
    assert updated["availability"] == "busy"
    assert updated["serviceArea"] == "New Area"


async def test_provider_profile_update_by_other_forbidden(client):
    owner = await login(client, "provider")
    profile_id = (await owner.get("/api/auth/me")).json()["user"]["profile"]["id"]

    other = await login(client, "provider2")
    response = await other.patch(
        f"/api/providers/{profile_id}", json={"bio": "hijack"}
    )
    assert response.status_code == 403


async def test_verification_status_admin_only(provider_client):
    """The provider themselves cannot change their own verification status:
    the field is silently ignored for non-admins."""
    me = (await provider_client.get("/api/auth/me")).json()["user"]
    profile_id = me["profile"]["id"]
    before = me["profile"]["verificationStatus"]

    response = await provider_client.patch(
        f"/api/providers/{profile_id}",
        json={"verificationStatus": "verified" if before != "verified" else "failed"},
    )
    assert response.status_code == 200  # request succeeds, field ignored
    updated = response.json()["provider"]
    assert updated["verificationStatus"] == before  # unchanged
