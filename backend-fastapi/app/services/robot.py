import re
from dataclasses import dataclass
from typing import Optional

import httpx


@dataclass
class RobotInfo:
    """Robot information from /info endpoint."""

    mdns_name: str
    ip: str


def _is_ip_address(host: str) -> bool:
    """Check if the host is an IP address."""
    ip_pattern = r"^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$"
    return bool(re.match(ip_pattern, host))


class RobotService:
    """Service for communicating with robot controllers (motor + camera).

    Robots can be accessed via:
    - mDNS name: e.g., "finland-tumbller-01" -> http://finland-tumbller-01.local
    - Direct IP: e.g., "192.168.1.100" -> http://192.168.1.100

    Camera naming convention:
    - mDNS: robot name + "-cam" -> http://finland-tumbller-01-cam.local
    - IP: same IP as motor (camera is on same device)
    """

    def __init__(self, timeout: float = 5.0):
        self.timeout = timeout

    def _get_robot_url(self, robot_host: str) -> str:
        """Get base URL for robot motor controller.

        Args:
            robot_host: Either mDNS name or IP address
        """
        if _is_ip_address(robot_host):
            return f"http://{robot_host}"
        else:
            # mDNS name - append .local
            return f"http://{robot_host}.local"

    def _get_camera_url(self, robot_host: str, camera_host: Optional[str] = None) -> str:
        """Get base URL for robot camera.

        Args:
            robot_host: Either mDNS name or IP address of the robot
            camera_host: Optional separate camera host (IP or mDNS)
        """
        if camera_host:
            if _is_ip_address(camera_host):
                return f"http://{camera_host}"
            else:
                return f"http://{camera_host}.local"

        # Default: derive camera URL from robot host
        if _is_ip_address(robot_host):
            # Same IP for camera (camera on same device)
            return f"http://{robot_host}"
        else:
            # mDNS: robot-name-cam.local
            return f"http://{robot_host}-cam.local"

    async def get_robot_info(self, robot_host: str) -> Optional[RobotInfo]:
        """Get robot info from /info endpoint."""
        url = f"{self._get_robot_url(robot_host)}/info"
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            try:
                response = await client.get(url)
                if response.status_code == 200:
                    data = response.json()
                    return RobotInfo(
                        mdns_name=data.get("mdns_name", robot_host),
                        ip=data.get("ip", "unknown"),
                    )
                return None
            except (httpx.RequestError, ValueError):
                return None

    async def get_camera_info(
        self, robot_host: str, camera_host: Optional[str] = None
    ) -> Optional[RobotInfo]:
        """Get camera info from /info endpoint."""
        url = f"{self._get_camera_url(robot_host, camera_host)}/info"
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            try:
                response = await client.get(url)
                if response.status_code == 200:
                    data = response.json()
                    return RobotInfo(
                        mdns_name=data.get("mdns_name", f"{robot_host}-cam"),
                        ip=data.get("ip", "unknown"),
                    )
                return None
            except (httpx.RequestError, ValueError):
                return None

    async def send_motor_command(self, robot_host: str, command: str) -> bool:
        """Send command to robot motor controller."""
        url = f"{self._get_robot_url(robot_host)}/motor/{command}"
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            try:
                response = await client.get(url)
                return response.status_code == 200
            except httpx.RequestError:
                return False

    async def check_motor_online(self, robot_host: str) -> bool:
        """Check if robot motor is online via /info endpoint."""
        info = await self.get_robot_info(robot_host)
        return info is not None

    async def get_camera_frame(
        self, robot_host: str, camera_host: Optional[str] = None
    ) -> Optional[bytes]:
        """Get single frame from robot camera."""
        url = f"{self._get_camera_url(robot_host, camera_host)}/getImage"
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            try:
                response = await client.get(url)
                if response.status_code == 200:
                    return response.content
                return None
            except httpx.RequestError:
                return None

    async def check_camera_online(
        self, robot_host: str, camera_host: Optional[str] = None
    ) -> bool:
        """Check if robot camera is online via /info endpoint."""
        info = await self.get_camera_info(robot_host, camera_host)
        return info is not None

    async def check_status(
        self, robot_host: str, camera_host: Optional[str] = None
    ) -> dict:
        """Check overall robot status (motor + camera) using /info endpoints."""
        motor_info = await self.get_robot_info(robot_host)
        camera_info = await self.get_camera_info(robot_host, camera_host)

        return {
            "robot_host": robot_host,
            "motor_online": motor_info is not None,
            "motor_ip": motor_info.ip if motor_info else None,
            "motor_mdns": motor_info.mdns_name if motor_info else None,
            "camera_online": camera_info is not None,
            "camera_ip": camera_info.ip if camera_info else None,
            "camera_mdns": camera_info.mdns_name if camera_info else None,
        }


robot_service = RobotService()
