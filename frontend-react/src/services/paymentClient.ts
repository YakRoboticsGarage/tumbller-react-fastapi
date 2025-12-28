/**
 * Payment client for x402 payment handling
 * Uses official @x402 packages for proper EIP-3009 TransferWithAuthorization
 */

import type { Signer, TypedDataDomain, TypedDataField } from 'ethers';
import { wrapFetchWithPayment, x402Client, decodePaymentResponseHeader } from '@x402/fetch';
import { ExactEvmSchemeV1 } from '@x402/evm/v1';
import type { PurchaseResult, SessionStatus } from './accessApi';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

/**
 * Adapter to convert ethers.js Signer to x402 ClientEvmSigner
 */
function createX402Signer(signer: Signer, address: string) {
  return {
    address: address as `0x${string}`,
    async signTypedData(message: {
      domain: Record<string, unknown>;
      types: Record<string, unknown>;
      primaryType: string;
      message: Record<string, unknown>;
    }): Promise<`0x${string}`> {
      // ethers.js signTypedData takes (domain, types, value)
      // We need to extract the primary type's fields from types
      const types = { ...message.types } as Record<string, TypedDataField[]>;
      // Remove EIP712Domain if present - ethers handles it internally
      delete types['EIP712Domain'];

      const signature = await signer.signTypedData(
        message.domain as TypedDataDomain,
        types,
        message.message
      );
      return signature as `0x${string}`;
    },
  };
}

export interface PurchaseWithPaymentResult {
  success: boolean;
  error?: string;
  result?: PurchaseResult;
}

interface ErrorResponse {
  detail?: string;
}

/**
 * Purchase access with x402 payment flow
 * Uses official x402 client for proper payment handling
 */
export async function purchaseAccessWithPayment(
  getSigner: () => Promise<Signer | null>,
  walletAddress: string,
  robotHost: string
): Promise<PurchaseWithPaymentResult> {
  console.log('[x402] Starting purchase with x402 client...');

  const signer = await getSigner();
  if (!signer) {
    return { success: false, error: 'Wallet not connected' };
  }

  try {
    // Create x402 signer adapter from ethers signer
    const x402Signer = createX402Signer(signer, walletAddress);
    console.log('[x402] Created x402 signer for address:', walletAddress);

    // Create x402 client with EVM V1 scheme (base-sepolia uses V1 network names)
    const client = new x402Client().registerV1(
      'base-sepolia',
      new ExactEvmSchemeV1(x402Signer)
    );

    // Wrap fetch with x402 payment handling
    const fetchWithPayment = wrapFetchWithPayment(fetch, client);
    console.log('[x402] Created fetch with payment wrapper');

    // Make the purchase request - x402 handles 402 flow automatically
    const response = await fetchWithPayment(`${API_URL}/api/v1/access/purchase`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Wallet-Address': walletAddress,
      },
      body: JSON.stringify({ robot_host: robotHost }),
    });

    console.log('[x402] Response status:', response.status);

    if (!response.ok) {
      const errorResponse = await response
        .json()
        .then((data: ErrorResponse) => data)
        .catch((): ErrorResponse => ({ detail: 'Unknown error' }));
      return {
        success: false,
        error: errorResponse.detail ?? `Purchase failed: ${String(response.status)}`,
      };
    }

    const result = (await response.json()) as PurchaseResult;
    console.log('[x402] Purchase succeeded:', result);

    // Extract tx hash from X-PAYMENT-RESPONSE header (set by x402 facilitator after settlement)
    const paymentResponseHeader = response.headers.get('X-PAYMENT-RESPONSE');
    if (paymentResponseHeader) {
      try {
        const paymentResponse = decodePaymentResponseHeader(paymentResponseHeader);
        console.log('[x402] Payment response:', paymentResponse);
        // The tx hash is in the settlement response
        if (paymentResponse.transaction) {
          result.payment_tx = paymentResponse.transaction;
        }
      } catch (e) {
        console.warn('[x402] Failed to decode payment response header:', e);
      }
    }

    return { success: true, result };
  } catch (error) {
    console.error('[x402] Purchase error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Purchase failed',
    };
  }
}

interface PaymentConfigResponse {
  payment_enabled: boolean;
}

/**
 * Check if payment is enabled on the backend
 */
export async function isPaymentEnabled(): Promise<boolean> {
  try {
    const response = await fetch(`${API_URL}/api/v1/access/config`);
    if (!response.ok) return false;
    const config = (await response.json()) as PaymentConfigResponse;
    return config.payment_enabled;
  } catch {
    return false;
  }
}

/**
 * Refresh session status after purchase
 */
export async function refreshSessionStatus(
  walletAddress: string
): Promise<SessionStatus | null> {
  try {
    const response = await fetch(`${API_URL}/api/v1/access/status`, {
      headers: { 'X-Wallet-Address': walletAddress },
    });
    if (!response.ok) return null;
    return (await response.json()) as SessionStatus;
  } catch {
    return null;
  }
}
