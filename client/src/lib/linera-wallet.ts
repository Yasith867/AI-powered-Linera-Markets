import Web3 from 'web3';
import { LINERA_CONFIG } from './linera-config';

declare global {
  interface Window {
    linera?: {
      request: (args: { method: string; params?: unknown }) => Promise<unknown>;
    };
  }
}

export interface WalletState {
  isConnected: boolean;
  address: string | null;
  chainId: string | null;
  isInstalled: boolean;
}

export interface LineraAccount {
  publicKey: string;
  chainId: string;
}

export const CHECKO_INSTALL_URL = 'https://github.com/respeer-ai/linera-wallet/releases';
export const LINERA_DOCS_URL = 'https://linera.dev/developers/core_concepts/wallets.html';
export const CROISSANT_INSTALL_URL = 'https://linera.dev';

export const WALLET_STATUS = {
  EXPERIMENTAL: false,
  NOTE: 'CheCko wallet uses linera_graphqlMutation for on-chain transactions.'
} as const;

let web3Instance: Web3 | null = null;
let connectedAccount: LineraAccount | null = null;

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
  publicKey?: string;
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
    
    const address = accounts[0];
    
    connectedAccount = {
      publicKey: address,
      chainId: address
    };
    
    return {
      success: true,
      address,
      publicKey: address,
      chainId: address
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

export async function disconnectLineraWallet(): Promise<void> {
  web3Instance = null;
  connectedAccount = null;
}

export function getConnectedAccount(): LineraAccount | null {
  return connectedAccount;
}

export function isWalletConnected(): boolean {
  return !!connectedAccount && !!web3Instance;
}

export async function lineraGraphqlMutation(
  applicationId: string | null,
  query: string,
  variables: Record<string, unknown> = {},
  applicationOperationBytes?: number[]
): Promise<{ success: boolean; operationId?: string; error?: string }> {
  if (!window.linera) {
    return { success: false, error: 'Wallet not connected' };
  }
  
  if (!connectedAccount) {
    return { success: false, error: 'Please connect wallet first' };
  }
  
  try {
    const params: {
      publicKey: string;
      applicationId?: string;
      query: {
        query: string;
        variables: Record<string, unknown>;
        applicationOperationBytes?: string;
      };
      operationName: string;
    } = {
      publicKey: connectedAccount.publicKey,
      query: {
        query,
        variables
      },
      operationName: extractOperationName(query) || 'Mutation'
    };
    
    if (applicationId) {
      params.applicationId = applicationId;
    }
    
    if (applicationOperationBytes) {
      params.query.applicationOperationBytes = JSON.stringify(applicationOperationBytes);
    }
    
    const result = await window.linera.request({
      method: 'linera_graphqlMutation',
      params
    }) as { operationId?: string };
    
    return {
      success: true,
      operationId: result?.operationId
    };
  } catch (err) {
    const error = err as Error;
    console.log('GraphQL mutation error:', error);
    
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

export async function lineraGraphqlQuery(
  applicationId: string | null,
  query: string,
  variables: Record<string, unknown> = {}
): Promise<{ success: boolean; data?: unknown; error?: string }> {
  if (!window.linera) {
    return { success: false, error: 'Wallet not connected' };
  }
  
  if (!connectedAccount) {
    return { success: false, error: 'Please connect wallet first' };
  }
  
  try {
    const params: {
      publicKey: string;
      applicationId?: string;
      query: {
        query: string;
        variables: Record<string, unknown>;
      };
      operationName: string;
    } = {
      publicKey: connectedAccount.publicKey,
      query: {
        query,
        variables
      },
      operationName: extractOperationName(query) || 'Query'
    };
    
    if (applicationId) {
      params.applicationId = applicationId;
    }
    
    const result = await window.linera.request({
      method: 'linera_graphqlQuery',
      params
    });
    
    return {
      success: true,
      data: result
    };
  } catch (err) {
    const error = err as Error;
    console.log('GraphQL query error:', error);
    
    return { 
      success: false, 
      error: error.message || 'Query failed' 
    };
  }
}

function extractOperationName(query: string): string | null {
  const match = query.match(/(?:mutation|query)\s+(\w+)/);
  return match ? match[1] : null;
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

export const PREDICTION_MARKET_APP_ID = LINERA_CONFIG.getAppId();

export async function placeTrade(
  marketId: number, 
  optionIndex: number, 
  amount: number, 
  isBuy: boolean
): Promise<{ success: boolean; operationId?: string; error?: string }> {
  const mutation = `
    mutation PlaceTrade($marketId: Int!, $optionIndex: Int!, $amount: Float!, $isBuy: Boolean!) {
      placeTrade(marketId: $marketId, optionIndex: $optionIndex, amount: $amount, isBuy: $isBuy) {
        success
        txHash
      }
    }
  `;
  
  return await lineraGraphqlMutation(
    PREDICTION_MARKET_APP_ID,
    mutation,
    { marketId, optionIndex, amount, isBuy }
  );
}

export async function transferTokens(
  recipient: string,
  amount: string
): Promise<{ success: boolean; operationId?: string; error?: string }> {
  const mutation = `
    mutation Transfer($owner: String, $amount: String!, $targetAccount: String!) {
      transfer(owner: $owner, amount: $amount, targetAccount: $targetAccount)
    }
  `;
  
  return await lineraGraphqlMutation(
    null,
    mutation,
    { 
      owner: null, 
      amount, 
      targetAccount: recipient 
    }
  );
}
