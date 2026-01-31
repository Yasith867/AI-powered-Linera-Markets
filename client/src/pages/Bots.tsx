import { useEffect, useState } from "react";
import { useApi } from "../hooks/useApi";

interface Bot {
  id: number;
  name: string;
  ownerAddress: string;
  strategy: string;
  totalTrades: number;
  profitLoss: number;
  isActive: boolean;
  lineraChainId: string | null;
}

export default function Bots() {
  const [bots, setBots] = useState<Bot[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [executing, setExecuting] = useState<number | null>(null);
  const [form, setForm] = useState({ name: "", strategy: "momentum" });
  const api = useApi();

  useEffect(() => {
    fetchBots();
  }, []);

  const fetchBots = async () => {
    const data = await api.get("/api/bots");
    if (data) setBots(data as Bot[]);
  };

  const createBot = async () => {
    setCreating(true);
    try {
      await api.post("/api/bots", {
        ...form,
        ownerAddress: `user_${Math.random().toString(36).slice(2, 8)}`,
        lineraChainId: `chain_${Math.random().toString(36).slice(2, 10)}`,
        config: { tradeSize: 10 },
      });
      setShowCreate(false);
      setForm({ name: "", strategy: "momentum" });
      await fetchBots();
    } finally {
      setCreating(false);
    }
  };

  const executeBot = async (botId: number) => {
    setExecuting(botId);
    try {
      await api.post(`/api/bots/${botId}/execute`, {});
      await fetchBots();
    } finally {
      setExecuting(null);
    }
  };

  const toggleBot = async (botId: number) => {
    await api.patch(`/api/bots/${botId}/toggle`);
    await fetchBots();
  };

  const strategyIcons: Record<string, string> = {
    momentum: "📈",
    contrarian: "🔄",
    arbitrage: "⚖️",
  };

  const strategyDescriptions: Record<string, string> = {
    momentum: "Follows market trends, buys when odds are rising",
    contrarian: "Bets against the crowd, buys undervalued options",
    arbitrage: "Exploits pricing inefficiencies across markets",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Trading Bots</h1>
          <p className="text-gray-400 mt-1">Automated trading agents on dedicated microchains</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary">
          + Deploy Bot
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card bg-gradient-to-br from-orange-500/20 to-amber-500/10 border-orange-800">
          <p className="text-gray-400 text-sm">Active Bots</p>
          <p className="text-3xl font-bold text-orange-400">
            {bots.filter((b) => b.isActive).length}
          </p>
        </div>
        <div className="card bg-gradient-to-br from-green-500/20 to-emerald-500/10 border-green-800">
          <p className="text-gray-400 text-sm">Total Trades</p>
          <p className="text-3xl font-bold text-green-400">
            {bots.reduce((sum, b) => sum + b.totalTrades, 0)}
          </p>
        </div>
        <div className="card bg-gradient-to-br from-blue-500/20 to-cyan-500/10 border-blue-800">
          <p className="text-gray-400 text-sm">Total P&L</p>
          <p className={`text-3xl font-bold ${bots.reduce((sum, b) => sum + b.profitLoss, 0) >= 0 ? "text-green-400" : "text-red-400"}`}>
            ${bots.reduce((sum, b) => sum + b.profitLoss, 0).toFixed(2)}
          </p>
        </div>
      </div>

      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="card max-w-md w-full mx-4">
            <h2 className="text-xl font-bold text-white mb-4">Deploy Trading Bot</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Bot Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g., Alpha Trader"
                  className="input w-full"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Strategy</label>
                <div className="space-y-2">
                  {["momentum", "contrarian", "arbitrage"].map((strategy) => (
                    <button
                      key={strategy}
                      onClick={() => setForm({ ...form, strategy })}
                      className={`w-full p-3 rounded-lg text-left transition-all ${
                        form.strategy === strategy
                          ? "bg-green-500/20 border border-green-500/50"
                          : "bg-gray-800 border border-gray-700 hover:border-gray-600"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xl">{strategyIcons[strategy]}</span>
                        <div>
                          <p className="font-medium text-white capitalize">{strategy}</p>
                          <p className="text-xs text-gray-400">{strategyDescriptions[strategy]}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2 pt-4">
                <button onClick={() => setShowCreate(false)} className="btn-secondary flex-1">
                  Cancel
                </button>
                <button onClick={createBot} disabled={creating} className="btn-primary flex-1">
                  {creating ? "Deploying..." : "Deploy Bot"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {bots.map((bot) => (
          <div key={bot.id} className="card">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-orange-500/20 flex items-center justify-center">
                  <span className="text-2xl">{strategyIcons[bot.strategy] || "🤖"}</span>
                </div>
                <div>
                  <h3 className="font-semibold text-white">{bot.name}</h3>
                  <p className="text-sm text-gray-400 capitalize">{bot.strategy} Strategy</p>
                  {bot.lineraChainId && (
                    <p className="text-xs font-mono text-orange-400 mt-1">
                      Chain: {bot.lineraChainId}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <p className="text-xl font-bold text-blue-400">{bot.totalTrades}</p>
                  <p className="text-xs text-gray-400">Trades</p>
                </div>
                <div className="text-center">
                  <p className={`text-xl font-bold ${bot.profitLoss >= 0 ? "text-green-400" : "text-red-400"}`}>
                    ${bot.profitLoss.toFixed(2)}
                  </p>
                  <p className="text-xs text-gray-400">P&L</p>
                </div>
                <button
                  onClick={() => executeBot(bot.id)}
                  disabled={executing === bot.id || !bot.isActive}
                  className="btn-primary px-4"
                >
                  {executing === bot.id ? "Running..." : "Execute"}
                </button>
                <button
                  onClick={() => toggleBot(bot.id)}
                  className={`px-4 py-2 rounded-lg text-sm ${
                    bot.isActive
                      ? "bg-green-500/20 text-green-400 hover:bg-green-500/30"
                      : "bg-gray-500/20 text-gray-400 hover:bg-gray-500/30"
                  }`}
                >
                  {bot.isActive ? "Active" : "Paused"}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {bots.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-400">No trading bots deployed yet</p>
          <button onClick={() => setShowCreate(true)} className="btn-primary mt-4">
            Deploy First Bot
          </button>
        </div>
      )}
    </div>
  );
}
