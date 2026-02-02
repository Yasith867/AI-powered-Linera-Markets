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
  const [generating, setGenerating] = useState(false);
  const getDefaultDateTime = () => {
    const date = new Date();
    date.setDate(date.getDate() + 7);
    return date.toISOString().slice(0, 16);
  };
  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "general",
    options: ["Yes", "No"],
    eventDateTime: getDefaultDateTime(),
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
    if (!form.title.trim()) return;
    setCreating(true);
    try {
      await api.post("/api/markets", {
        title: form.title,
        description: form.description || `Custom prediction market: ${form.title}`,
        category: form.category,
        options: form.options.filter(o => o.trim()),
        eventTime: new Date(form.eventDateTime).toISOString(),
      });
      setShowCreate(false);
      setForm({ title: "", description: "", category: "general", options: ["Yes", "No"], eventDateTime: getDefaultDateTime() });
      await fetchMarkets();
    } finally {
      setCreating(false);
    }
  };

  const generateAIMarket = async (category: string) => {
    setGenerating(true);
    try {
      await api.post("/api/ai-generate", { category });
      await fetchMarkets();
    } finally {
      setGenerating(false);
    }
  };

  const addOption = () => {
    if (form.options.length < 6) {
      setForm({ ...form, options: [...form.options, ""] });
    }
  };

  const updateOption = (idx: number, value: string) => {
    const newOptions = [...form.options];
    newOptions[idx] = value;
    setForm({ ...form, options: newOptions });
  };

  const removeOption = (idx: number) => {
    if (form.options.length > 2) {
      const newOptions = form.options.filter((_, i) => i !== idx);
      setForm({ ...form, options: newOptions });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Prediction Markets</h1>
          <p className="text-gray-400 mt-1">Trade on real-world outcomes</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setShowCreate(true)}
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
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="card max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Create Custom Market</h2>
              <button
                onClick={() => setShowCreate(false)}
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
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Will Bitcoin reach $100,000 by March 2024?"
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-green-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Description (optional)
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
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
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
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
                  {form.options.map((option, index) => (
                    <div key={index} className="flex gap-2">
                      <input
                        type="text"
                        value={option}
                        onChange={(e) => updateOption(index, e.target.value)}
                        placeholder={`Option ${index + 1}`}
                        className="flex-1 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-green-500 focus:outline-none"
                      />
                      {form.options.length > 2 && (
                        <button
                          onClick={() => removeOption(index)}
                          className="px-3 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30"
                        >
                          &times;
                        </button>
                      )}
                    </div>
                  ))}
                  {form.options.length < 6 && (
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
                  value={form.eventDateTime}
                  onChange={(e) => setForm({ ...form, eventDateTime: e.target.value })}
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
                onClick={() => setShowCreate(false)}
                className="flex-1 px-4 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={createMarket}
                disabled={!form.title.trim() || creating}
                className="flex-1 px-4 py-3 bg-green-500 text-black font-bold rounded-lg hover:bg-green-400 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {creating ? (
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredMarkets.map((market) => (
          <MarketCard key={market.id} market={market} onDelete={deleteMarket} />
        ))}
      </div>

      {filteredMarkets.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-400">No markets found. Create one using the buttons above!</p>
        </div>
      )}
    </div>
  );
}
