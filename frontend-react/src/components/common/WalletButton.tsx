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
} from '@chakra-ui/react';
import { ChevronDownIcon } from '@chakra-ui/icons';
import { useWallet, shortenAddress } from '../../hooks/useWallet';
import { DEFAULT_CHAIN } from '../../config/chains';

export function WalletButton() {
  const { address, isConnected, chainId, connect, disconnect, switchChain } =
    useWallet();
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
    <Menu>
      <MenuButton
        as={Button}
        rightIcon={<ChevronDownIcon />}
        size="sm"
        variant="outline"
      >
        <HStack spacing={2}>
          {isWrongChain && <Badge colorScheme="red">Wrong Chain</Badge>}
          <Text>{shortenAddress(address)}</Text>
        </HStack>
      </MenuButton>
      <MenuList>
        <MenuItem isDisabled>Chain: {chainId}</MenuItem>
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
  );
}
