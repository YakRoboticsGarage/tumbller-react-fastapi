/**
 * Robot API service
 * Routes all robot commands through the FastAPI backend
 */

import type { MotorCommand } from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export class RobotApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number
  ) {
    super(message);
    this.name = 'RobotApiError';
  }
}

export const robotApi = {
  /**
   * Send motor command through backend API
   * Requires active session (wallet address in header)
   */
  async sendMotorCommand(
    command: MotorCommand,
    walletAddress: string
  ): Promise<void> {
    const url = `${API_URL}/api/v1/robot/motor/${command}`;

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'X-Wallet-Address': walletAddress,
        },
        signal: AbortSignal.timeout(5000),
      });

      if (response.status === 401 || response.status === 403) {
        throw new RobotApiError(
          'No active session. Please purchase access.',
          response.status
        );
      }

      if (!response.ok) {
        interface ErrorResponse {
          detail?: string;
        }
        const errorResponse = await response
          .json()
          .then((data: ErrorResponse) => data)
          .catch((): ErrorResponse => ({ detail: 'Unknown error' }));
        throw new RobotApiError(
          errorResponse.detail ?? `Motor command failed: ${response.statusText}`,
          response.status
        );
      }
    } catch (error) {
      if (error instanceof RobotApiError) {
        throw error;
      }
      if (error instanceof Error) {
        throw new RobotApiError(`Failed to send motor command: ${error.message}`);
      }
      throw new RobotApiError('Failed to send motor command: Unknown error');
    }
  },

  /**
   * Get camera frame URL from backend
   * Requires wallet address for session validation
   */
  getCameraFrameUrl(walletAddress: string): string {
    return `${API_URL}/api/v1/robot/camera/frame?wallet=${encodeURIComponent(walletAddress)}`;
  },

  /**
   * Get camera frame as blob through backend
   */
  async getCameraFrame(walletAddress: string): Promise<Blob | null> {
    const url = `${API_URL}/api/v1/robot/camera/frame`;

    try {
      const response = await fetch(url, {
        headers: {
          'X-Wallet-Address': walletAddress,
        },
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) {
        return null;
      }

      return await response.blob();
    } catch {
      return null;
    }
  },

  /**
   * Check robot status and availability via backend
   */
  async checkRobotStatus(robotHost: string): Promise<{
    motorOnline: boolean;
    cameraOnline: boolean;
    available: boolean;
    lockedBy: string | null;
  }> {
    interface RobotStatusResponse {
      motor_online: boolean;
      camera_online: boolean;
      available: boolean;
      locked_by: string | null;
    }

    const url = `${API_URL}/api/v1/robot/status?robot_host=${encodeURIComponent(robotHost)}`;

    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) {
        return {
          motorOnline: false,
          cameraOnline: false,
          available: false,
          lockedBy: null,
        };
      }

      const data = (await response.json()) as RobotStatusResponse;
      return {
        motorOnline: data.motor_online,
        cameraOnline: data.camera_online,
        available: data.available,
        lockedBy: data.locked_by,
      };
    } catch {
      return {
        motorOnline: false,
        cameraOnline: false,
        available: false,
        lockedBy: null,
      };
    }
  },

  // Legacy methods for backward compatibility during transition
  // These still use direct ESP32 connection

  /**
   * @deprecated Use checkRobotStatus instead
   */
  async checkMotorControllerOnline(motorIp: string): Promise<boolean> {
    const url = `http://${motorIp}/motor/stop`;

    try {
      await fetch(url, {
        method: 'GET',
        mode: 'no-cors',
        signal: AbortSignal.timeout(2000),
      });
      return true;
    } catch {
      return false;
    }
  },

  /**
   * @deprecated Use getCameraFrame instead
   */
  getCameraImageUrl(cameraIp: string): string {
    return `http://${cameraIp}/getImage`;
  },

  /**
   * @deprecated Direct stream not available through backend
   */
  getCameraStreamUrl(cameraIp: string): string {
    return `http://${cameraIp}/stream`;
  },

  /**
   * @deprecated Use checkRobotStatus instead
   */
  async checkCameraAvailable(cameraIp: string): Promise<boolean> {
    const url = `http://${cameraIp}/getImage`;

    try {
      await fetch(url, {
        method: 'HEAD',
        mode: 'no-cors',
        signal: AbortSignal.timeout(3000),
      });
      return true;
    } catch {
      return false;
    }
  },
};
