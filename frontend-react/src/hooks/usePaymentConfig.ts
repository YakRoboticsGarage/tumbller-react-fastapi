import { useState, useEffect } from 'react';
import { getPaymentConfig, type PaymentConfig } from '../services/accessApi';

/**
 * Hook to fetch payment configuration from backend
 */
export function usePaymentConfig() {
  const [config, setConfig] = useState<PaymentConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getPaymentConfig()
      .then((data) => {
        setConfig(data);
      })
      .catch((err: unknown) => {
        console.error('Failed to fetch payment config:', err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  const sessionPrice = config?.session_price ?? '0.10';
  const sessionDurationMinutes = config?.session_duration_minutes ?? 10;
  const paymentEnabled = config?.payment_enabled ?? false;

  return {
    sessionPrice,
    sessionDurationMinutes,
    paymentEnabled,
    isLoading,
  };
}
