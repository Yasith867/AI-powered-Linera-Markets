import { useEffect, useState } from "react";
import { useApi } from "../hooks/useApi";
import MarketCard from "../components/MarketCard";

interface Market {
  id: number;
  title: string;
  category: string;
  options: string[];
  odds: number[];
  totalVolume: number;
  status: string;
}

export default function Markets() {
  const [markets, setMarkets] = useState<Market[]>([]);
  const [filter, setFilter] = useState("all");
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "general",
    options: ["Yes", "No"],
  });
  const api = useApi();

  useEffect(() => {
    fetchMarkets();
  }, []);

  const fetchMarkets = async () => {
    const data = await api.get("/api/markets");
    if (data) setMarkets(data as Market[]);
  };

  const filteredMarkets = markets.filter((m) => 
    filter === "all" ? true : m.status === filter
  );

  const deleteMarket = async (id: number) => {
    await api.del(`/api/markets/${id}`);
    setMarkets(markets.filter(m => m.id !== id));
  };

  const createMarket = async () => {
    setCreating(true);
    try {
      await api.post("/api/markets", form);
      setShowCreate(false);
      setForm({ title: "", description: "", category: "general", options: ["Yes", "No"] });
      await fetchMarkets();
    } finally {
      setCreating(false);
    }
  };

  const addOption = () => {
    setForm({ ...form, options: [...form.options, ""] });
  };

  const updateOption = (idx: number, value: string) => {
    const newOptions = [...form.options];
    newOptions[idx] = value;
    setForm({ ...form, options: newOptions });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Prediction Markets</h1>
          <p className="text-gray-400 mt-1">Trade on real-world outcomes</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary">
          + Create Market
        </button>
      </div>

      <div className="flex gap-2">
        {["all", "active", "resolved"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm capitalize ${
              filter === f
                ? "bg-green-500/20 text-green-400 border border-green-500/30"
                : "bg-gray-800 text-gray-400 hover:text-white"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="card max-w-lg w-full mx-4">
            <h2 className="text-xl font-bold text-white mb-4">Create Market</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Question</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Will X happen by Y date?"
                  className="input w-full"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Additional context..."
                  className="input w-full h-20 resize-none"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Category</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="input w-full"
                >
                  <option value="crypto">Crypto</option>
                  <option value="sports">Sports</option>
                  <option value="technology">Technology</option>
                  <option value="politics">Politics</option>
                  <option value="entertainment">Entertainment</option>
                  <option value="general">General</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Options</label>
                <div className="space-y-2">
                  {form.options.map((opt, idx) => (
                    <input
                      key={idx}
                      type="text"
                      value={opt}
                      onChange={(e) => updateOption(idx, e.target.value)}
                      placeholder={`Option ${idx + 1}`}
                      className="input w-full"
                    />
                  ))}
                  <button onClick={addOption} className="text-sm text-green-400 hover:text-green-300">
                    + Add option
                  </button>
                </div>
              </div>
              <div className="flex gap-2 pt-4">
                <button onClick={() => setShowCreate(false)} className="btn-secondary flex-1">
                  Cancel
                </button>
                <button onClick={createMarket} disabled={creating} className="btn-primary flex-1">
                  {creating ? "Creating..." : "Create Market"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredMarkets.map((market) => (
          <MarketCard key={market.id} market={market} onDelete={deleteMarket} />
        ))}
      </div>

      {filteredMarkets.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-400">No markets found</p>
        </div>
      )}
    </div>
  );
}
