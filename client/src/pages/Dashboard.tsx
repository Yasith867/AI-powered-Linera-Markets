import { useEffect, useState } from "react";
import { Link } from "wouter";
import StatsCard from "../components/StatsCard";

interface Analytics {
  markets: { total: number; active: number; resolved: number; totalVolume: number };
  trades: { total: number; totalValue: number };
  oracles: { total: number; active: number; totalVotes: number };
  bots: { total: number; active: number; totalTrades: number };
}

interface LineraStats {
  totalChains: number;
  totalTransactions: number;
  averageLatencyMs: string;
  pendingMessages: number;
  isConnected: boolean;
  network: string;
}

export default function Dashboard() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [lineraStats, setLineraStats] = useState<LineraStats | null>(null);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchLineraStats, 3000);
    return () => clearInterval(interval);
  }, []);

  const fetchLineraStats = async () => {
    try {
      const stats = await fetch("/api/linera-stats").then((r) => r.json());
      setLineraStats(stats);
    } catch (e) {
      console.error("Failed to fetch Linera stats");
    }
  };

  const fetchData = async () => {
    const analyticsData = await fetch("/api/analytics/overview").then((r) => r.json());
    setAnalytics(analyticsData);
    await fetchLineraStats();
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Dashboard</h1>
          <p className="text-gray-400 mt-1">Real-time prediction market infrastructure</p>
        </div>
        <div className="flex items-center gap-3">
          {lineraStats?.isConnected && (
            <div className="flex items-center gap-2 px-4 py-2 bg-green-500/10 border border-green-500/30 rounded-lg">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-sm text-green-400 font-medium">Connected to Linera</span>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Active Markets"
          value={analytics?.markets.active || 0}
          subtitle={`${analytics?.markets.total || 0} total`}
          icon="📊"
          color="green"
        />
        <StatsCard
          title="Total Volume"
          value={`$${((analytics?.markets.totalVolume || 0) / 1000).toFixed(1)}K`}
          subtitle={`${analytics?.trades.total || 0} trades`}
          icon="💰"
          color="blue"
        />
        <StatsCard
          title="Oracle Network"
          value={analytics?.oracles.active || 0}
          subtitle={`${analytics?.oracles.totalVotes || 0} votes`}
          icon="🔮"
          color="purple"
        />
        <StatsCard
          title="Trading Bots"
          value={analytics?.bots.active || 0}
          subtitle={`${analytics?.bots.totalTrades || 0} executions`}
          icon="🤖"
          color="orange"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <h2 className="text-xl font-semibold text-white mb-4">Quick Actions</h2>
          <div className="card space-y-3">
            <Link href="/markets">
              <button className="w-full btn-secondary text-left flex items-center gap-3 p-4 hover:bg-gray-700/50 transition-colors">
                <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                  <span className="text-xl">📈</span>
                </div>
                <div>
                  <div className="font-medium text-green-400">Create Market</div>
                  <div className="text-xs text-gray-400">Launch new prediction</div>
                </div>
              </button>
            </Link>
            <Link href="/oracles">
              <button className="w-full btn-secondary text-left flex items-center gap-3 p-4 hover:bg-gray-700/50 transition-colors">
                <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                  <span className="text-xl">🔮</span>
                </div>
                <div>
                  <div className="font-medium text-purple-400">Add Oracle</div>
                  <div className="text-xs text-gray-400">Join oracle network</div>
                </div>
              </button>
            </Link>
            <Link href="/bots">
              <button className="w-full btn-secondary text-left flex items-center gap-3 p-4 hover:bg-gray-700/50 transition-colors">
                <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center">
                  <span className="text-xl">🤖</span>
                </div>
                <div>
                  <div className="font-medium text-orange-400">Deploy Bot</div>
                  <div className="text-xs text-gray-400">Automated trading</div>
                </div>
              </button>
            </Link>
          </div>
        </div>

        <div className="lg:col-span-1">
          <h2 className="text-xl font-semibold text-white mb-4">Linera Integration</h2>
          <div className="card bg-gradient-to-br from-green-900/20 to-emerald-900/20 border-green-800 h-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
                <span className="text-green-400 text-2xl">⚡</span>
              </div>
              <div className="flex-1">
                <div className="font-semibold text-green-400">Microchain Ready</div>
                <div className="text-sm text-gray-400">
                  {lineraStats?.network || "testnet-conway"}
                </div>
              </div>
              {lineraStats?.isConnected && (
                <div className="flex items-center gap-1.5 px-2 py-1 bg-green-500/20 rounded-full">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-xs text-green-400 font-medium">Live</span>
                </div>
              )}
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-gray-800/50 rounded-lg">
                <span className="text-gray-400">Avg Latency</span>
                <span className="font-mono text-green-400 font-medium">
                  {lineraStats?.averageLatencyMs || "0"}ms
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-800/50 rounded-lg">
                <span className="text-gray-400">Total Chains</span>
                <span className="font-mono text-blue-400 font-medium">
                  {lineraStats?.totalChains || 0}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-800/50 rounded-lg">
                <span className="text-gray-400">Transactions</span>
                <span className="font-mono text-purple-400 font-medium">
                  {lineraStats?.totalTransactions || 0}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-800/50 rounded-lg">
                <span className="text-gray-400">Pending Messages</span>
                <span className="font-mono text-orange-400 font-medium">
                  {lineraStats?.pendingMessages || 0}
                </span>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-700">
              <div className="text-xs text-gray-500 text-center">
                Sub-500ms finality demonstrated
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-1">
          <h2 className="text-xl font-semibold text-white mb-4">Platform Stats</h2>
          <div className="card h-full">
            <div className="space-y-4">
              <div className="p-4 bg-gradient-to-r from-green-500/10 to-transparent rounded-lg border border-green-500/20">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-400">Markets Resolved</span>
                  <span className="text-2xl font-bold text-green-400">
                    {analytics?.markets.resolved || 0}
                  </span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div 
                    className="bg-green-500 h-2 rounded-full transition-all duration-500"
                    style={{ 
                      width: `${analytics?.markets.total ? (analytics.markets.resolved / analytics.markets.total) * 100 : 0}%` 
                    }}
                  />
                </div>
              </div>
              
              <div className="p-4 bg-gradient-to-r from-blue-500/10 to-transparent rounded-lg border border-blue-500/20">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-400">Total Trade Value</span>
                  <span className="text-2xl font-bold text-blue-400">
                    ${((analytics?.trades.totalValue || 0) / 1000).toFixed(1)}K
                  </span>
                </div>
                <div className="text-xs text-gray-500">
                  Across {analytics?.trades.total || 0} transactions
                </div>
              </div>
              
              <div className="p-4 bg-gradient-to-r from-purple-500/10 to-transparent rounded-lg border border-purple-500/20">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-400">Oracle Votes</span>
                  <span className="text-2xl font-bold text-purple-400">
                    {analytics?.oracles.totalVotes || 0}
                  </span>
                </div>
                <div className="text-xs text-gray-500">
                  From {analytics?.oracles.total || 0} registered oracles
                </div>
              </div>
              
              <div className="p-4 bg-gradient-to-r from-orange-500/10 to-transparent rounded-lg border border-orange-500/20">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-400">Bot Executions</span>
                  <span className="text-2xl font-bold text-orange-400">
                    {analytics?.bots.totalTrades || 0}
                  </span>
                </div>
                <div className="text-xs text-gray-500">
                  {analytics?.bots.active || 0} active bots running
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
