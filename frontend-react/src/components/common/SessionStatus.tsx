import { Box, HStack, Text, Badge, Progress, Link, Image } from '@chakra-ui/react';
import { ExternalLinkIcon } from '@chakra-ui/icons';
import { useSession, formatTime } from '../../hooks/useSession';
import { DEFAULT_CHAIN } from '../../config/chains';
import ycLogo from '../../assets/yclogo.jpeg';

export function SessionStatus() {
  const { hasActiveSession, sessionRobotHost, remainingSeconds, initialSeconds, isLoading, paymentTx } =
    useSession();

  // Generate explorer link for transaction based on configured network
  const getTxExplorerUrl = (txHash: string) => {
    return `${DEFAULT_CHAIN.blockExplorer}/tx/${txHash}`;
  };

  if (isLoading) {
    return (
      <HStack spacing={3} align="center">
        <Image src={ycLogo} alt="Yak Robotics" boxSize={10} borderRadius="full" />
        <Badge colorScheme="gray" px={3} py={1}>
          Checking session...
        </Badge>
      </HStack>
    );
  }

  if (!hasActiveSession) {
    return (
      <HStack spacing={3} align="center">
        <Image src={ycLogo} alt="Yak Robotics" boxSize={10} borderRadius="full" />
        <Badge colorScheme="red" px={3} py={1}>
          No Active Session
        </Badge>
      </HStack>
    );
  }

  const totalSeconds = initialSeconds > 0 ? initialSeconds : 600; // fallback to 10 min
  const progress = (remainingSeconds / totalSeconds) * 100;
  const progressColor =
    progress < 20 ? 'red' : progress < 50 ? 'yellow' : 'green';

  return (
    <HStack spacing={3} align="start">
      <Image src={ycLogo} alt="Yak Robotics" boxSize={10} borderRadius="full" />
      <Box w="180px">
        <HStack justify="space-between" mb={1}>
          <Badge colorScheme="green">Active</Badge>
          <Text fontSize="sm" fontWeight="bold">
            {formatTime(remainingSeconds)}
          </Text>
        </HStack>
      <Progress
        value={progress}
        size="sm"
        colorScheme={progressColor}
        borderRadius="full"
      />
      {sessionRobotHost && (
        <Text fontSize="xs" color="gray.500" mt={1} textAlign="center">
          {sessionRobotHost}
        </Text>
      )}
      {paymentTx ? (
        <Link
          href={getTxExplorerUrl(paymentTx)}
          isExternal
          fontSize="xs"
          color="blue.500"
          mt={1}
          display="flex"
          alignItems="center"
          justifyContent="center"
          gap={1}
        >
          x402 Tx: {paymentTx.slice(0, 6)}...{paymentTx.slice(-4)}
          <ExternalLinkIcon boxSize={3} />
        </Link>
      ) : (
        <Text fontSize="xs" color="green.500" mt={1} textAlign="center">
          Free Session
        </Text>
      )}
      </Box>
    </HStack>
  );
}
