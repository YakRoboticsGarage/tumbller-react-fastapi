import { HStack, Avatar, Text, VStack } from '@chakra-ui/react';
import { useAuth, useAuthEnabled } from '../../hooks/useAuth';
import { useEffect, useState } from 'react';

export function UserProfile() {
  const { isAuthenticated, fetchUserInfo } = useAuth();
  const isAuthEnabled = useAuthEnabled();
  const [userInfo, setUserInfo] = useState<Record<string, unknown> | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // Only fetch once when authenticated and not yet loaded
    if (isAuthEnabled && isAuthenticated && !hasLoaded && !error) {
      setHasLoaded(true);
      fetchUserInfo()
        .then((info) => {
          if (info && typeof info === 'object') {
            setUserInfo(info as Record<string, unknown>);
          }
        })
        .catch((err: unknown) => {
          console.error('[UserProfile] Failed to fetch user info:', err);
          setError(err instanceof Error ? err : new Error(String(err)));
          // Don't retry on error - just hide the profile
        });
    }
  }, [isAuthEnabled, isAuthenticated, hasLoaded, error, fetchUserInfo]);

  // Don't render if auth is disabled, user is not authenticated, or there's an error
  if (!isAuthEnabled || !isAuthenticated || error) {
    return null;
  }

  // Don't render until we have user info
  if (!userInfo) {
    return null;
  }

  const displayName = (userInfo.name as string) || (userInfo.username as string) || 'User';
  const displayEmail = (userInfo.email as string) || '';
  const displayAvatar = (userInfo.avatar as string) || (userInfo.picture as string);

  return (
    <HStack spacing={2}>
      <Avatar
        size={{ base: "xs", md: "sm" }}
        name={displayName}
        src={displayAvatar}
      />
      <VStack spacing={0} align="flex-start" display={{ base: "none", md: "flex" }}>
        <Text fontSize="sm" fontWeight="semibold" color="gray.700">
          {displayName}
        </Text>
        {displayEmail && (
          <Text fontSize="xs" color="gray.500">
            {displayEmail}
          </Text>
        )}
      </VStack>
    </HStack>
  );
}
