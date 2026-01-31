import { useEffect, useState } from "react";
import { useApi } from "../hooks/useApi";

interface Oracle {
  id: number;
  name: string;
  dataSource: string;
  accuracy: number;
  totalVotes: number;
  isActive: boolean;
  lineraChainId: string | null;
}

interface Market {
  id: number;
  title: string;
  options: string[];
  status: string;
}

interface OracleVote {
  vote: { oracleId: number; marketId: number; vote: number };
  oracle: { name: string };
}

export default function Oracles() {
  const [oracles, setOracles] = useState<Oracle[]>([]);
  const [markets, setMarkets] = useState<Market[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [showVote, setShowVote] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const [voting, setVoting] = useState(false);
  const [form, setForm] = useState({ name: "", dataSource: "" });
  const [voteForm, setVoteForm] = useState({ marketId: 0, vote: 0, confidence: 100 });
  const [marketVotes, setMarketVotes] = useState<Record<number, OracleVote[]>>({});
  const api = useApi();

  useEffect(() => {
    fetchOracles();
    fetchMarkets();
  }, []);

  const fetchOracles = async () => {
    const data = await api.get("/api/oracles");
    if (data) setOracles(data as Oracle[]);
  };

  const fetchMarkets = async () => {
    const data = await api.get("/api/markets");
    if (data) {
      const activeMarkets = (data as Market[]).filter(m => m.status === "active");
      setMarkets(activeMarkets);
      // Fetch votes for each market
      for (const market of activeMarkets) {
        const votes = await api.get(`/api/oracles/votes/${market.id}`);
        if (votes) {
          setMarketVotes(prev => ({ ...prev, [market.id]: votes as OracleVote[] }));
        }
      }
    }
  };

  const submitVote = async (oracleId: number) => {
    if (!voteForm.marketId) return;
    setVoting(true);
    try {
      await api.post(`/api/oracles/${oracleId}/vote`, {
        marketId: voteForm.marketId,
        vote: voteForm.vote,
        confidence: voteForm.confidence,
        dataHash: `hash_${Date.now()}`,
      });
      setShowVote(null);
      setVoteForm({ marketId: 0, vote: 0, confidence: 100 });
      await fetchOracles();
      await fetchMarkets();
    } finally {
      setVoting(false);
    }
  };

  const createOracle = async () => {
    setCreating(true);
    try {
      await api.post("/api/oracles", {
        ...form,
        lineraChainId: `chain_${Math.random().toString(36).slice(2, 10)}`,
      });
      setShowCreate(false);
      setForm({ name: "", dataSource: "" });
      await fetchOracles();
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Oracle Network</h1>
          <p className="text-gray-400 mt-1">Decentralized data verification with consensus</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary">
          + Add Oracle Node
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card bg-gradient-to-br from-purple-500/20 to-pink-500/10 border-purple-800">
          <p className="text-gray-400 text-sm">Active Oracles</p>
          <p className="text-3xl font-bold text-purple-400">
            {oracles.filter((o) => o.isActive).length}
          </p>
        </div>
        <div className="card bg-gradient-to-br from-blue-500/20 to-cyan-500/10 border-blue-800">
          <p className="text-gray-400 text-sm">Total Votes</p>
          <p className="text-3xl font-bold text-blue-400">
            {oracles.reduce((sum, o) => sum + o.totalVotes, 0)}
          </p>
        </div>
        <div className="card bg-gradient-to-br from-green-500/20 to-emerald-500/10 border-green-800">
          <p className="text-gray-400 text-sm">Consensus Required</p>
          <p className="text-3xl font-bold text-green-400">67%</p>
        </div>
      </div>

      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="card max-w-md w-full mx-4">
            <h2 className="text-xl font-bold text-white mb-4">Add Oracle Node</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Oracle Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g., Sports Data Oracle"
                  className="input w-full"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Data Source</label>
                <select
                  value={form.dataSource}
                  onChange={(e) => setForm({ ...form, dataSource: e.target.value })}
                  className="input w-full"
                >
                  <option value="">Select source...</option>
                  <option value="espn_api">ESPN Sports API</option>
                  <option value="coingecko">CoinGecko Crypto</option>
                  <option value="newsapi">News API</option>
                  <option value="ai_gpt">AI Analysis (GPT)</option>
                  <option value="custom">Custom Source</option>
                </select>
              </div>
              <div className="flex gap-2 pt-4">
                <button onClick={() => setShowCreate(false)} className="btn-secondary flex-1">
                  Cancel
                </button>
                <button onClick={createOracle} disabled={creating} className="btn-primary flex-1">
                  {creating ? "Creating..." : "Add Oracle"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {oracles.map((oracle) => (
          <div key={oracle.id} className="card">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
                  <span className="text-2xl">🔮</span>
                </div>
                <div>
                  <h3 className="font-semibold text-white">{oracle.name}</h3>
                  <p className="text-sm text-gray-400">{oracle.dataSource}</p>
                  {oracle.lineraChainId && (
                    <p className="text-xs font-mono text-purple-400 mt-1">
                      Chain: {oracle.lineraChainId}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <p className="text-xl font-bold text-green-400">{oracle.accuracy.toFixed(1)}%</p>
                  <p className="text-xs text-gray-400">Accuracy</p>
                </div>
                <div className="text-center">
                  <p className="text-xl font-bold text-blue-400">{oracle.totalVotes}</p>
                  <p className="text-xs text-gray-400">Votes</p>
                </div>
                {markets.length > 0 && oracle.isActive && (
                  <button
                    onClick={() => setShowVote(oracle.id)}
                    className="px-4 py-2 rounded-lg bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 text-sm font-medium"
                  >
                    Cast Vote
                  </button>
                )}
                <div
                  className={`px-3 py-1 rounded-full text-sm ${
                    oracle.isActive
                      ? "bg-green-500/20 text-green-400"
                      : "bg-gray-500/20 text-gray-400"
                  }`}
                >
                  {oracle.isActive ? "Active" : "Inactive"}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {oracles.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-400">No oracles configured yet</p>
          <button onClick={() => setShowCreate(true)} className="btn-primary mt-4">
            Add First Oracle
          </button>
        </div>
      )}

      {/* Markets Pending Verification */}
      {markets.length > 0 && oracles.length > 0 && (
        <div className="mt-8">
          <h2 className="text-xl font-bold text-white mb-4">Markets Awaiting Verification</h2>
          <div className="space-y-4">
            {markets.map((market) => {
              const votes = marketVotes[market.id] || [];
              const votePercentage = oracles.length > 0 
                ? Math.round((votes.length / oracles.length) * 100) 
                : 0;
              
              return (
                <div key={market.id} className="card">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-white">{market.title}</h3>
                      <p className="text-sm text-gray-400">
                        Options: {market.options.join(" vs ")}
                      </p>
                      <div className="flex items-center gap-4 mt-2">
                        <span className="text-xs text-purple-400">
                          {votes.length}/{oracles.length} votes ({votePercentage}%)
                        </span>
                        {votePercentage >= 67 && (
                          <span className="text-xs px-2 py-0.5 rounded bg-green-500/20 text-green-400">
                            Consensus Reached
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {votes.length > 0 && (
                        <div className="text-xs text-gray-400 mr-4">
                          Voted: {votes.map(v => v.oracle.name).join(", ")}
                        </div>
                      )}
                    </div>
                  </div>
                  {/* Progress bar */}
                  <div className="mt-3 h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all ${votePercentage >= 67 ? 'bg-green-500' : 'bg-purple-500'}`}
                      style={{ width: `${votePercentage}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>0%</span>
                    <span className="text-amber-400">67% consensus</span>
                    <span>100%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Vote Modal */}
      {showVote !== null && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="card max-w-md w-full mx-4">
            <h2 className="text-xl font-bold text-white mb-4">Submit Oracle Vote</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Select Market</label>
                <select
                  value={voteForm.marketId}
                  onChange={(e) => setVoteForm({ ...voteForm, marketId: parseInt(e.target.value) })}
                  className="input w-full"
                >
                  <option value={0}>Select a market...</option>
                  {markets.map((m) => (
                    <option key={m.id} value={m.id}>{m.title}</option>
                  ))}
                </select>
              </div>
              {voteForm.marketId > 0 && (
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Vote Outcome</label>
                  <div className="space-y-2">
                    {markets.find(m => m.id === voteForm.marketId)?.options.map((option, idx) => (
                      <button
                        key={idx}
                        onClick={() => setVoteForm({ ...voteForm, vote: idx })}
                        className={`w-full p-3 rounded-lg text-left ${
                          voteForm.vote === idx
                            ? "bg-purple-500/20 border border-purple-500/50"
                            : "bg-gray-800 border border-gray-700"
                        }`}
                      >
                        <span className="text-white">{option}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  Confidence: {voteForm.confidence}%
                </label>
                <input
                  type="range"
                  min="50"
                  max="100"
                  value={voteForm.confidence}
                  onChange={(e) => setVoteForm({ ...voteForm, confidence: parseInt(e.target.value) })}
                  className="w-full"
                />
              </div>
              <div className="flex gap-2 pt-4">
                <button onClick={() => setShowVote(null)} className="btn-secondary flex-1">
                  Cancel
                </button>
                <button 
                  onClick={() => submitVote(showVote)} 
                  disabled={voting || !voteForm.marketId}
                  className="btn-primary flex-1"
                >
                  {voting ? "Submitting..." : "Submit Vote"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
