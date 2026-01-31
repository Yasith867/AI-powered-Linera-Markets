import { useEffect, useState } from "react";
import { useRoute } from "wouter";
import { useApi } from "../hooks/useApi";

interface Trade {
  id: number;
  traderAddress: string;
  optionIndex: number;
  amount: number;
  price: number;
  isBuy: boolean;
  createdAt: string;
}

interface Market {
  id: number;
  title: string;
  description: string;
  category: string;
  options: string[];
  odds: number[];
  totalVolume: number;
  liquidity: number;
  status: string;
  trades: Trade[];
}

export default function MarketDetail() {
  const [, params] = useRoute("/markets/:id");
  const [market, setMarket] = useState<Market | null>(null);
  const [trading, setTrading] = useState(false);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [amount, setAmount] = useState("");
  const api = useApi();

  useEffect(() => {
    if (params?.id) {
      fetchMarket();
    }
  }, [params?.id]);

  const fetchMarket = async () => {
    const data = await api.get(`/api/markets/${params?.id}`);
    if (data) setMarket(data as Market);
  };

  const executeTrade = async (isBuy: boolean) => {
    if (selectedOption === null || !amount) return;
    setTrading(true);
    try {
      await api.post(`/api/markets/${params?.id}/trade`, {
        traderAddress: `user_${Math.random().toString(36).slice(2, 8)}`,
        optionIndex: selectedOption,
        amount: parseFloat(amount),
        isBuy,
      });
      await fetchMarket();
      setAmount("");
      setSelectedOption(null);
    } finally {
      setTrading(false);
    }
  };

  if (!market) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="card">
        <div className="flex items-start justify-between mb-4">
          <div>
            <span className="text-xs px-2 py-1 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
              {market.category}
            </span>
            <h1 className="text-2xl font-bold text-white mt-2">{market.title}</h1>
            <p className="text-gray-400 mt-1">{market.description}</p>
          </div>
          <span
            className={`px-3 py-1 rounded-full text-sm ${
              market.status === "active"
                ? "bg-green-500/20 text-green-400"
                : "bg-gray-500/20 text-gray-400"
            }`}
          >
            {market.status}
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <div className="bg-gray-800/50 rounded-lg p-4">
            <p className="text-xs text-gray-400">Total Volume</p>
            <p className="text-xl font-bold text-white">${market.totalVolume.toLocaleString()}</p>
          </div>
          <div className="bg-gray-800/50 rounded-lg p-4">
            <p className="text-xs text-gray-400">Liquidity</p>
            <p className="text-xl font-bold text-white">${market.liquidity.toLocaleString()}</p>
          </div>
          <div className="bg-gray-800/50 rounded-lg p-4">
            <p className="text-xs text-gray-400">Total Trades</p>
            <p className="text-xl font-bold text-white">{market.trades?.length || 0}</p>
          </div>
          <div className="bg-gray-800/50 rounded-lg p-4">
            <p className="text-xs text-gray-400">Options</p>
            <p className="text-xl font-bold text-white">{market.options.length}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-xl font-semibold text-white">Trading Options</h2>
          {market.options.map((option, idx) => (
            <div
              key={idx}
              onClick={() => setSelectedOption(idx)}
              className={`card cursor-pointer transition-all ${
                selectedOption === idx
                  ? "border-green-500 bg-green-500/10"
                  : "hover:border-gray-700"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      selectedOption === idx
                        ? "bg-green-500 text-white"
                        : "bg-gray-800 text-gray-400"
                    }`}
                  >
                    {idx + 1}
                  </div>
                  <span className="font-medium text-white">{option}</span>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-green-400">
                    {((market.odds[idx] || 0) * 100).toFixed(1)}%
                  </p>
                  <p className="text-xs text-gray-400">implied probability</p>
                </div>
              </div>
              <div className="mt-3 h-2 bg-gray-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-green-500 to-emerald-400 transition-all"
                  style={{ width: `${(market.odds[idx] || 0) * 100}%` }}
                />
              </div>
            </div>
          ))}

          {market.status === "active" && selectedOption !== null && (
            <div className="card bg-gray-800/30">
              <h3 className="font-medium text-white mb-3">Place Trade</h3>
              <div className="flex gap-3">
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Amount"
                  className="input flex-1"
                />
                <button
                  onClick={() => executeTrade(true)}
                  disabled={trading || !amount}
                  className="btn-primary px-6"
                >
                  {trading ? "..." : "Buy"}
                </button>
                <button
                  onClick={() => executeTrade(false)}
                  disabled={trading || !amount}
                  className="btn-secondary px-6"
                >
                  {trading ? "..." : "Sell"}
                </button>
              </div>
            </div>
          )}
        </div>

        <div>
          <h2 className="text-xl font-semibold text-white mb-4">Recent Trades</h2>
          <div className="card max-h-96 overflow-y-auto scrollbar-thin">
            {market.trades?.length ? (
              <div className="space-y-3">
                {market.trades.slice(0, 20).map((trade) => (
                  <div key={trade.id} className="flex items-center justify-between py-2 border-b border-gray-800 last:border-0">
                    <div>
                      <p className="text-sm font-mono text-gray-400">
                        {trade.traderAddress.slice(0, 12)}...
                      </p>
                      <p className="text-xs text-gray-500">
                        {trade.isBuy ? "Bought" : "Sold"} {market.options[trade.optionIndex]}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={`font-medium ${trade.isBuy ? "text-green-400" : "text-red-400"}`}>
                        ${trade.amount.toFixed(2)}
                      </p>
                      <p className="text-xs text-gray-500">
                        @ {(trade.price * 100).toFixed(1)}%
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-400 text-center py-4">No trades yet</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
