/**
 * Robot Management API service
 * Handles CRUD operations for robots with wallet management
 */

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export interface RobotCreateRequest {
  name: string;
  motor_ip: string;
  camera_ip: string;
  wallet_address?: string; // Optional - if not provided, Privy creates one
  owner_wallet?: string; // Optional - owner's wallet/ENS/Base name for payouts
}

export interface RobotUpdateRequest {
  name?: string;
  motor_ip?: string;
  camera_ip?: string;
  wallet_address?: string; // Only updatable for user-provided wallets
  owner_wallet?: string;
}

export interface RobotResponse {
  id: string;
  name: string;
  motor_ip: string;
  camera_ip: string;
  motor_mdns: string | null;
  camera_mdns: string | null;
  wallet_address: string;
  wallet_source: 'user_provided' | 'privy_created';
  user_wallet_address: string | null;
  privy_wallet_address: string | null;
  owner_wallet: string | null;
  created_at: string;
  updated_at: string;
}

export interface WalletSwitchRequest {
  wallet_type: 'user_provided' | 'privy_created';
}

export interface WalletSwitchResponse {
  wallet_address: string;
  wallet_source: 'user_provided' | 'privy_created';
  user_wallet_address: string | null;
  privy_wallet_address: string | null;
  message: string;
}

export interface RobotListResponse {
  robots: RobotResponse[];
  total: number;
}

export interface PayoutRequest {
  amount_usdc?: string; // If not specified, transfers all USDC
}

export interface PayoutResponse {
  status: 'success' | 'no_funds' | 'insufficient_funds';
  transaction_hash: string | null;
  amount_usdc: string;  // Amount in USDC smallest units (6 decimals)
  from_wallet: string;
  to_wallet: string;
}

export interface SyncWalletResponse {
  status: 'success' | 'failed';
  message: string;
}

export interface WalletBalanceResponse {
  wallet_address: string;
  eth_balance_wei: string;
  eth_balance: string;
  usdc_balance_raw: string;
  usdc_balance: string;
}

export interface GasFundingInfoResponse {
  eth_price_usd: number;
  usd_amount: number;
  eth_amount_wei: string;
  eth_amount: string;
}

export class RobotManagementApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number
  ) {
    super(message);
    this.name = 'RobotManagementApiError';
  }
}

class RobotManagementApi {
  private baseUrl = `${API_URL}/api/v1/robots`;

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      interface ErrorResponse {
        detail?: string;
      }
      const error = await response
        .json()
        .then((data: ErrorResponse) => data)
        .catch((): ErrorResponse => ({ detail: 'Unknown error' }));
      throw new RobotManagementApiError(
        error.detail || `Request failed: ${response.statusText}`,
        response.status
      );
    }
    return response.json() as Promise<T>;
  }

  /**
   * Register a new robot
   * If wallet_address is not provided, backend creates one via Privy
   */
  async createRobot(data: RobotCreateRequest): Promise<RobotResponse> {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    return this.handleResponse<RobotResponse>(response);
  }

  /**
   * List all registered robots
   */
  async listRobots(): Promise<RobotListResponse> {
    const response = await fetch(this.baseUrl);
    return this.handleResponse<RobotListResponse>(response);
  }

  /**
   * Get robot by ID
   */
  async getRobot(robotId: string): Promise<RobotResponse> {
    const response = await fetch(`${this.baseUrl}/${robotId}`);
    return this.handleResponse<RobotResponse>(response);
  }

  /**
   * Update robot details
   * Note: wallet_address can only be changed for user-provided wallets
   */
  async updateRobot(robotId: string, data: RobotUpdateRequest): Promise<RobotResponse> {
    const response = await fetch(`${this.baseUrl}/${robotId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    return this.handleResponse<RobotResponse>(response);
  }

  /**
   * Soft delete a robot
   * Robot data and wallet info are preserved for potential reactivation
   */
  async deleteRobot(robotId: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/${robotId}`, {
      method: 'DELETE',
    });

    if (!response.ok && response.status !== 204) {
      throw new RobotManagementApiError('Failed to delete robot', response.status);
    }
  }

  /**
   * Re-send wallet address to robot hardware
   */
  async syncWalletToRobot(robotId: string): Promise<SyncWalletResponse> {
    const response = await fetch(`${this.baseUrl}/${robotId}/sync-wallet`, {
      method: 'POST',
    });

    return this.handleResponse<SyncWalletResponse>(response);
  }

  /**
   * Transfer funds from robot's wallet to owner's wallet
   * Only works for Privy-created wallets
   */
  async payoutToOwner(robotId: string, amountWei?: string): Promise<PayoutResponse> {
    const response = await fetch(`${this.baseUrl}/${robotId}/payout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount_wei: amountWei }),
    });

    return this.handleResponse<PayoutResponse>(response);
  }

  /**
   * Switch the active wallet for a robot
   * Can switch between user-provided and Privy wallets
   * If switching to Privy and no Privy wallet exists, creates one
   */
  async switchWallet(robotId: string, walletType: 'user_provided' | 'privy_created'): Promise<WalletSwitchResponse> {
    const response = await fetch(`${this.baseUrl}/${robotId}/switch-wallet`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ wallet_type: walletType }),
    });

    return this.handleResponse<WalletSwitchResponse>(response);
  }

  /**
   * Get the balance of a robot's wallet
   * Returns both ETH and USDC balances
   */
  async getWalletBalance(robotId: string): Promise<WalletBalanceResponse> {
    const response = await fetch(`${this.baseUrl}/${robotId}/balance`);
    return this.handleResponse<WalletBalanceResponse>(response);
  }

  /**
   * Get gas funding information for reference
   * Returns current ETH price for USD conversion display
   */
  async getGasFundingInfo(usdAmount: number = 1.0): Promise<GasFundingInfoResponse> {
    const response = await fetch(`${this.baseUrl}/gas-funding-info?usd_amount=${usdAmount}`);
    return this.handleResponse<GasFundingInfoResponse>(response);
  }
}

export const robotManagementApi = new RobotManagementApi();
