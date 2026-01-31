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
  const [showCustomModal, setShowCustomModal] = useState(false);
  const getDefaultDateTime = () => {
    const date = new Date();
    date.setDate(date.getDate() + 7);
    return date.toISOString().slice(0, 16);
  };
  const [customMarket, setCustomMarket] = useState({
    title: "",
    description: "",
    category: "general",
    options: ["Yes", "No"],
    eventDateTime: getDefaultDateTime(),
  });
  const [creatingCustom, setCreatingCustom] = useState(false);
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

  const createCustomMarket = async () => {
    if (!customMarket.title.trim()) return;
    setCreatingCustom(true);
    try {
      await api.post("/api/markets", {
        title: customMarket.title,
        description: customMarket.description || `Custom prediction market: ${customMarket.title}`,
        category: customMarket.category,
        options: customMarket.options.filter(o => o.trim()),
        eventTime: new Date(customMarket.eventDateTime).toISOString(),
      });
      setShowCustomModal(false);
      setCustomMarket({ title: "", description: "", category: "general", options: ["Yes", "No"], eventDateTime: getDefaultDateTime() });
      await fetchData();
    } finally {
      setCreatingCustom(false);
    }
  };

  const updateOption = (index: number, value: string) => {
    const newOptions = [...customMarket.options];
    newOptions[index] = value;
    setCustomMarket({ ...customMarket, options: newOptions });
  };

  const addOption = () => {
    if (customMarket.options.length < 6) {
      setCustomMarket({ ...customMarket, options: [...customMarket.options, ""] });
    }
  };

  const removeOption = (index: number) => {
    if (customMarket.options.length > 2) {
      const newOptions = customMarket.options.filter((_, i) => i !== index);
      setCustomMarket({ ...customMarket, options: newOptions });
    }
  };

  const deleteMarket = async (id: number) => {
    await api.del(`/api/markets/${id}`);
    setMarkets(markets.filter(m => m.id !== id));
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Dashboard</h1>
          <p className="text-gray-400 mt-1">Real-time prediction market infrastructure</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setShowCustomModal(true)}
            className="btn-secondary flex items-center gap-2"
          >
            <span>+</span>
            Custom Market
          </button>
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
            {markets.filter(m => m.status === "active").slice(0, 4).map((market) => (
              <MarketCard key={market.id} market={market} onDelete={deleteMarket} />
            ))}
            {markets.filter(m => m.status === "active").length === 0 && (
              <div className="col-span-2 text-center py-8 text-gray-400">
                No active markets. Create one using the buttons above!
              </div>
            )}
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

      {showCustomModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="card max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Create Custom Market</h2>
              <button
                onClick={() => setShowCustomModal(false)}
                className="text-gray-400 hover:text-white text-2xl"
              >
                &times;
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Market Question *
                </label>
                <input
                  type="text"
                  value={customMarket.title}
                  onChange={(e) => setCustomMarket({ ...customMarket, title: e.target.value })}
                  placeholder="Will Bitcoin reach $100,000 by March 2024?"
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-green-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Description (optional)
                </label>
                <textarea
                  value={customMarket.description}
                  onChange={(e) => setCustomMarket({ ...customMarket, description: e.target.value })}
                  placeholder="Add more details about how this market will be resolved..."
                  rows={3}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-green-500 focus:outline-none resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Category
                </label>
                <select
                  value={customMarket.category}
                  onChange={(e) => setCustomMarket({ ...customMarket, category: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-green-500 focus:outline-none"
                >
                  <option value="general">General</option>
                  <option value="crypto">Crypto</option>
                  <option value="sports">Sports</option>
                  <option value="technology">Technology</option>
                  <option value="politics">Politics</option>
                  <option value="entertainment">Entertainment</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Options (2-6)
                </label>
                <div className="space-y-2">
                  {customMarket.options.map((option, index) => (
                    <div key={index} className="flex gap-2">
                      <input
                        type="text"
                        value={option}
                        onChange={(e) => updateOption(index, e.target.value)}
                        placeholder={`Option ${index + 1}`}
                        className="flex-1 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-green-500 focus:outline-none"
                      />
                      {customMarket.options.length > 2 && (
                        <button
                          onClick={() => removeOption(index)}
                          className="px-3 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30"
                        >
                          &times;
                        </button>
                      )}
                    </div>
                  ))}
                  {customMarket.options.length < 6 && (
                    <button
                      onClick={addOption}
                      className="w-full px-4 py-2 border border-dashed border-gray-600 rounded-lg text-gray-400 hover:border-green-500 hover:text-green-400"
                    >
                      + Add Option
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Resolution Date & Time *
                </label>
                <input
                  type="datetime-local"
                  value={customMarket.eventDateTime}
                  onChange={(e) => setCustomMarket({ ...customMarket, eventDateTime: e.target.value })}
                  min={new Date().toISOString().slice(0, 16)}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-green-500 focus:outline-none"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Market will automatically close for trading when this time is reached
                </p>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowCustomModal(false)}
                className="flex-1 px-4 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={createCustomMarket}
                disabled={!customMarket.title.trim() || creatingCustom}
                className="flex-1 px-4 py-3 bg-green-500 text-black font-bold rounded-lg hover:bg-green-400 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {creatingCustom ? (
                  <>
                    <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Market"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
