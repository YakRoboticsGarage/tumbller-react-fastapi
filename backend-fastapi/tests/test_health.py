"""Tests for health and config endpoints."""


def test_health_endpoint(client):
    """Test health check returns healthy status."""
    response = client.get("/health")

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "payment_enabled" in data


def test_health_shows_payment_disabled(client):
    """Test health check shows payment is disabled by default."""
    response = client.get("/health")

    assert response.status_code == 200
    data = response.json()
    assert data["payment_enabled"] is False


def test_access_config_endpoint(client):
    """Test access config returns payment configuration."""
    response = client.get("/api/v1/access/config")

    assert response.status_code == 200
    data = response.json()
    assert "payment_enabled" in data
    assert "session_duration_minutes" in data
    assert "session_price" in data


def test_access_config_payment_disabled(client):
    """Test access config when payment is disabled."""
    response = client.get("/api/v1/access/config")

    assert response.status_code == 200
    data = response.json()
    assert data["payment_enabled"] is False
    assert data["session_duration_minutes"] == 10
    assert data["session_price"] is None  # No price when disabled
