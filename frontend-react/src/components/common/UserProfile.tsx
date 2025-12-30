import { HStack, Avatar, Text, VStack, Icon } from '@chakra-ui/react';
import { FaWallet } from 'react-icons/fa';
import { useAuth, useAuthEnabled, useAuthMethod } from '../../hooks/useAuth';
import { useLogtoAuth } from '../../hooks/useAuth';
import { useEffect, useState } from 'react';
import { shortenAddress } from '../../hooks/useWallet';

/**
 * User profile component
 * - Shows wallet address for Privy auth
 * - Shows user info for Logto auth
 */
export function UserProfile() {
  const { isAuthenticated, walletAddress } = useAuth();
  const isAuthEnabled = useAuthEnabled();
  const authMethod = useAuthMethod();

  // Don't render if auth is disabled or user is not authenticated
  if (!isAuthEnabled || !isAuthenticated) {
    return null;
  }

  // For Privy auth, show wallet address
  if (authMethod === 'privy') {
    if (!walletAddress) {
      return null;
    }

    return (
      <HStack spacing={2}>
        <Icon as={FaWallet} color="brand.500" boxSize={{ base: 4, md: 5 }} />
        <VStack spacing={0} align="flex-start">
          <Text
            fontSize={{ base: 'xs', md: 'sm' }}
            fontWeight="semibold"
            color="gray.700"
            fontFamily="mono"
          >
            {shortenAddress(walletAddress)}
          </Text>
        </VStack>
      </HStack>
    );
  }

  // For Logto auth, show user info
  return <LogtoUserProfile />;
}

/**
 * Logto-specific user profile
 * Fetches user info from Logto
 */
function LogtoUserProfile() {
  const logto = useLogtoAuth();
  const [userInfo, setUserInfo] = useState<Record<string, unknown> | null>(
    null
  );
  const [hasLoaded, setHasLoaded] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // Only fetch once when authenticated and not yet loaded
    if (logto.isAuthenticated && !hasLoaded && !error) {
      setHasLoaded(true);
      logto
        .fetchUserInfo()
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
  }, [logto, hasLoaded, error]);

  // Don't render if there's an error or no user info
  if (error || !userInfo) {
    return null;
  }

  const displayName =
    (userInfo.name as string) || (userInfo.username as string) || 'User';
  const displayEmail = (userInfo.email as string) || '';
  const displayAvatar =
    (userInfo.avatar as string) || (userInfo.picture as string);

  return (
    <HStack spacing={2}>
      <Avatar
        size={{ base: 'xs', md: 'sm' }}
        name={displayName}
        src={displayAvatar}
      />
      <VStack
        spacing={0}
        align="flex-start"
        display={{ base: 'none', md: 'flex' }}
      >
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
