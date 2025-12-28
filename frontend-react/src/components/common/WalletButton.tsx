import { useState } from 'react';
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
        toast({ title: 'Wallet connected', status: 'success', duration: 3000 });
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
          <MenuItem onClick={onOpen}>
            View Details
          </MenuItem>
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
                  <Text fontSize="sm" color="gray.500">ENS Name</Text>
                  <Text fontSize="lg" fontWeight="bold">{ensName}</Text>
                </VStack>
              ) : null}

              <VStack align="stretch" spacing={1}>
                <Text fontSize="sm" color="gray.500">Address</Text>
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
                <Text fontSize="sm" color="gray.500">Network</Text>
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
    </>
  );
}
