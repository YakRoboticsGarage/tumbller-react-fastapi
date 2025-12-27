import pytest
from unittest.mock import AsyncMock, patch
from fastapi.testclient import TestClient

from app.main import app
from app.services.session import _sessions, _robot_locks
from app.services.robot import RobotInfo


@pytest.fixture
def client():
    """Create a test client."""
    return TestClient(app)


@pytest.fixture(autouse=True)
def clear_sessions():
    """Clear sessions before and after each test."""
    _sessions.clear()
    _robot_locks.clear()
    yield
    _sessions.clear()
    _robot_locks.clear()


@pytest.fixture
def mock_robot_online():
    """Mock robot service to simulate online robot."""
    with patch("app.services.robot.robot_service.get_robot_info") as mock_info, \
         patch("app.services.robot.robot_service.get_camera_info") as mock_camera:
        mock_info.return_value = RobotInfo(mdns_name="finland-tumbller-01", ip="192.168.8.201")
        mock_camera.return_value = None  # Camera offline
        yield mock_info, mock_camera


@pytest.fixture
def mock_robot_offline():
    """Mock robot service to simulate offline robot."""
    with patch("app.services.robot.robot_service.get_robot_info") as mock_info, \
         patch("app.services.robot.robot_service.get_camera_info") as mock_camera:
        mock_info.return_value = None
        mock_camera.return_value = None
        yield mock_info, mock_camera


@pytest.fixture
def mock_motor_command():
    """Mock motor command execution."""
    with patch("app.services.robot.robot_service.send_motor_command") as mock:
        mock.return_value = True
        yield mock


@pytest.fixture
def mock_camera_frame():
    """Mock camera frame retrieval."""
    with patch("app.services.robot.robot_service.get_camera_frame") as mock:
        mock.return_value = b"\xff\xd8\xff\xe0\x00\x10JFIF"  # Fake JPEG header
        yield mock


@pytest.fixture
def wallet_address():
    """Test wallet address."""
    return "0x1234567890abcdef1234567890abcdef12345678"


@pytest.fixture
def other_wallet_address():
    """Another test wallet address."""
    return "0xABCDEF1234567890ABCDEF1234567890ABCDEF12"


@pytest.fixture
def robot_host():
    """Test robot host."""
    return "finland-tumbller-01"
