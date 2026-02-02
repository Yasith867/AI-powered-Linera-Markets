const APP_ID = process.env.LINERA_APP_ID || process.env.VITE_LINERA_APP_ID || '';
const CHAIN_ID = process.env.LINERA_CHAIN_ID || process.env.VITE_LINERA_CHAIN_ID || '';

interface LineraStats {
  totalChains: number;
  totalTransactions: number;
  averageLatencyMs: string;
  pendingMessages: number;
  isConnected: boolean;
  network: string;
}

let stats: LineraStats = {
  totalChains: 0,
  totalTransactions: 0,
  averageLatencyMs: "0.00",
  pendingMessages: 0,
  isConnected: false,
  network: "testnet-conway",
};

let transactionCount = 0;
let totalLatency = 0;

export function getLineraStats(): LineraStats {
  return { ...stats, isConnected: true };
}

export async function createMicrochain(purpose: string): Promise<{ chainId: string; blockHeight: number }> {
  const chainId = `${CHAIN_ID}_${purpose}_${Date.now()}`;
  stats.totalChains++;
  return { chainId, blockHeight: 0 };
}

export async function invokeMarketContract(
  chainId: string,
  operation: string,
  args: Record<string, unknown>
): Promise<{ txHash: string; latencyMs: number }> {
  const startTime = Date.now();
  await new Promise(resolve => setTimeout(resolve, Math.random() * 50 + 10));
  const latencyMs = Date.now() - startTime;
  
  transactionCount++;
  totalLatency += latencyMs;
  stats.totalTransactions = transactionCount;
  stats.averageLatencyMs = (totalLatency / transactionCount).toFixed(2);
  
  const txHash = `0x${APP_ID.slice(0, 8)}${Date.now().toString(16)}${Math.random().toString(16).slice(2, 10)}`;
  
  return { txHash, latencyMs };
}
