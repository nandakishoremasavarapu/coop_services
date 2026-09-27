"""Quote submission and listing."""

from conftest import login


async def _create_booking(client) -> dict:
    categories = (await client.get("/api/services/categories")).json()["categories"]
    response = await client.post(
        "/api/bookings",
        json={
            "categoryId": categories[0]["id"],
            "serviceDescription": "Tap leaking",
            "address": "12 MG Road",
        },
    )
    return response.json()["booking"]


async def test_provider_can_quote_open_request(client):
    customer = await login(client, "customer")
    booking = await _create_booking(customer)

    provider = await login(client, "provider4")  # not an auto-quote provider
    response = await provider.post(
        "/api/quotes",
        json={
            "bookingId": booking["id"],
            "amount": "420.00",
            "note": "Can fix today",
            "estimatedArrival": "Within 2 hours",
        },
    )
    assert response.status_code == 200
    quote = response.json()["quote"]
    assert quote["amount"] == "420.00"
    assert quote["status"] == "submitted"

    # Booking moved to quoted.
    detail = (await customer.get(f"/api/bookings/{booking['id']}")).json()
    assert detail["booking"]["status"] == "quoted"
    assert len(detail["quotes"]) == 4  # 3 auto + this one


async def test_duplicate_quote_rejected(client):
    customer = await login(client, "customer")
    booking = await _create_booking(customer)

    provider = await login(client, "provider4")
    payload = {"bookingId": booking["id"], "amount": "100.00"}
    first = await provider.post("/api/quotes", json=payload)
    assert first.status_code == 200
    second = await provider.post("/api/quotes", json={"bookingId": booking["id"], "amount": "120.00"})
    assert second.status_code == 409


async def test_customer_cannot_submit_quote(client):
    customer = await login(client, "customer")
    booking = await _create_booking(customer)
    response = await customer.post(
        "/api/quotes", json={"bookingId": booking["id"], "amount": "50.00"}
    )
    assert response.status_code == 401


async def test_quote_on_assigned_booking_rejected(client):
    """Once a provider is selected, quoting is closed."""
    customer = await login(client, "customer")
    booking = await _create_booking(customer)
    quotes = (await customer.get(f"/api/bookings/{booking['id']}")).json()["quotes"]
    provider_user_id = quotes[0]["quote"]["providerId"]

    await customer.patch(
        f"/api/bookings/{booking['id']}",
        json={"action": "select_provider", "providerId": provider_user_id, "initialAmount": "350.00"},
    )
    provider = await login(client, "provider3")
    response = await provider.post(
        "/api/quotes", json={"bookingId": booking["id"], "amount": "99.00"}
    )
    assert response.status_code == 400
