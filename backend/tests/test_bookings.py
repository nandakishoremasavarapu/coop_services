"""Booking lifecycle tests: creation, auto-quotes, the full state machine,
payments, ratings and cancellation."""

from conftest import login


async def _create_booking(client) -> dict:
    categories = (await client.get("/api/services/categories")).json()["categories"]
    electrical = next(c for c in categories if c["name"] == "Electrical Services")
    response = await client.post(
        "/api/bookings",
        json={
            "categoryId": electrical["id"],
            "serviceDescription": "Fan making noise, needs repair",
            "address": "45 Pattom Road",
            "city": "Thiruvananthapuram",
            "pincode": "695004",
        },
    )
    assert response.status_code == 200, response.text
    data = response.json()
    assert data["success"] is True
    return data["booking"]


async def _patch(client, booking_id: str, payload: dict):
    response = await client.patch(f"/api/bookings/{booking_id}", json={"action": None, **payload})
    return response


async def test_create_booking_generates_auto_quotes(customer_client):
    booking = await _create_booking(customer_client)
    assert booking["status"] == "submitted"
    assert booking["city"] == "Thiruvananthapuram"

    detail = (await customer_client.get(f"/api/bookings/{booking['id']}")).json()
    quotes = detail["quotes"]
    # Three seeded providers -> three auto-generated quotes.
    assert len(quotes) == 3
    for item in quotes:
        assert item["quote"]["amount"]
        assert item["provider"]["displayName"]
    assert detail["customerProfile"]["fullName"] == "Priya Menon"
    assert detail["category"]["name"] == "Electrical Services"
    assert isinstance(detail["milestones"], list)


async def test_booking_detail_includes_related_entities(customer_client):
    booking = await _create_booking(customer_client)
    detail = (await customer_client.get(f"/api/bookings/{booking['id']}")).json()
    keys = {
        "booking", "category", "service", "customerProfile", "providerProfile",
        "quotes", "priceRevisions", "milestones", "payment", "invoice", "rating",
    }
    assert keys.issubset(detail.keys())
    assert detail["providerProfile"] is None  # not yet assigned


async def test_full_lifecycle_to_rated(customer_client, provider_client, client):
    """Walk the entire happy path: quote -> select -> accept -> arrive ->
    price confirm -> work -> complete -> pay -> rate."""
    booking = await _create_booking(customer_client)
    booking_id = booking["id"]
    quotes = (await customer_client.get(f"/api/bookings/{booking_id}")).json()["quotes"]
    provider_user_id = quotes[0]["quote"]["providerId"]
    quote_amount = quotes[0]["quote"]["amount"]

    # Customer selects the provider (with the quoted amount).
    response = await _patch(customer_client, booking_id, {
        "action": "select_provider",
        "providerId": provider_user_id,
        "initialAmount": quote_amount,
    })
    assert response.status_code == 200
    assert response.json()["booking"]["status"] == "provider_selected"
    # Price fix: the selected quote amount is now stored with the platform fee.
    assert response.json()["booking"]["finalPrice"] == "350.00"
    assert response.json()["booking"]["totalAmount"] == "385.00"

    # Provider accepts.
    response = await _patch(provider_client, booking_id, {"action": "accept_booking"})
    assert response.status_code == 200
    assert response.json()["booking"]["status"] == "accepted"

    # Provider marks arrival, customer confirms.
    response = await _patch(provider_client, booking_id, {"action": "mark_arrived"})
    assert response.json()["booking"]["status"] == "arrived_pending_confirmation"
    response = await _patch(customer_client, booking_id, {"action": "confirm_arrival"})
    assert response.json()["booking"]["status"] == "arrived"

    # Provider starts and completes the work; customer confirms completion.
    response = await _patch(provider_client, booking_id, {"action": "start_work"})
    assert response.json()["booking"]["status"] == "work_started"
    response = await _patch(provider_client, booking_id, {"action": "complete_work"})
    assert response.json()["booking"]["status"] == "completed_pending_confirmation"
    response = await _patch(customer_client, booking_id, {"action": "confirm_completion"})
    assert response.json()["booking"]["status"] == "completed"

    # Payment recorded by the customer.
    response = await _patch(customer_client, booking_id, {
        "action": "record_payment", "method": "online", "amount": "385.00",
    })
    assert response.json()["booking"]["status"] == "paid"

    detail = (await customer_client.get(f"/api/bookings/{booking_id}")).json()
    assert detail["payment"]["status"] == "success"
    assert detail["payment"]["method"] == "online"
    assert detail["invoice"]["paymentStatus"] == "paid"
    assert detail["invoice"]["totalAmount"] == "385.00"

    # Rating submitted -> provider average is recomputed.
    response = await _patch(customer_client, booking_id, {
        "action": "submit_rating", "rating": 5, "reviewText": "Great work",
    })
    assert response.json()["booking"]["status"] == "rated"

    detail = (await customer_client.get(f"/api/bookings/{booking_id}")).json()
    assert detail["rating"]["rating"] == 5
    assert detail["rating"]["reviewText"] == "Great work"

    providers = (await client.get("/api/providers")).json()["providers"]
    provider_profile = next(
        p["provider"] for p in providers if p["provider"]["userId"] == provider_user_id
    )
    # ratingCount is recomputed from actual rating documents (seeded demo
    # profile showed 43, but real rating rows are what count - 2 now).
    assert provider_profile["ratingCount"] == 2
    assert provider_profile["ratingAvg"] == "5.00"


async def test_price_revision_flow(customer_client, provider_client):
    booking = await _create_booking(customer_client)
    quotes = (await customer_client.get(f"/api/bookings/{booking['id']}")).json()["quotes"]
    provider_user_id = quotes[0]["quote"]["providerId"]

    await _patch(customer_client, booking["id"], {
        "action": "select_provider", "providerId": provider_user_id, "initialAmount": "350.00",
    })
    await _patch(provider_client, booking["id"], {"action": "accept_booking"})
    await _patch(provider_client, booking["id"], {"action": "mark_arrived"})
    await _patch(customer_client, booking["id"], {"action": "confirm_arrival"})

    # Provider requests a price change.
    response = await provider_client.post(
        "/api/price-revisions",
        json={
            "bookingId": booking["id"],
            "proposedAmount": "480.00",
            "reason": "Additional wiring needed",
        },
    )
    assert response.status_code == 200
    revision = response.json()["revision"]
    assert revision["status"] == "pending"

    # Booking moved to price_change_pending.
    detail = (await provider_client.get(f"/api/bookings/{booking['id']}")).json()
    assert detail["booking"]["status"] == "price_change_pending"
    assert len(detail["priceRevisions"]) == 1

    # Customer approves the new amount.
    response = await _patch(customer_client, booking["id"], {
        "action": "approve_price_change", "proposedAmount": "480.00",
    })
    assert response.json()["booking"]["status"] == "price_confirmed"
    assert response.json()["booking"]["finalPrice"] == "480.00"
    assert response.json()["booking"]["totalAmount"] == "528.00"


async def test_cancel_booking_by_customer(customer_client):
    booking = await _create_booking(customer_client)
    response = await _patch(customer_client, booking["id"], {"action": "cancel_booking"})
    assert response.status_code == 200
    assert response.json()["booking"]["status"] == "cancelled"


async def test_invalid_transition_rejected(customer_client, provider_client):
    booking = await _create_booking(customer_client)
    # A provider cannot start work straight from "submitted".
    response = await _patch(provider_client, booking["id"], {"action": "start_work"})
    assert response.status_code == 400
    assert "Cannot perform" in response.json()["error"]


async def test_invalid_action_rejected(customer_client):
    booking = await _create_booking(customer_client)
    response = await _patch(customer_client, booking["id"], {"action": "explode"})
    assert response.status_code == 400


async def test_customer_booking_list_only_own(customer_client, client):
    # customer2's seeded booking should not be visible to customer 1.
    bookings = (await customer_client.get("/api/bookings?role=customer")).json()["bookings"]
    assert len(bookings) >= 1
    for item in bookings:
        assert item["booking"]["customerId"] == bookings[0]["booking"]["customerId"]

    # Even when asking with a different role parameter, a customer only sees own.
    bookings = (await customer_client.get("/api/bookings?role=society_admin")).json()["bookings"]
    assert all(
        item["booking"]["customerId"] == bookings[0]["booking"]["customerId"]
        for item in bookings
    )


async def test_provider_sees_open_requests(client, provider_client):
    # A fresh request appears in the provider's open-request feed.
    customer = await login(client, "customer")
    await _create_booking(customer)

    bookings = (await provider_client.get("/api/bookings?role=provider")).json()["bookings"]
    statuses = {item["booking"]["status"] for item in bookings}
    # The new open request plus the provider's own seeded (paid) job.
    assert "submitted" in statuses or "quoted" in statuses
    assert "paid" in statuses
