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
  NOTE: 'CheCko wallet uses Web3.js API for Linera blockchain integration.'
} as const;

let web3Instance: Web3 | null = null;
let connectedAddress: string | null = null;

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

export async function connectLineraWallet(): Promise<{ 
  success: boolean; 
  address?: string; 
  chainId?: string;
  error?: string 
}> {
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
    
    connectedAddress = accounts[0];
    
    let chainId: string | undefined;
    try {
      const id = await web3.eth.getChainId();
      chainId = id.toString();
    } catch {
      chainId = 'linera-testnet';
    }
    
    return {
      success: true,
      address: accounts[0],
      chainId
    };
  } catch (err) {
    const error = err as Error;
    console.log('Wallet connection error:', error);
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
  connectedAddress = null;
}

export function getConnectedAddress(): string | null {
  return connectedAddress;
}

export function isWalletConnected(): boolean {
  return !!connectedAddress && !!web3Instance;
}

export async function signAndSendOperation(
  operation: {
    action: string;
    marketId: number;
    optionIndex: number;
    amount: number;
  }
): Promise<{ success: boolean; txHash?: string; error?: string }> {
  const web3 = getWeb3Instance();
  
  if (!web3 || !connectedAddress) {
    return { success: false, error: 'Wallet not connected' };
  }
  
  try {
    const operationData = JSON.stringify(operation);
    const signature = await web3.eth.personal.sign(
      operationData,
      connectedAddress,
      ''
    );
    
    return {
      success: true,
      txHash: signature.slice(0, 66)
    };
  } catch (err) {
    const error = err as Error;
    console.log('Sign operation error:', error);
    
    if (error.message?.includes('User denied') || 
        error.message?.includes('rejected') || 
        error.message?.includes('cancel')) {
      return { success: false, error: 'Transaction rejected by user' };
    }
    
    return { 
      success: false, 
      error: error.message || 'Failed to sign operation' 
    };
  }
}

export async function sendTransaction(
  to: string,
  data: string,
  value?: string
): Promise<{ success: boolean; txHash?: string; error?: string }> {
  const web3 = getWeb3Instance();
  
  if (!web3 || !connectedAddress) {
    return { success: false, error: 'Wallet not connected' };
  }
  
  try {
    const tx = await web3.eth.sendTransaction({
      from: connectedAddress,
      to,
      data: web3.utils.utf8ToHex(data),
      value: value || '0'
    });
    
    return {
      success: true,
      txHash: tx.transactionHash?.toString()
    };
  } catch (err) {
    const error = err as Error;
    console.log('Send transaction error:', error);
    
    if (error.message?.includes('User denied') || 
        error.message?.includes('rejected') || 
        error.message?.includes('cancel')) {
      return { success: false, error: 'Transaction rejected by user' };
    }
    
    return { 
      success: false, 
      error: error.message || 'Transaction failed' 
    };
  }
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

export async function placeTrade(
  marketId: number, 
  optionIndex: number, 
  amount: number, 
  isBuy: boolean
): Promise<{ success: boolean; txHash?: string; error?: string }> {
  if (!connectedAddress) {
    return { success: false, error: 'Wallet not connected' };
  }
  
  const result = await signAndSendOperation({
    action: isBuy ? 'buy' : 'sell',
    marketId,
    optionIndex,
    amount
  });
  
  return result;
}
