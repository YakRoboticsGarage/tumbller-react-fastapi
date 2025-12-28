import { useSessionContext } from '../providers/SessionProvider';

/**
 * Hook to access shared session state
 */
export function useSession() {
  return useSessionContext();
}

/**
 * Format seconds into MM:SS display
 */
export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins)}:${secs.toString().padStart(2, '0')}`;
}
