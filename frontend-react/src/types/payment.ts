/**
 * Payment and wallet types for x402 integration
 */

export interface WalletState {
  address: string | null;
  isConnected: boolean;
  chainId: number | null;
}

export interface SessionState {
  active: boolean;
  robotHost: string | null;
  expiresAt: Date | null;
  remainingSeconds: number;
}

export interface PaymentRequirements {
  price: string;
  network: string;
  pay_to_address: string;
}

export interface PaymentConfig {
  paymentEnabled: boolean;
  sessionDurationMinutes: number;
  sessionPrice: string | null;
}
