import {
  Box,
  Button,
  VStack,
  Text,
  Heading,
  Icon,
  Container,
  Spinner,
  useColorModeValue,
  Image,
} from '@chakra-ui/react';
import { FaWallet } from 'react-icons/fa';
import { usePrivy } from '@privy-io/react-auth';
import ycLogo from '../assets/yclogo.jpeg';

/**
 * Wallet login page for Privy authentication
 * - Shows wallet connection button
 * - Displays loading and error states
 * - Branded with Tumbller theme
 */
export function WalletLoginPage() {
  const { ready, authenticated, login } = usePrivy();
  const bgColor = useColorModeValue('gray.50', 'gray.900');
  const cardBg = useColorModeValue('white', 'gray.800');

  // Show loading while Privy initializes
  if (!ready) {
    return (
      <Box
        minH="100vh"
        display="flex"
        alignItems="center"
        justifyContent="center"
        bg={bgColor}
      >
        <VStack spacing={4}>
          <Spinner size="xl" color="brand.500" thickness="4px" />
          <Text fontSize="lg" color="gray.600">
            Initializing wallet connection...
          </Text>
        </VStack>
      </Box>
    );
  }

  // This shouldn't happen (ProtectedRoute should handle), but just in case
  if (authenticated) {
    return (
      <Box
        minH="100vh"
        display="flex"
        alignItems="center"
        justifyContent="center"
        bg={bgColor}
      >
        <VStack spacing={4}>
          <Spinner size="lg" color="brand.500" />
          <Text color="gray.600">Redirecting...</Text>
        </VStack>
      </Box>
    );
  }

  return (
    <Box
      minH="100vh"
      display="flex"
      alignItems="center"
      justifyContent="center"
      bg={bgColor}
    >
      <Container maxW="md">
        <VStack
          spacing={8}
          p={8}
          bg={cardBg}
          borderRadius="lg"
          boxShadow="xl"
          align="stretch"
        >
          {/* Logo */}
          <VStack spacing={4}>
            <Image src={ycLogo} alt="Yak Robotics Logo" boxSize={24} borderRadius="full" />

            <Heading size="xl" color="gray.800" textAlign="center">
              Tumbller Robot Control
            </Heading>

            <Text fontSize="md" color="gray.600" textAlign="center">
              Connect your wallet to access robot controls
            </Text>
          </VStack>

          {/* Login Button */}
          <Button
            onClick={login}
            colorScheme="brand"
            size="lg"
            leftIcon={<Icon as={FaWallet} />}
            _hover={{
              transform: 'translateY(-2px)',
              boxShadow: 'lg',
            }}
            transition="all 0.2s"
          >
            Connect Wallet
          </Button>

          {/* Supported Wallets Info */}
          <VStack spacing={2}>
            <Text fontSize="sm" color="gray.500" textAlign="center">
              Supported wallets:
            </Text>
            <Text fontSize="xs" color="gray.400" textAlign="center">
              MetaMask • Coinbase Wallet • WalletConnect
            </Text>
          </VStack>

          {/* Requirements Notice */}
          <Box
            p={4}
            bg="orange.50"
            borderRadius="md"
            borderLeft="4px"
            borderColor="brand.500"
          >
            <Text fontSize="sm" color="gray.700">
              <strong>Note:</strong> You must have a Web3 wallet installed to
              log in. We don't create wallets for you.
            </Text>
          </Box>

          {/* Powered By */}
          <Text fontSize="sm" color="gray.500" textAlign="center">
            Secure authentication powered by Privy
          </Text>
        </VStack>
      </Container>
    </Box>
  );
}
