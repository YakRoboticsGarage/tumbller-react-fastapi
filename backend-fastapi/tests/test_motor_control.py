"""Tests for motor control with session.

TODO: Rename /motor/back to /motor/backward in both firmware and server for consistency.
"""


def test_motor_forward_with_valid_session(
    client, mock_robot_online, mock_motor_command, robot_host, wallet_address
):
    """Test motor forward command with valid session."""
    # First purchase access
    response = client.post(
        "/api/v1/access/purchase",
        json={"robot_host": robot_host},
        headers={"X-Wallet-Address": wallet_address},
    )
    assert response.status_code == 200

    # Send motor forward command
    response = client.get(
        "/api/v1/robot/motor/forward",
        headers={"X-Wallet-Address": wallet_address},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["command"] == "forward"


def test_motor_stop_with_valid_session(
    client, mock_robot_online, mock_motor_command, robot_host, wallet_address
):
    """Test motor stop command with valid session."""
    # First purchase access
    client.post(
        "/api/v1/access/purchase",
        json={"robot_host": robot_host},
        headers={"X-Wallet-Address": wallet_address},
    )

    # Send motor stop command
    response = client.get(
        "/api/v1/robot/motor/stop",
        headers={"X-Wallet-Address": wallet_address},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["command"] == "stop"


def test_motor_back_with_valid_session(
    client, mock_robot_online, mock_motor_command, robot_host, wallet_address
):
    """Test motor back command with valid session."""
    # First purchase access
    client.post(
        "/api/v1/access/purchase",
        json={"robot_host": robot_host},
        headers={"X-Wallet-Address": wallet_address},
    )

    # Send motor back command
    response = client.get(
        "/api/v1/robot/motor/back",
        headers={"X-Wallet-Address": wallet_address},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["command"] == "back"


def test_motor_left_with_valid_session(
    client, mock_robot_online, mock_motor_command, robot_host, wallet_address
):
    """Test motor left command with valid session."""
    # First purchase access
    client.post(
        "/api/v1/access/purchase",
        json={"robot_host": robot_host},
        headers={"X-Wallet-Address": wallet_address},
    )

    # Send motor left command
    response = client.get(
        "/api/v1/robot/motor/left",
        headers={"X-Wallet-Address": wallet_address},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["command"] == "left"


def test_motor_right_with_valid_session(
    client, mock_robot_online, mock_motor_command, robot_host, wallet_address
):
    """Test motor right command with valid session."""
    # First purchase access
    client.post(
        "/api/v1/access/purchase",
        json={"robot_host": robot_host},
        headers={"X-Wallet-Address": wallet_address},
    )

    # Send motor right command
    response = client.get(
        "/api/v1/robot/motor/right",
        headers={"X-Wallet-Address": wallet_address},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["command"] == "right"


def test_motor_command_without_session(client, wallet_address):
    """Test motor command fails without a session (no robot bound)."""
    response = client.get(
        "/api/v1/robot/motor/forward",
        headers={"X-Wallet-Address": wallet_address},
    )

    assert response.status_code == 403
    assert "no active session" in response.json()["detail"].lower()


def test_motor_command_without_wallet_header(client):
    """Test motor command fails without wallet header."""
    response = client.get("/api/v1/robot/motor/forward")

    assert response.status_code == 401  # Unauthorized - missing wallet header


def test_motor_command_with_wrong_wallet(
    client, mock_robot_online, mock_motor_command, robot_host, wallet_address, other_wallet_address
):
    """Test motor command fails when wallet doesn't own the robot."""
    # First wallet purchases access
    client.post(
        "/api/v1/access/purchase",
        json={"robot_host": robot_host},
        headers={"X-Wallet-Address": wallet_address},
    )

    # Second wallet tries to send motor command (has no session/robot bound)
    response = client.get(
        "/api/v1/robot/motor/forward",
        headers={"X-Wallet-Address": other_wallet_address},
    )

    assert response.status_code == 403
    assert "no active session" in response.json()["detail"].lower()


def test_motor_command_uses_session_bound_robot(
    client, mock_robot_online, mock_motor_command, robot_host, wallet_address
):
    """Test motor command uses the robot bound to the session."""
    # Purchase access to a specific robot
    client.post(
        "/api/v1/access/purchase",
        json={"robot_host": robot_host},
        headers={"X-Wallet-Address": wallet_address},
    )

    # Send motor command - should use the session-bound robot
    response = client.get(
        "/api/v1/robot/motor/forward",
        headers={"X-Wallet-Address": wallet_address},
    )

    assert response.status_code == 200
    # Verify the mock was called (indicates the command was sent to the robot)
    mock_motor_command.assert_called()
