import { Button } from '@chakra-ui/react';
import { useAuth, useAuthEnabled, useAuthMethod } from '../../hooks/useAuth';

/**
 * Login button component
 * - For Logto: Redirects to Logto login page
 * - For Privy: This component is not used (WalletLoginPage handles login)
 */
export function LoginButton() {
  const { login, isLoading } = useAuth();
  const isAuthEnabled = useAuthEnabled();
  const authMethod = useAuthMethod();

  // Don't render if auth is disabled
  if (!isAuthEnabled) {
    return null;
  }

  // For Privy, login is handled by WalletLoginPage
  // This button is only shown for Logto
  if (authMethod === 'privy') {
    return null;
  }

  const handleLogin = () => {
    login();
  };

  return (
    <Button
      onClick={handleLogin}
      isLoading={isLoading}
      colorScheme="orange"
      variant="solid"
      size="md"
    >
      Log In
    </Button>
  );
}
