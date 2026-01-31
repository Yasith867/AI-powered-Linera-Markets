declare global {
  interface Window {
    linera?: LineraProvider;
  }
}

interface LineraProvider {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on: (event: string, handler: (...args: unknown[]) => void) => void;
  removeListener: (event: string, handler: (...args: unknown[]) => void) => void;
  isCheCko?: boolean;
  isCroissant?: boolean;
}

export interface WalletState {
  isConnected: boolean;
  address: string | null;
  chainId: string | null;
  isInstalled: boolean;
  walletType: 'checko' | 'croissant' | 'unknown' | null;
}

export const CHECKO_INSTALL_URL = 'https://github.com/nicholasyan/checko-wallet';
export const LINERA_DOCS_URL = 'https://linera.dev/developers/core_concepts/wallets.html';

export const WALLET_STATUS = {
  EXPERIMENTAL: true,
  NOTE: 'Linera browser wallets (CheCko/Croissant) are experimental. Demo mode recommended for testing.'
} as const;

export function detectLineraWallet(): { installed: boolean; type: 'checko' | 'croissant' | 'unknown' | null } {
  if (typeof window === 'undefined') {
    return { installed: false, type: null };
  }
  
  if (window.linera) {
    if (window.linera.isCheCko) {
      return { installed: true, type: 'checko' };
    }
    if (window.linera.isCroissant) {
      return { installed: true, type: 'croissant' };
    }
    return { installed: true, type: 'unknown' };
  }
  
  return { installed: false, type: null };
}

export async function connectLineraWallet(): Promise<{ success: boolean; address?: string; chainId?: string; error?: string }> {
  const { installed } = detectLineraWallet();
  
  if (!installed || !window.linera) {
    return { 
      success: false, 
      error: 'Linera wallet not detected. Please install CheCko or Croissant wallet.' 
    };
  }
  
  try {
    const accounts = await window.linera.request({ 
      method: 'linera_requestAccounts' 
    }) as string[];
    
    if (!accounts || accounts.length === 0) {
      return { success: false, error: 'No accounts returned from wallet' };
    }
    
    const chains = await window.linera.request({ 
      method: 'linera_getChains' 
    }) as string[];
    
    return {
      success: true,
      address: accounts[0],
      chainId: chains?.[0] || undefined
    };
  } catch (err) {
    const error = err as Error;
    if (error.message?.includes('User rejected')) {
      return { success: false, error: 'Connection rejected by user' };
    }
    return { success: false, error: error.message || 'Failed to connect wallet' };
  }
}

export async function disconnectLineraWallet(): Promise<void> {
  if (window.linera) {
    try {
      await window.linera.request({ method: 'linera_disconnect' });
    } catch {
      // Disconnect may not be supported, that's okay
    }
  }
}

export function subscribeToWalletEvents(
  onAccountsChanged: (accounts: string[]) => void,
  onChainChanged: (chainId: string) => void,
  onDisconnect: () => void
): () => void {
  if (!window.linera) return () => {};
  
  const accountsHandler = (accounts: unknown) => onAccountsChanged(accounts as string[]);
  const chainHandler = (chainId: unknown) => onChainChanged(chainId as string);
  const disconnectHandler = () => onDisconnect();
  
  window.linera.on('accountsChanged', accountsHandler);
  window.linera.on('chainChanged', chainHandler);
  window.linera.on('disconnect', disconnectHandler);
  
  return () => {
    if (window.linera) {
      window.linera.removeListener('accountsChanged', accountsHandler);
      window.linera.removeListener('chainChanged', chainHandler);
      window.linera.removeListener('disconnect', disconnectHandler);
    }
  };
}

export function generateMockAddress(): string {
  const chars = '0123456789abcdef';
  let address = '0x';
  for (let i = 0; i < 40; i++) {
    address += chars[Math.floor(Math.random() * chars.length)];
  }
  return address;
}

export function shortenAddress(address: string, chars = 4): string {
  if (!address) return '';
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
}
