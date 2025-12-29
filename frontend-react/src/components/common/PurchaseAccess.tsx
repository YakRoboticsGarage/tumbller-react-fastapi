import {
  Box,
  Button,
  VStack,
  HStack,
  Text,
  Alert,
  AlertIcon,
  useToast,
  useClipboard,
  Tooltip,
  IconButton,
} from '@chakra-ui/react';
import { CopyIcon, CheckIcon } from '@chakra-ui/icons';
import { useWallet } from '../../hooks/useWallet';
import { useSession } from '../../hooks/useSession';
import { usePayment } from '../../hooks/usePayment';
import { usePaymentConfig } from '../../hooks/usePaymentConfig';
import { WalletButton } from './WalletButton';

interface PurchaseAccessProps {
  robotHost: string;
  robotName: string;
  robotWallet?: string;
}

export function PurchaseAccess({ robotHost, robotName, robotWallet }: PurchaseAccessProps) {
  const { isConnected } = useWallet();
  const { hasActiveSession } = useSession();
  const { purchaseAccess, isPaying, error, clearError } = usePayment();
  const { sessionPrice, sessionDurationMinutes, paymentEnabled } = usePaymentConfig();
  const toast = useToast();
  const { hasCopied, onCopy } = useClipboard(robotWallet ?? '');

  // Format wallet for display
  const displayWallet = robotWallet
    ? `${robotWallet.slice(0, 6)}...${robotWallet.slice(-4)}`
    : null;

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
        {displayWallet && paymentEnabled && (
          <HStack
            spacing={2}
            fontSize="sm"
            color="gray.600"
            bg="white"
            px={3}
            py={2}
            borderRadius="md"
            borderWidth={1}
            borderColor="gray.200"
          >
            <Text>Payment to:</Text>
            <Tooltip label={hasCopied ? 'Copied!' : robotWallet} placement="top">
              <Text fontFamily="mono" cursor="pointer" onClick={onCopy} _hover={{ color: 'brand.500' }}>
                {displayWallet}
              </Text>
            </Tooltip>
            <Tooltip label={hasCopied ? 'Copied!' : 'Copy address'}>
              <IconButton
                aria-label="Copy wallet address"
                icon={hasCopied ? <CheckIcon /> : <CopyIcon />}
                size="xs"
                variant="ghost"
                onClick={onCopy}
                colorScheme={hasCopied ? 'green' : 'gray'}
              />
            </Tooltip>
          </HStack>
        )}
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
