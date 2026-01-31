import { useEffect, useState } from "react";
import { Link } from "wouter";
import { useApi } from "../hooks/useApi";
import StatsCard from "../components/StatsCard";
import MarketCard from "../components/MarketCard";

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

interface Market {
  id: number;
  title: string;
  category: string;
  options: string[];
  odds: number[];
  totalVolume: number;
  status: string;
}

export default function Dashboard() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [markets, setMarkets] = useState<Market[]>([]);
  const [lineraStats, setLineraStats] = useState<LineraStats | null>(null);
  const [generating, setGenerating] = useState(false);
  const api = useApi();

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
    const [analyticsData, marketsData] = await Promise.all([
      fetch("/api/analytics/overview").then((r) => r.json()),
      fetch("/api/markets").then((r) => r.json()),
    ]);
    setAnalytics(analyticsData);
    setMarkets(marketsData.slice(0, 6));
    await fetchLineraStats();
  };

  const generateAIMarket = async (category: string) => {
    setGenerating(true);
    try {
      await api.post("/api/ai/generate-market", { category });
      await fetchData();
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Dashboard</h1>
          <p className="text-gray-400 mt-1">Real-time prediction market infrastructure</p>
        </div>
        <div className="flex gap-2">
          {["crypto", "sports", "technology"].map((cat) => (
            <button
              key={cat}
              onClick={() => generateAIMarket(cat)}
              disabled={generating}
              className="btn-primary flex items-center gap-2 disabled:opacity-50"
            >
              {generating ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <span>🤖</span>
              )}
              AI Create {cat}
            </button>
          ))}
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
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-white">Active Markets</h2>
            <Link href="/markets">
              <button className="text-green-400 hover:text-green-300 text-sm">View all →</button>
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {markets.map((market) => (
              <MarketCard key={market.id} market={market} />
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-white mb-4">Quick Actions</h2>
          <div className="card space-y-3">
            <Link href="/markets">
              <button className="w-full btn-secondary text-left flex items-center gap-3">
                <span className="text-xl">📈</span>
                <div>
                  <div className="font-medium">Create Market</div>
                  <div className="text-xs text-gray-400">Launch new prediction</div>
                </div>
              </button>
            </Link>
            <Link href="/oracles">
              <button className="w-full btn-secondary text-left flex items-center gap-3">
                <span className="text-xl">🔮</span>
                <div>
                  <div className="font-medium">Add Oracle</div>
                  <div className="text-xs text-gray-400">Join oracle network</div>
                </div>
              </button>
            </Link>
            <Link href="/bots">
              <button className="w-full btn-secondary text-left flex items-center gap-3">
                <span className="text-xl">🤖</span>
                <div>
                  <div className="font-medium">Deploy Bot</div>
                  <div className="text-xs text-gray-400">Automated trading</div>
                </div>
              </button>
            </Link>
          </div>

          <div className="mt-6">
            <h3 className="text-lg font-semibold text-white mb-3">Linera Integration</h3>
            <div className="card bg-gradient-to-br from-green-900/20 to-emerald-900/20 border-green-800">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                  <span className="text-green-400 text-xl">⚡</span>
                </div>
                <div>
                  <div className="font-medium text-green-400">Microchain Ready</div>
                  <div className="text-xs text-gray-400">
                    {lineraStats?.network || "testnet-conway"}
                  </div>
                </div>
                {lineraStats?.isConnected && (
                  <div className="ml-auto flex items-center gap-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    <span className="text-xs text-green-400">Live</span>
                  </div>
                )}
              </div>
              <div className="space-y-2 text-xs text-gray-400">
                <div className="flex justify-between">
                  <span>Avg Latency</span>
                  <span className="font-mono text-green-400">
                    {lineraStats?.averageLatencyMs || "0"}ms
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Total Chains</span>
                  <span className="font-mono text-blue-400">
                    {lineraStats?.totalChains || 0}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Transactions</span>
                  <span className="font-mono text-purple-400">
                    {lineraStats?.totalTransactions || 0}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Pending Messages</span>
                  <span className="font-mono text-orange-400">
                    {lineraStats?.pendingMessages || 0}
                  </span>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-gray-800">
                <div className="text-xs text-gray-500">
                  Sub-500ms finality demonstrated
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
