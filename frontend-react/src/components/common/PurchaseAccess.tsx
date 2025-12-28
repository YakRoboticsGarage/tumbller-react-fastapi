import {
  Box,
  Button,
  VStack,
  Text,
  Alert,
  AlertIcon,
  useToast,
} from '@chakra-ui/react';
import { useWallet } from '../../hooks/useWallet';
import { useSession } from '../../hooks/useSession';
import { usePayment } from '../../hooks/usePayment';
import { usePaymentConfig } from '../../hooks/usePaymentConfig';
import { WalletButton } from './WalletButton';

interface PurchaseAccessProps {
  robotHost: string;
  robotName: string;
}

export function PurchaseAccess({ robotHost, robotName }: PurchaseAccessProps) {
  const { isConnected } = useWallet();
  const { hasActiveSession } = useSession();
  const { purchaseAccess, isPaying, error, clearError } = usePayment();
  const { sessionPrice, sessionDurationMinutes, paymentEnabled } = usePaymentConfig();
  const toast = useToast();

  const priceDisplay = paymentEnabled ? `$${sessionPrice} USDC` : 'Free';

  const handlePurchase = () => {
    clearError();
    purchaseAccess(robotHost)
      .then((success) => {
        if (success) {
          toast({
            title: 'Access Granted!',
            description: `You now have ${String(sessionDurationMinutes)} minutes of control for ${robotName}`,
            status: 'success',
            duration: 5000,
          });
        }
      })
      .catch(() => {
        // Error is already handled by usePayment hook
      });
  };

  // Already has active session
  if (hasActiveSession) {
    return null;
  }

  // Not connected - show wallet connect prompt
  if (!isConnected) {
    return (
      <Box
        p={6}
        borderWidth={1}
        borderRadius="lg"
        bg="gray.50"
        textAlign="center"
      >
        <VStack spacing={4}>
          <Text fontSize="lg" fontWeight="medium">
            Connect Wallet to Control Robot
          </Text>
          <Text color="gray.600">
            Purchase {sessionDurationMinutes} minutes of access for {priceDisplay}
          </Text>
          <WalletButton />
        </VStack>
      </Box>
    );
  }

  // Connected but no session - show purchase button
  return (
    <Box
      p={6}
      borderWidth={1}
      borderRadius="lg"
      bg="orange.50"
      textAlign="center"
    >
      <VStack spacing={4}>
        {error && (
          <Alert status="error" borderRadius="md">
            <AlertIcon />
            {error}
          </Alert>
        )}
        <Text fontSize="lg" fontWeight="medium">
          Purchase Robot Access
        </Text>
        <Text color="gray.600">
          {sessionDurationMinutes} minutes of full control for <strong>{robotName}</strong> - {priceDisplay}
        </Text>
        <Button
          colorScheme="brand"
          size="lg"
          onClick={handlePurchase}
          isLoading={isPaying}
          loadingText="Processing..."
        >
          {paymentEnabled ? `Purchase Access - $${sessionPrice}` : 'Get Access'}
        </Button>
      </VStack>
    </Box>
  );
}
