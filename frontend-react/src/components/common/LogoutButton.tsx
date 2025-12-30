import { Button } from '@chakra-ui/react';
import { useAuth, useAuthEnabled } from '../../hooks/useAuth';

export function LogoutButton() {
  const { logout } = useAuth();
  const isAuthEnabled = useAuthEnabled();

  // Don't render if auth is disabled
  if (!isAuthEnabled) {
    return null;
  }

  const handleLogout = () => {
    void logout();
  };

  return (
    <Button
      onClick={handleLogout}
      colorScheme="orange"
      variant="outline"
      size={{ base: 'sm', md: 'md' }}
    >
      Log Out
    </Button>
  );
}
