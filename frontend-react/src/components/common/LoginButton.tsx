import { Button } from '@chakra-ui/react';
import { useAuth, useAuthEnabled } from '../../hooks/useAuth';

export function LoginButton() {
  const { signIn, isLoading } = useAuth();
  const isAuthEnabled = useAuthEnabled();

  // Don't render if auth is disabled
  if (!isAuthEnabled) {
    return null;
  }

  const handleSignIn = () => {
    void signIn(window.location.origin + '/callback');
  };

  return (
    <Button
      onClick={handleSignIn}
      isLoading={isLoading}
      colorScheme="orange"
      variant="solid"
      size="md"
    >
      Log In
    </Button>
  );
}
