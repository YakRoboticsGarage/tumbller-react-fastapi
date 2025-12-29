"""Tests for session purchase and management."""


def test_purchase_access_success(client, mock_robot_online, robot_host, wallet_address):
    """Test successful access purchase."""
    response = client.post(
        "/api/v1/access/purchase",
        json={"robot_host": robot_host},
        headers={"X-Wallet-Address": wallet_address},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert robot_host in data["message"]
    assert data["session"]["active"] is True
    assert data["session"]["robot_host"] == robot_host
    assert data["session"]["expires_at"] is not None
    assert data["session"]["remaining_seconds"] > 0
    assert data["payment_tx"] is None  # No x402 middleware in test


def test_purchase_access_requires_wallet_header(client, mock_robot_online, robot_host):
    """Test purchase requires X-Wallet-Address header."""
    response = client.post(
        "/api/v1/access/purchase",
        json={"robot_host": robot_host},
    )

    assert response.status_code == 422  # Missing required header


def test_purchase_access_requires_robot_host(client, wallet_address):
    """Test purchase requires robot_host in body."""
    response = client.post(
        "/api/v1/access/purchase",
        json={},
        headers={"X-Wallet-Address": wallet_address},
    )

    assert response.status_code == 422  # Validation error


def test_purchase_fails_when_robot_offline(
    client, mock_robot_offline, robot_host, wallet_address
):
    """Test purchase fails when robot is offline."""
    response = client.post(
        "/api/v1/access/purchase",
        json={"robot_host": robot_host},
        headers={"X-Wallet-Address": wallet_address},
    )

    assert response.status_code == 503
    assert "offline" in response.json()["detail"].lower()


def test_purchase_fails_when_robot_in_use(
    client, mock_robot_online, robot_host, wallet_address, other_wallet_address
):
    """Test purchase fails when robot is already in use by another wallet."""
    # First wallet purchases access
    response = client.post(
        "/api/v1/access/purchase",
        json={"robot_host": robot_host},
        headers={"X-Wallet-Address": wallet_address},
    )
    assert response.status_code == 200

    # Second wallet tries to purchase same robot
    response = client.post(
        "/api/v1/access/purchase",
        json={"robot_host": robot_host},
        headers={"X-Wallet-Address": other_wallet_address},
    )

    assert response.status_code == 409
    assert "in use" in response.json()["detail"].lower()


def test_session_status_active(client, mock_robot_online, robot_host, wallet_address):
    """Test session status after purchase."""
    # Purchase access
    client.post(
        "/api/v1/access/purchase",
        json={"robot_host": robot_host},
        headers={"X-Wallet-Address": wallet_address},
    )

    # Check status
    response = client.get(
        "/api/v1/access/status",
        headers={"X-Wallet-Address": wallet_address},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["active"] is True
    assert data["robot_host"] == robot_host
    assert data["remaining_seconds"] > 0


def test_session_status_inactive_no_purchase(client, wallet_address):
    """Test session status when no purchase has been made."""
    response = client.get(
        "/api/v1/access/status",
        headers={"X-Wallet-Address": wallet_address},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["active"] is False


def test_session_status_no_wallet_header(client):
    """Test session status without wallet header returns inactive."""
    response = client.get("/api/v1/access/status")

    assert response.status_code == 200
    data = response.json()
    assert data["active"] is False


def test_same_wallet_can_switch_robots(
    client, mock_robot_online, robot_host, wallet_address
):
    """Test that same wallet can purchase a different robot (releases old one)."""
    # Purchase first robot
    response = client.post(
        "/api/v1/access/purchase",
        json={"robot_host": robot_host},
        headers={"X-Wallet-Address": wallet_address},
    )
    assert response.status_code == 200

    # Purchase different robot (mocked as same, but tests the logic)
    other_robot = "other-robot-01"
    response = client.post(
        "/api/v1/access/purchase",
        json={"robot_host": other_robot},
        headers={"X-Wallet-Address": wallet_address},
    )
    assert response.status_code == 200

    # Check that session is now bound to new robot
    response = client.get(
        "/api/v1/access/status",
        headers={"X-Wallet-Address": wallet_address},
    )
    assert response.json()["robot_host"] == other_robot
