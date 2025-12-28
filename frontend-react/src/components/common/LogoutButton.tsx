import { Button } from '@chakra-ui/react';
import { useAuth, useAuthEnabled } from '../../hooks/useAuth';

export function LogoutButton() {
  const { signOut } = useAuth();
  const isAuthEnabled = useAuthEnabled();

  // Don't render if auth is disabled
  if (!isAuthEnabled) {
    return null;
  }

  const handleSignOut = () => {
    void signOut(window.location.origin);
  };

  return (
    <Button
      onClick={handleSignOut}
      colorScheme="orange"
      variant="outline"
      size={{ base: "sm", md: "md" }}
    >
      Log Out
    </Button>
  );
}
