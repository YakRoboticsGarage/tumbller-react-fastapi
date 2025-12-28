import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import { useWallet } from '../hooks/useWallet';
import { checkSession, type SessionStatus } from '../services/accessApi';

interface SessionContextType {
  hasActiveSession: boolean;
  sessionRobotHost: string | null;
  remainingSeconds: number;
  initialSeconds: number;
  isLoading: boolean;
  error: string | null;
  paymentTx: string | null;
  refreshSession: (showLoading?: boolean) => Promise<void>;
  setSessionDirectly: (session: SessionStatus, txHash?: string | null) => void;
}

const SessionContext = createContext<SessionContextType | null>(null);

export function useSessionContext() {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSessionContext must be used within SessionProvider');
  }
  return context;
}

interface SessionProviderProps {
  children: ReactNode;
}

export function SessionProvider({ children }: SessionProviderProps) {
  const { address, isConnected } = useWallet();
  const [session, setSession] = useState<SessionStatus | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [initialSeconds, setInitialSeconds] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentTx, setPaymentTx] = useState<string | null>(null);

  // Fetch session status from backend
  const refreshSession = useCallback(async (showLoading?: boolean) => {
    if (!address) {
      setSession(null);
      setRemainingSeconds(0);
      setInitialSeconds(0);
      return;
    }

    if (showLoading) {
      setIsLoading(true);
    }
    setError(null);

    try {
      const status = await checkSession(address);
      setSession(status);
      const remaining = status.remaining_seconds || 0;
      setRemainingSeconds(remaining);
      setInitialSeconds((prev) => {
        if (remaining > 0 && (prev === 0 || remaining > prev)) {
          return remaining;
        }
        return prev;
      });
    } catch (err) {
      console.error('Failed to check session:', err);
      setError(err instanceof Error ? err.message : 'Failed to check session');
      setSession(null);
      setRemainingSeconds(0);
    } finally {
      if (showLoading) {
        setIsLoading(false);
      }
    }
  }, [address]);

  // Initial fetch and periodic refresh
  useEffect(() => {
    if (!isConnected) {
      setSession(null);
      setRemainingSeconds(0);
      setPaymentTx(null);
      return;
    }

    void refreshSession(true);

    const interval = setInterval(() => { void refreshSession(false); }, 60000);

    return () => { clearInterval(interval); };
  }, [isConnected, refreshSession]);

  // Track whether timer should be active
  const isTimerActive = remainingSeconds > 0;

  // Countdown timer
  useEffect(() => {
    if (!isTimerActive) return;

    const timer = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => { clearInterval(timer); };
  }, [isTimerActive]);

  // Set session directly (used after purchase)
  const setSessionDirectly = useCallback((newSession: SessionStatus, txHash?: string | null) => {
    setSession(newSession);
    const remaining = newSession.remaining_seconds || 0;
    setRemainingSeconds(remaining);
    if (remaining > 0) {
      setInitialSeconds(remaining);
    }
    if (txHash) {
      setPaymentTx(txHash);
    }
    setIsLoading(false);
    setError(null);
  }, []);

  const hasActiveSession = session?.active === true && remainingSeconds > 0;
  const sessionRobotHost = session?.robot_host || null;

  return (
    <SessionContext.Provider
      value={{
        hasActiveSession,
        sessionRobotHost,
        remainingSeconds,
        initialSeconds,
        isLoading,
        error,
        paymentTx,
        refreshSession,
        setSessionDirectly,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
}
