import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from 'react';
import { BrowserProvider, type Signer } from 'ethers';
import type { WalletState } from '../types/payment';
import { DEFAULT_CHAIN } from '../config/chains';

interface WalletContextType extends WalletState {
  connect: () => Promise<void>;
  disconnect: () => void;
  getSigner: () => Promise<Signer | null>;
  switchChain: (chainId: number) => Promise<void>;
}

const WalletContext = createContext<WalletContextType | null>(null);

export function useWalletContext() {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWalletContext must be used within WalletProvider');
  }
  return context;
}

interface EthereumProvider {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on: (event: string, callback: (...args: unknown[]) => void) => void;
  removeListener: (event: string, callback: (...args: unknown[]) => void) => void;
  isCoinbaseWallet?: boolean;
  isMetaMask?: boolean;
  providers?: EthereumProvider[];
}

declare global {
  interface Window {
    ethereum?: EthereumProvider;
  }
}

/**
 * Get the preferred wallet provider.
 * Priority: Coinbase Wallet > MetaMask > Default
 */
function getPreferredProvider(): EthereumProvider | undefined {
  if (!window.ethereum) return undefined;

  // If multiple providers exist (e.g., both MetaMask and Coinbase installed)
  // window.ethereum.providers contains the array of all providers
  const providers = window.ethereum.providers;

  if (providers && providers.length > 0) {
    // Find Coinbase Wallet first
    const coinbaseProvider = providers.find((p) => p.isCoinbaseWallet);
    if (coinbaseProvider) return coinbaseProvider;

    // Fall back to MetaMask
    const metaMaskProvider = providers.find((p) => p.isMetaMask);
    if (metaMaskProvider) return metaMaskProvider;
  }

  // Single provider or Coinbase Wallet is already the default
  if (window.ethereum.isCoinbaseWallet) return window.ethereum;

  // Default to whatever is available
  return window.ethereum;
}

interface WalletProviderProps {
  children: ReactNode;
}

export function WalletProvider({ children }: WalletProviderProps) {
  const [state, setState] = useState<WalletState>({
    address: null,
    isConnected: false,
    chainId: null,
  });
  const [provider, setProvider] = useState<BrowserProvider | null>(null);

  const switchChain = useCallback(async (chainId: number) => {
    const ethereumProvider = getPreferredProvider();
    if (!ethereumProvider) return;

    try {
      await ethereumProvider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${chainId.toString(16)}` }],
      });
      setState((prev) => ({ ...prev, chainId }));
    } catch (error: unknown) {
      const err = error as { code?: number };
      if (err.code === 4902) {
        // Chain not added, add it
        const chain = DEFAULT_CHAIN;
        await ethereumProvider.request({
          method: 'wallet_addEthereumChain',
          params: [
            {
              chainId: `0x${chain.chainId.toString(16)}`,
              chainName: chain.name,
              rpcUrls: [chain.rpcUrl],
              blockExplorerUrls: [chain.blockExplorer],
              nativeCurrency: chain.nativeCurrency,
            },
          ],
        });
      }
    }
  }, []);

  const connect = useCallback(async () => {
    const ethereumProvider = getPreferredProvider();
    if (!ethereumProvider) {
      throw new Error('No wallet found. Install Coinbase Wallet or MetaMask.');
    }

    // Use the preferred provider (Coinbase Wallet prioritized)
    const browserProvider = new BrowserProvider(ethereumProvider);
    const accounts = (await browserProvider.send(
      'eth_requestAccounts',
      []
    )) as string[];
    const network = await browserProvider.getNetwork();

    setProvider(browserProvider);
    setState({
      address: accounts[0] ?? null,
      isConnected: true,
      chainId: Number(network.chainId),
    });

    // Switch chain if needed
    if (Number(network.chainId) !== DEFAULT_CHAIN.chainId) {
      await switchChain(DEFAULT_CHAIN.chainId);
    }
  }, [switchChain]);

  const disconnect = useCallback(() => {
    setProvider(null);
    setState({ address: null, isConnected: false, chainId: null });
  }, []);

  const getSigner = useCallback(async (): Promise<Signer | null> => {
    if (!provider) return null;
    return provider.getSigner();
  }, [provider]);

  // Listen for wallet events
  useEffect(() => {
    const ethereumProvider = getPreferredProvider();
    if (!ethereumProvider) return;

    const handleAccountsChanged = (accounts: unknown) => {
      const accts = accounts as string[];
      if (accts.length === 0) {
        disconnect();
      } else {
        setState((prev) => ({ ...prev, address: accts[0] ?? null }));
      }
    };

    const handleChainChanged = (chainId: unknown) => {
      setState((prev) => ({
        ...prev,
        chainId: parseInt(chainId as string, 16),
      }));
    };

    ethereumProvider.on('accountsChanged', handleAccountsChanged);
    ethereumProvider.on('chainChanged', handleChainChanged);

    return () => {
      ethereumProvider.removeListener('accountsChanged', handleAccountsChanged);
      ethereumProvider.removeListener('chainChanged', handleChainChanged);
    };
  }, [disconnect]);

  return (
    <WalletContext.Provider
      value={{ ...state, connect, disconnect, getSigner, switchChain }}
    >
      {children}
    </WalletContext.Provider>
  );
}
