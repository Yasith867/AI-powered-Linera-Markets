import { getWallets, Wallet } from '@wallet-standard/core';

declare global {
  interface Window {
    linera?: unknown;
  }
}

export interface AccountInfo {
  chainId: string;
  owner: string;
}

export interface NetworkInfo {
  genesisHash: string;
  name: string;
  applicationMutateUrl: string;
  applicationQueryUrl: string;
  faucetUrl?: string;
}

export interface LineraWallet extends Wallet {
  readonly url: string;
  features: {
    'linera:connect': {
      version: '1.0.0';
      connect: (silent?: boolean, networkInfo?: NetworkInfo) => Promise<AccountInfo>;
    };
    'linera:disconnect': {
      version: '1.0.0';
      disconnect: () => Promise<void>;
    };
    'linera:account': {
      version: '1.0.0';
      getAccount: () => Promise<AccountInfo | null>;
    };
    'linera:signMessage': {
      version: '1.0.0';
      signMessage: (message: Uint8Array) => Promise<Uint8Array>;
    };
    'linera:mutate': {
      version: '1.0.0';
      mutate: (input: { appId: string; query: string; variables?: object }) => Promise<unknown>;
    };
    'linera:query': {
      version: '1.0.0';
      query: (input: { appId: string; query: string; variables?: object }) => Promise<unknown>;
    };
    'linera:network': {
      version: '1.0.0';
      getNetwork: () => Promise<NetworkInfo>;
    };
    'linera:onAccountChange': {
      version: '1.0.0';
      onAccountChange: (callback: (account: AccountInfo | null) => void) => () => void;
    };
    'linera:onNetworkChange': {
      version: '1.0.0';
      onNetworkChange: (callback: (network: NetworkInfo) => void) => () => void;
    };
    'linera:onNotification': {
      version: '1.0.0';
      onNotification: (callback: (notification: unknown) => void) => () => void;
    };
  };
}

export interface WalletState {
  isConnected: boolean;
  address: string | null;
  chainId: string | null;
  isInstalled: boolean;
}

export const CHECKO_INSTALL_URL = 'https://github.com/respeer-ai/linera-wallet/releases';
export const LINERA_DOCS_URL = 'https://linera.dev/developers/core_concepts/wallets.html';
export const CROISSANT_INSTALL_URL = 'https://linera.dev';

export const WALLET_STATUS = {
  EXPERIMENTAL: false,
  NOTE: 'CheCko wallet uses Linera Wallet Standard for real on-chain transactions.'
} as const;

const REQUIRED_FEATURES = [
  'linera:connect',
  'linera:disconnect',
  'linera:account',
  'linera:signMessage',
  'linera:mutate'
];

let connectedWallet: LineraWallet | null = null;
let currentAccount: AccountInfo | null = null;

export function isLineraWallet(wallet: Wallet): wallet is LineraWallet {
  return REQUIRED_FEATURES.every((feature) => feature in wallet.features);
}

export function getLineraWallets(): LineraWallet[] {
  const { get } = getWallets();
  const wallets = get();
  return wallets.filter(isLineraWallet) as LineraWallet[];
}

export function detectLineraWallet(): { installed: boolean; wallets: LineraWallet[] } {
  if (typeof window === 'undefined') {
    return { installed: false, wallets: [] };
  }
  
  const wallets = getLineraWallets();
  return { 
    installed: wallets.length > 0 || !!window.linera,
    wallets 
  };
}

export async function connectLineraWallet(): Promise<{ 
  success: boolean; 
  address?: string; 
  chainId?: string;
  error?: string 
}> {
  const { wallets } = detectLineraWallet();
  
  if (wallets.length === 0) {
    return { 
      success: false, 
      error: 'No Linera wallet detected. Please install CheCko browser extension.' 
    };
  }
  
  const wallet = wallets[0];
  
  try {
    const connectFeature = wallet.features['linera:connect'];
    if (!connectFeature) {
      return { success: false, error: 'Wallet does not support connect feature' };
    }
    
    const account = await connectFeature.connect(false);
    
    if (!account || !account.owner) {
      return { success: false, error: 'No account returned from wallet' };
    }
    
    connectedWallet = wallet;
    currentAccount = account;
    
    return {
      success: true,
      address: account.owner,
      chainId: account.chainId
    };
  } catch (err) {
    const error = err as Error;
    if (error.message?.includes('rejected') || error.message?.includes('denied')) {
      return { success: false, error: 'Connection rejected by user' };
    }
    return { success: false, error: error.message || 'Failed to connect wallet' };
  }
}

export async function getAccount(): Promise<AccountInfo | null> {
  if (!connectedWallet) return null;
  
  try {
    const accountFeature = connectedWallet.features['linera:account'];
    if (!accountFeature) return currentAccount;
    
    const account = await accountFeature.getAccount();
    currentAccount = account;
    return account;
  } catch {
    return currentAccount;
  }
}

export async function disconnectLineraWallet(): Promise<void> {
  if (!connectedWallet) return;
  
  try {
    const disconnectFeature = connectedWallet.features['linera:disconnect'];
    if (disconnectFeature) {
      await disconnectFeature.disconnect();
    }
  } catch (e) {
    console.log('Disconnect error:', e);
  }
  
  connectedWallet = null;
  currentAccount = null;
}

export async function mutate(appId: string, query: string, variables?: object): Promise<unknown> {
  if (!connectedWallet) {
    throw new Error('Wallet not connected');
  }
  
  const mutateFeature = connectedWallet.features['linera:mutate'];
  if (!mutateFeature) {
    throw new Error('Wallet does not support mutations');
  }
  
  return await mutateFeature.mutate({ appId, query, variables });
}

export async function queryApp(appId: string, query: string, variables?: object): Promise<unknown> {
  if (!connectedWallet) {
    throw new Error('Wallet not connected');
  }
  
  const queryFeature = connectedWallet.features['linera:query'];
  if (!queryFeature) {
    throw new Error('Wallet does not support queries');
  }
  
  return await queryFeature.query({ appId, query, variables });
}

export async function signMessage(message: string): Promise<Uint8Array> {
  if (!connectedWallet) {
    throw new Error('Wallet not connected');
  }
  
  const signFeature = connectedWallet.features['linera:signMessage'];
  if (!signFeature) {
    throw new Error('Wallet does not support message signing');
  }
  
  const encoder = new TextEncoder();
  const messageBytes = encoder.encode(message);
  return await signFeature.signMessage(messageBytes);
}

export async function getNetwork(): Promise<NetworkInfo | null> {
  if (!connectedWallet) return null;
  
  try {
    const networkFeature = connectedWallet.features['linera:network'];
    if (!networkFeature) return null;
    
    return await networkFeature.getNetwork();
  } catch {
    return null;
  }
}

export function onAccountChange(callback: (account: AccountInfo | null) => void): () => void {
  if (!connectedWallet) return () => {};
  
  const feature = connectedWallet.features['linera:onAccountChange'];
  if (!feature) return () => {};
  
  return feature.onAccountChange(callback);
}

export function getConnectedWallet(): LineraWallet | null {
  return connectedWallet;
}

export function getCurrentAccount(): AccountInfo | null {
  return currentAccount;
}

export function generateMockAddress(): string {
  const chars = '0123456789abcdef';
  let address = '';
  for (let i = 0; i < 64; i++) {
    address += chars[Math.floor(Math.random() * chars.length)];
  }
  return address;
}

export function shortenAddress(address: string, chars = 6): string {
  if (!address) return '';
  if (address.length <= chars * 2 + 3) return address;
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

export function getWeb3Instance(): null {
  return null;
}

export const PREDICTION_MARKET_APP_ID = 'e476187f6ddfeb9d588c7b45d3df334d5501d6499b3f9ad5595cae86cce16a65010000000000000000000000e476187f6ddfeb9d588c7b45d3df334d5501d6499b3f9ad5595cae86cce16a65030000000000000000000000';

export async function placeTrade(
  marketId: number, 
  optionIndex: number, 
  amount: number, 
  isBuy: boolean
): Promise<{ success: boolean; txHash?: string; error?: string }> {
  if (!connectedWallet || !currentAccount) {
    return { success: false, error: 'Wallet not connected' };
  }
  
  const mutation = `
    mutation PlaceTrade($marketId: Int!, $optionIndex: Int!, $amount: Float!, $isBuy: Boolean!) {
      placeTrade(marketId: $marketId, optionIndex: $optionIndex, amount: $amount, isBuy: $isBuy) {
        success
        txHash
      }
    }
  `;
  
  try {
    const result = await mutate(PREDICTION_MARKET_APP_ID, mutation, {
      marketId,
      optionIndex,
      amount,
      isBuy
    }) as { placeTrade: { success: boolean; txHash: string } };
    
    return {
      success: true,
      txHash: result.placeTrade.txHash
    };
  } catch (err) {
    const error = err as Error;
    if (error.message?.includes('rejected') || error.message?.includes('denied')) {
      return { success: false, error: 'Transaction rejected by user' };
    }
    return { success: false, error: error.message || 'Transaction failed' };
  }
}
