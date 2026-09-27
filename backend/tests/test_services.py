"""Service catalogue tests."""

async def test_categories_listed(client):
    response = await client.get("/api/services/categories")
    assert response.status_code == 200
    categories = response.json()["categories"]
    assert len(categories) == 25
    names = [c["name"] for c in categories]
    assert "Electrical Services" in names
    # Sorted by sortOrder.
    orders = [c["sortOrder"] for c in categories]
    assert orders == sorted(orders)
    # Serialization: id is a string, no raw _id leaks.
    assert isinstance(categories[0]["id"], str)
    assert "_id" not in categories[0]


async def test_specific_services_for_category(client):
    categories = (await client.get("/api/services/categories")).json()["categories"]
    electrical = next(c for c in categories if c["name"] == "Electrical Services")

    response = await client.get(f"/api/services/specific?categoryId={electrical['id']}")
    assert response.status_code == 200
    services = response.json()["services"]
    assert len(services) == 6
    assert any(s["name"] == "Fan Installation / Repair" for s in services)


async def test_specific_services_requires_category(client):
    response = await client.get("/api/services/specific")
    assert response.status_code == 400


async def test_specific_services_invalid_category(client):
    response = await client.get("/api/services/specific?categoryId=not-an-id")
    assert response.status_code == 400
