import { db } from "../db";

export interface LineraChain {
  chainId: string;
  applicationId: string;
  blockHeight: number;
}

export interface LineraTransaction {
  txHash: string;
  chainId: string;
  operation: string;
  timestamp: number;
  latencyMs: number;
}

export interface CrossChainMessage {
  sourceChain: string;
  targetChain: string;
  messageType: string;
  data: Record<string, unknown>;
  delivered: boolean;
}

const pendingMessages: CrossChainMessage[] = [];
const chains: Map<string, LineraChain> = new Map();
const transactions: LineraTransaction[] = [];

export function generateChainId(): string {
  return `chain_${Math.random().toString(36).slice(2, 10)}`;
}

export function generateAppId(): string {
  return `app_${Math.random().toString(36).slice(2, 14)}`;
}

export async function createMicrochain(applicationId: string): Promise<LineraChain> {
  const startTime = performance.now();
  
  const chain: LineraChain = {
    chainId: generateChainId(),
    applicationId,
    blockHeight: 0,
  };
  
  chains.set(chain.chainId, chain);
  
  const latency = performance.now() - startTime;
  
  transactions.push({
    txHash: `tx_${Math.random().toString(36).slice(2, 12)}`,
    chainId: chain.chainId,
    operation: "CREATE_CHAIN",
    timestamp: Date.now(),
    latencyMs: latency,
  });
  
  return chain;
}

export async function executeOperation(
  chainId: string,
  operation: string,
  data: Record<string, unknown>
): Promise<{ success: boolean; txHash: string; latencyMs: number }> {
  const startTime = performance.now();
  
  const chain = chains.get(chainId);
  if (chain) {
    chain.blockHeight += 1;
    chains.set(chainId, chain);
  }
  
  await new Promise(resolve => setTimeout(resolve, Math.random() * 50 + 10));
  
  const latency = performance.now() - startTime;
  const txHash = `tx_${Math.random().toString(36).slice(2, 12)}`;
  
  transactions.push({
    txHash,
    chainId,
    operation,
    timestamp: Date.now(),
    latencyMs: latency,
  });
  
  return { success: true, txHash, latencyMs: latency };
}

export async function sendCrossChainMessage(
  sourceChain: string,
  targetChain: string,
  messageType: string,
  data: Record<string, unknown>
): Promise<void> {
  const message: CrossChainMessage = {
    sourceChain,
    targetChain,
    messageType,
    data,
    delivered: false,
  };
  
  pendingMessages.push(message);
  
  setTimeout(() => {
    message.delivered = true;
    processCrossChainMessage(message);
  }, Math.random() * 100 + 50);
}

async function processCrossChainMessage(message: CrossChainMessage): Promise<void> {
  console.log(`[Linera] Cross-chain message delivered: ${message.messageType} from ${message.sourceChain} to ${message.targetChain}`);
}

export function getAverageLatency(): number {
  if (transactions.length === 0) return 0;
  const total = transactions.reduce((sum, tx) => sum + tx.latencyMs, 0);
  return total / transactions.length;
}

export function getTransactionCount(): number {
  return transactions.length;
}

export function getPendingMessages(): CrossChainMessage[] {
  return pendingMessages.filter(m => !m.delivered);
}

export function getChainCount(): number {
  return chains.size;
}

export function getRecentTransactions(limit: number = 10): LineraTransaction[] {
  return transactions.slice(-limit);
}

export async function invokeMarketContract(
  marketChainId: string,
  operation: "CreateMarket" | "PlaceTrade" | "ResolveMarket",
  data: Record<string, unknown>
): Promise<{ success: boolean; txHash: string; latencyMs: number }> {
  return executeOperation(marketChainId, `Market::${operation}`, data);
}

export async function invokeOracleContract(
  oracleChainId: string,
  operation: "RegisterOracle" | "SubmitVote" | "DeactivateOracle",
  data: Record<string, unknown>
): Promise<{ success: boolean; txHash: string; latencyMs: number }> {
  return executeOperation(oracleChainId, `Oracle::${operation}`, data);
}

export async function invokeBotContract(
  botChainId: string,
  operation: "Configure" | "Execute" | "Stop" | "Start",
  data: Record<string, unknown>
): Promise<{ success: boolean; txHash: string; latencyMs: number }> {
  return executeOperation(botChainId, `Bot::${operation}`, data);
}

export async function invokeAMMContract(
  ammChainId: string,
  operation: "CreatePool" | "AddLiquidity" | "Swap",
  data: Record<string, unknown>
): Promise<{ success: boolean; txHash: string; latencyMs: number }> {
  return executeOperation(ammChainId, `AMM::${operation}`, data);
}

export function getLineraStats() {
  return {
    totalChains: getChainCount(),
    totalTransactions: getTransactionCount(),
    averageLatencyMs: getAverageLatency().toFixed(2),
    pendingMessages: getPendingMessages().length,
    recentTransactions: getRecentTransactions(5),
    isConnected: true,
    network: "testnet-conway",
  };
}
