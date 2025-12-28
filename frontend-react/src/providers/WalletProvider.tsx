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

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
      on: (event: string, callback: (...args: unknown[]) => void) => void;
      removeListener: (event: string, callback: (...args: unknown[]) => void) => void;
    };
  }
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
    if (!window.ethereum) return;

    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${chainId.toString(16)}` }],
      });
      setState((prev) => ({ ...prev, chainId }));
    } catch (error: unknown) {
      const err = error as { code?: number };
      if (err.code === 4902) {
        // Chain not added, add it
        const chain = DEFAULT_CHAIN;
        await window.ethereum.request({
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
    if (!window.ethereum) {
      throw new Error('No wallet found. Install Coinbase Wallet or MetaMask.');
    }

    const browserProvider = new BrowserProvider(window.ethereum);
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
    if (!window.ethereum) return;

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

    window.ethereum.on('accountsChanged', handleAccountsChanged);
    window.ethereum.on('chainChanged', handleChainChanged);

    return () => {
      window.ethereum?.removeListener('accountsChanged', handleAccountsChanged);
      window.ethereum?.removeListener('chainChanged', handleChainChanged);
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
