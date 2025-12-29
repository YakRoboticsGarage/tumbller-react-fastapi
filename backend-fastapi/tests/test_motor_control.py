"""Tests for motor control with session.

TODO: Rename /motor/back to /motor/backward in both firmware and server for consistency.
"""
import pytest


@pytest.mark.parametrize("command", ["forward", "stop", "back", "left", "right"])
def test_motor_commands_with_valid_session(
    client, mock_robot_online, mock_motor_command, robot_host, wallet_address, command
):
    """Test motor commands with a valid session."""
    # First purchase access
    response = client.post(
        "/api/v1/access/purchase",
        json={"robot_host": robot_host},
        headers={"X-Wallet-Address": wallet_address},
    )
    assert response.status_code == 200

    # Send motor command
    response = client.get(
        f"/api/v1/robot/motor/{command}",
        headers={"X-Wallet-Address": wallet_address},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["command"] == command


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
    client, mock_robot_online, mock_motor_command, active_session
):
    """Test motor command uses the robot bound to the session."""
    wallet_address, _ = active_session

    # Send motor command - should use the session-bound robot
    response = client.get(
        "/api/v1/robot/motor/forward",
        headers={"X-Wallet-Address": wallet_address},
    )

    assert response.status_code == 200
    # Verify the mock was called (indicates the command was sent to the robot)
    mock_motor_command.assert_called()
