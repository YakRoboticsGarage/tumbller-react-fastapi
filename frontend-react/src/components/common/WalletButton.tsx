import {
  Button,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  HStack,
  Text,
  Badge,
  useToast,
  Spinner,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  VStack,
  useDisclosure,
  useClipboard,
  IconButton,
} from '@chakra-ui/react';
import { ChevronDownIcon, CopyIcon, CheckIcon } from '@chakra-ui/icons';
import { useWallet } from '../../hooks/useWallet';
import { useEnsName } from '../../hooks/useEns';
import { DEFAULT_CHAIN } from '../../config/chains';

// Get auth method at module level
const authMethod =
  (import.meta.env.VITE_AUTH_METHOD as string | undefined) || 'logto';

export function WalletButton() {
  const { address, isConnected, chainId, connect, disconnect, switchChain } =
    useWallet();
  const { ensName, isLoading: ensLoading } = useEnsName(address);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { hasCopied, onCopy } = useClipboard(address ?? '');
  const toast = useToast();

  const handleConnect = () => {
    connect()
      .then(() => {
        toast({
          title: 'Wallet connected',
          status: 'success',
          duration: 3000,
        });
      })
      .catch((error: unknown) => {
        toast({
          title: 'Failed to connect',
          description: error instanceof Error ? error.message : 'Unknown error',
          status: 'error',
          duration: 5000,
        });
      });
  };

  const isWrongChain = chainId !== null && chainId !== DEFAULT_CHAIN.chainId;

  // For Privy auth, wallet is connected via login - don't show separate connect button
  // The wallet button only shows when connected to display wallet info
  if (authMethod === 'privy') {
    // If not connected with Privy, user needs to log in (handled by ProtectedRoute)
    if (!isConnected || !address) {
      return null;
    }

    // Show connected wallet info for Privy
    return (
      <>
        <Menu>
          <MenuButton
            as={Button}
            rightIcon={<ChevronDownIcon />}
            size="sm"
            variant="outline"
          >
            <HStack spacing={2}>
              {isWrongChain && <Badge colorScheme="red">Wrong Chain</Badge>}
              <Text>Wallet</Text>
            </HStack>
          </MenuButton>
          <MenuList>
            <MenuItem onClick={onOpen}>View Details</MenuItem>
            {isWrongChain && (
              <MenuItem onClick={() => void switchChain(DEFAULT_CHAIN.chainId)}>
                Switch to {DEFAULT_CHAIN.name}
              </MenuItem>
            )}
            {/* Note: For Privy, disconnect logs out the user */}
          </MenuList>
        </Menu>

        <WalletDetailsModal
          isOpen={isOpen}
          onClose={onClose}
          address={address}
          ensName={ensName}
          ensLoading={ensLoading}
          chainId={chainId}
          isWrongChain={isWrongChain}
          hasCopied={hasCopied}
          onCopy={onCopy}
        />
      </>
    );
  }

  // For Logto auth, show traditional connect/disconnect button
  if (!isConnected || !address) {
    return (
      <Button colorScheme="brand" onClick={handleConnect} size="sm">
        Connect Wallet
      </Button>
    );
  }

  return (
    <>
      <Menu>
        <MenuButton
          as={Button}
          rightIcon={<ChevronDownIcon />}
          size="sm"
          variant="outline"
        >
          <HStack spacing={2}>
            {isWrongChain && <Badge colorScheme="red">Wrong Chain</Badge>}
            <Text>Wallet Connected</Text>
          </HStack>
        </MenuButton>
        <MenuList>
          <MenuItem onClick={onOpen}>View Details</MenuItem>
          {isWrongChain && (
            <MenuItem onClick={() => void switchChain(DEFAULT_CHAIN.chainId)}>
              Switch to {DEFAULT_CHAIN.name}
            </MenuItem>
          )}
          <MenuItem onClick={disconnect} color="red.500">
            Disconnect
          </MenuItem>
        </MenuList>
      </Menu>

      <WalletDetailsModal
        isOpen={isOpen}
        onClose={onClose}
        address={address}
        ensName={ensName}
        ensLoading={ensLoading}
        chainId={chainId}
        isWrongChain={isWrongChain}
        hasCopied={hasCopied}
        onCopy={onCopy}
      />
    </>
  );
}

/**
 * Wallet details modal - shared between Privy and Logto modes
 */
interface WalletDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  address: string;
  ensName: string | null;
  ensLoading: boolean;
  chainId: number | null;
  isWrongChain: boolean;
  hasCopied: boolean;
  onCopy: () => void;
}

function WalletDetailsModal({
  isOpen,
  onClose,
  address,
  ensName,
  ensLoading,
  chainId,
  isWrongChain,
  hasCopied,
  onCopy,
}: WalletDetailsModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Wallet Details</ModalHeader>
        <ModalCloseButton />
        <ModalBody pb={6}>
          <VStack align="stretch" spacing={4}>
            {ensLoading ? (
              <HStack>
                <Spinner size="sm" />
                <Text>Loading ENS...</Text>
              </HStack>
            ) : ensName ? (
              <VStack align="stretch" spacing={1}>
                <Text fontSize="sm" color="gray.500">
                  ENS Name
                </Text>
                <Text fontSize="lg" fontWeight="bold">
                  {ensName}
                </Text>
              </VStack>
            ) : null}

            <VStack align="stretch" spacing={1}>
              <Text fontSize="sm" color="gray.500">
                Address
              </Text>
              <HStack>
                <Text fontSize="sm" fontFamily="mono" wordBreak="break-all">
                  {address}
                </Text>
                <IconButton
                  aria-label="Copy address"
                  icon={hasCopied ? <CheckIcon /> : <CopyIcon />}
                  size="sm"
                  variant="ghost"
                  onClick={onCopy}
                />
              </HStack>
            </VStack>

            <VStack align="stretch" spacing={1}>
              <Text fontSize="sm" color="gray.500">
                Network
              </Text>
              <HStack>
                <Text>{DEFAULT_CHAIN.name}</Text>
                {isWrongChain && (
                  <Badge colorScheme="red">Wrong Chain ({chainId})</Badge>
                )}
              </HStack>
            </VStack>
          </VStack>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}
