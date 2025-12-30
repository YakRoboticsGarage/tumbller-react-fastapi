import { ReactNode, useEffect, useState } from 'react';
import { Box, Spinner, VStack, Text } from '@chakra-ui/react';
import { useAuth, useAuthEnabled, useAuthMethod } from '../../hooks/useAuth';
import { LoginButton } from './LoginButton';
import { WalletLoginPage } from '../../pages/WalletLoginPage';

interface ProtectedRouteProps {
  children: ReactNode;
}

/**
 * Protected route component
 * - If auth is disabled, renders children directly
 * - If auth is enabled and user is not authenticated, shows login page
 * - If auth is enabled and user is authenticated, renders children
 * - Shows appropriate login page based on auth method (Logto or Privy)
 */
export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, error } = useAuth();
  const isAuthEnabled = useAuthEnabled();
  const authMethod = useAuthMethod();
  const [hasInitiallyLoaded, setHasInitiallyLoaded] = useState(false);

  // Debug logging
  useEffect(() => {
    console.log('[ProtectedRoute] Auth state:', {
      isAuthEnabled,
      authMethod,
      isAuthenticated,
      isLoading,
      hasInitiallyLoaded,
      error: error?.message || error,
    });
  }, [
    isAuthEnabled,
    authMethod,
    isAuthenticated,
    isLoading,
    hasInitiallyLoaded,
    error,
  ]);

  // Track when we've completed the initial load
  useEffect(() => {
    if (!isLoading && !hasInitiallyLoaded) {
      console.log('[ProtectedRoute] Initial load complete');
      setHasInitiallyLoaded(true);
    }
  }, [isLoading, hasInitiallyLoaded]);

  // If auth is disabled, render children directly
  if (!isAuthEnabled) {
    return <>{children}</>;
  }

  // Handle error state
  if (error) {
    console.error('[ProtectedRoute] Authentication error:', error);
    return (
      <Box
        minH="100vh"
        display="flex"
        alignItems="center"
        justifyContent="center"
        bg="gray.50"
      >
        <VStack
          spacing={8}
          p={8}
          bg="white"
          borderRadius="lg"
          boxShadow="xl"
          maxW="md"
          w="90%"
        >
          <VStack spacing={4}>
            <Text fontSize="3xl" fontWeight="bold" color="red.600">
              Authentication Error
            </Text>
            <Text fontSize="md" color="gray.600" textAlign="center">
              {typeof error === 'string'
                ? error
                : error.message || 'An error occurred during authentication'}
            </Text>
          </VStack>

          {authMethod === 'privy' ? (
            // For Privy, show a simple retry message
            <Text fontSize="sm" color="gray.500" textAlign="center">
              Please refresh the page and try connecting your wallet again.
            </Text>
          ) : (
            <>
              <LoginButton />
              <Text fontSize="sm" color="gray.500" textAlign="center">
                Try logging in again
              </Text>
            </>
          )}
        </VStack>
      </Box>
    );
  }

  // Show loading spinner ONLY on the very first load before we know auth state
  if (!hasInitiallyLoaded && isLoading) {
    return (
      <Box
        minH="100vh"
        display="flex"
        alignItems="center"
        justifyContent="center"
        bg="gray.50"
      >
        <VStack spacing={4}>
          <Spinner size="xl" color="orange.500" thickness="4px" />
          <Text fontSize="lg" color="gray.600">
            Checking authentication...
          </Text>
          <Text fontSize="sm" color="gray.400">
            This should only take a moment
          </Text>
        </VStack>
      </Box>
    );
  }

  // If not authenticated (and we've finished initial loading), show login page
  if (!isAuthenticated) {
    // Show Privy wallet login page
    if (authMethod === 'privy') {
      return <WalletLoginPage />;
    }

    // Show Logto login page (existing)
    return (
      <Box
        minH="100vh"
        display="flex"
        alignItems="center"
        justifyContent="center"
        bg="gray.50"
      >
        <VStack
          spacing={8}
          p={8}
          bg="white"
          borderRadius="lg"
          boxShadow="xl"
          maxW="md"
          w="90%"
        >
          <VStack spacing={4}>
            <Text fontSize="3xl" fontWeight="bold" color="gray.800">
              Tumbller Robot Control
            </Text>
            <Text fontSize="md" color="gray.600" textAlign="center">
              Please sign in to access the robot control interface
            </Text>
          </VStack>

          <LoginButton />

          <Text fontSize="sm" color="gray.500" textAlign="center">
            Secure authentication powered by Logto
          </Text>
        </VStack>
      </Box>
    );
  }

  // User is authenticated, render protected content
  // Even if isLoading toggles afterward, we stay on this page
  return <>{children}</>;
}
