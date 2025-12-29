"""Tests for robot status endpoint."""


def test_robot_status_online(client, mock_robot_online, robot_host):
    """Test robot status when robot is online."""
    response = client.get(f"/api/v1/robot/status?robot_host={robot_host}")

    assert response.status_code == 200
    data = response.json()
    assert data["robot_host"] == robot_host
    assert data["motor_online"] is True
    assert data["motor_ip"] == "192.168.1.100"
    assert data["motor_mdns"] == "finland-tumbller-01"
    assert data["camera_online"] is False
    assert data["available"] is True
    assert data["locked_by"] is None


def test_robot_status_offline(client, mock_robot_offline, robot_host):
    """Test robot status when robot is offline."""
    response = client.get(f"/api/v1/robot/status?robot_host={robot_host}")

    assert response.status_code == 200
    data = response.json()
    assert data["robot_host"] == robot_host
    assert data["motor_online"] is False
    assert data["motor_ip"] is None
    assert data["camera_online"] is False
    assert data["available"] is True


def test_robot_status_requires_robot_host(client):
    """Test robot status requires robot_host parameter."""
    response = client.get("/api/v1/robot/status")

    assert response.status_code == 422  # Validation error


def test_robot_status_shows_locked_when_in_use(
    client, mock_robot_online, robot_host, wallet_address
):
    """Test robot status shows locked when in use by another wallet."""
    # First, purchase access
    response = client.post(
        "/api/v1/access/purchase",
        json={"robot_host": robot_host},
        headers={"X-Wallet-Address": wallet_address},
    )
    assert response.status_code == 200

    # Check status - should show locked
    response = client.get(f"/api/v1/robot/status?robot_host={robot_host}")

    assert response.status_code == 200
    data = response.json()
    assert data["available"] is False
    assert data["locked_by"] is not None
    assert "0x1234" in data["locked_by"]  # Masked wallet
    assert "5678" in data["locked_by"]  # Last 4 chars
