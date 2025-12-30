/**
 * Access API service for session management
 * Communicates with FastAPI backend for robot access sessions
 */

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export interface SessionStatus {
  active: boolean;
  robot_host: string | null;
  expires_at: string | null;
  remaining_seconds: number | null;
}

export interface PurchaseRequest {
  robot_host: string;
}

export interface PurchaseResult {
  status: string;
  message: string;
  session: SessionStatus;
  payment_tx: string | null;
}

export interface PaymentConfig {
  payment_enabled: boolean;
  session_duration_minutes: number;
  session_price: string;
}

export interface RobotStatus {
  robot_host: string;
  motor_online: boolean;
  motor_ip: string | null;
  motor_mdns: string | null;
  camera_online: boolean;
  camera_ip: string | null;
  camera_mdns: string | null;
  available: boolean;
  locked_by: string | null;
}

/**
 * Check if wallet has active session
 */
export async function checkSession(
  walletAddress: string
): Promise<SessionStatus> {
  const response = await fetch(`${API_URL}/api/v1/access/status`, {
    headers: { 'X-Wallet-Address': walletAddress },
  });

  if (!response.ok) {
    throw new Error(`Failed to check session: ${String(response.status)}`);
  }

  return response.json() as Promise<SessionStatus>;
}

interface ErrorResponse {
  detail?: string;
}

/**
 * Purchase access session for a robot
 */
export async function purchaseAccess(
  walletAddress: string,
  robotHost: string,
  paymentHeader?: string
): Promise<PurchaseResult> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Wallet-Address': walletAddress,
  };

  // x402 v2 uses PAYMENT-SIGNATURE header for the signed payment proof
  if (paymentHeader) {
    headers['X-PAYMENT'] = paymentHeader;
  }

  const response = await fetch(`${API_URL}/api/v1/access/purchase`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ robot_host: robotHost }),
  });

  // Handle 402 Payment Required
  // x402 protocol uses 'PAYMENT-REQUIRED' header (not X-Payment-Required)
  if (response.status === 402) {
    const paymentRequired = response.headers.get('PAYMENT-REQUIRED');
    console.log('[x402] Got 402 response, PAYMENT-REQUIRED header:', paymentRequired);
    throw new PaymentRequiredError(paymentRequired || '');
  }

  if (!response.ok) {
    const errorResponse = await response
      .json()
      .then((data: ErrorResponse) => data)
      .catch((): ErrorResponse => ({ detail: 'Unknown error' }));
    throw new Error(errorResponse.detail ?? `Purchase failed: ${String(response.status)}`);
  }

  return response.json() as Promise<PurchaseResult>;
}

/**
 * Get payment configuration
 */
export async function getPaymentConfig(): Promise<PaymentConfig> {
  const response = await fetch(`${API_URL}/api/v1/access/config`);

  if (!response.ok) {
    throw new Error(`Failed to get config: ${String(response.status)}`);
  }

  return response.json() as Promise<PaymentConfig>;
}

/**
 * Check robot status and availability
 */
export async function checkRobotStatus(robotHost: string): Promise<RobotStatus> {
  const response = await fetch(
    `${API_URL}/api/v1/robot/status?robot_host=${encodeURIComponent(robotHost)}`
  );

  if (!response.ok) {
    throw new Error(`Failed to check robot status: ${String(response.status)}`);
  }

  return response.json() as Promise<RobotStatus>;
}

/**
 * Custom error for 402 Payment Required
 */
export class PaymentRequiredError extends Error {
  public paymentHeader: string;

  constructor(paymentHeader: string) {
    super('Payment required');
    this.name = 'PaymentRequiredError';
    this.paymentHeader = paymentHeader;
  }
}
