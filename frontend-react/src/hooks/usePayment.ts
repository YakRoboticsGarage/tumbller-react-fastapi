import { useState, useCallback } from 'react';
import { useWallet } from './useWallet';
import { useSession } from './useSession';
import { purchaseAccessWithPayment } from '../services/paymentClient';

/**
 * Hook to handle payment flow for robot access
 */
export function usePayment() {
  const { getSigner, isConnected, address } = useWallet();
  const { setSessionDirectly } = useSession();
  const [isPaying, setIsPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const purchaseAccess = useCallback(
    async (robotHost: string): Promise<boolean> => {
      if (!isConnected || !address) {
        setError('Please connect your wallet first');
        return false;
      }

      setIsPaying(true);
      setError(null);

      try {
        const result = await purchaseAccessWithPayment(
          getSigner,
          address,
          robotHost
        );

        if (result.success && result.result?.session) {
          // Use session from purchase response - no extra API call needed
          setSessionDirectly(result.result.session, result.result.payment_tx);
          return true;
        } else if (result.success) {
          // Fallback: session not in response (shouldn't happen)
          return true;
        } else {
          setError(result.error || 'Payment failed');
          return false;
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Payment failed');
        return false;
      } finally {
        setIsPaying(false);
      }
    },
    [getSigner, isConnected, address, setSessionDirectly]
  );

  const clearError = useCallback(() => { setError(null); }, []);

  return { purchaseAccess, isPaying, error, clearError };
}
