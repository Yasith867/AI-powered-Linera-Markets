import Web3 from 'web3';

declare global {
  interface Window {
    linera?: unknown;
  }
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
  NOTE: 'CheCko wallet by ResPeer provides Linera blockchain integration via Web3.js API.'
} as const;

let web3Instance: Web3 | null = null;

export function detectLineraWallet(): { installed: boolean } {
  if (typeof window === 'undefined') {
    return { installed: false };
  }
  
  return { installed: !!window.linera };
}

export function getWeb3Instance(): Web3 | null {
  if (!window.linera) return null;
  
  if (!web3Instance) {
    web3Instance = new Web3(window.linera as never);
  }
  
  return web3Instance;
}

export async function connectLineraWallet(): Promise<{ success: boolean; address?: string; error?: string }> {
  const { installed } = detectLineraWallet();
  
  if (!installed || !window.linera) {
    return { 
      success: false, 
      error: 'CheCko wallet not detected. Please install the CheCko browser extension.' 
    };
  }
  
  try {
    const web3 = getWeb3Instance();
    if (!web3) {
      return { success: false, error: 'Failed to initialize Web3 with Linera provider' };
    }
    
    const accounts = await web3.eth.requestAccounts();
    
    if (!accounts || accounts.length === 0) {
      return { success: false, error: 'No accounts returned from CheCko wallet' };
    }
    
    return {
      success: true,
      address: accounts[0]
    };
  } catch (err) {
    const error = err as Error;
    if (error.message?.includes('User rejected') || error.message?.includes('denied')) {
      return { success: false, error: 'Connection rejected by user' };
    }
    return { success: false, error: error.message || 'Failed to connect to CheCko wallet' };
  }
}

export async function getAccounts(): Promise<string[]> {
  const web3 = getWeb3Instance();
  if (!web3) return [];
  
  try {
    return await web3.eth.getAccounts();
  } catch {
    return [];
  }
}

export async function getChainId(): Promise<string | null> {
  const web3 = getWeb3Instance();
  if (!web3) return null;
  
  try {
    const chainId = await web3.eth.getChainId();
    return chainId.toString();
  } catch {
    return null;
  }
}

export async function disconnectLineraWallet(): Promise<void> {
  web3Instance = null;
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
