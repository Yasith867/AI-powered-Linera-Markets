import { useEffect, useState } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

interface VolumeData {
  date: string;
  volume: number;
  trades: number;
}

interface CategoryData {
  category: string;
  count: number;
  volume: number;
}

interface TopMarket {
  id: number;
  title: string;
  totalVolume: number;
  category: string;
}

interface Event {
  id: number;
  eventType: string;
  data: Record<string, unknown>;
  createdAt: string;
}

const COLORS = ["#22c55e", "#0088ff", "#8844ff", "#f97316", "#ec4899", "#14b8a6"];

export default function Analytics() {
  const [volumeHistory, setVolumeHistory] = useState<VolumeData[]>([]);
  const [categories, setCategories] = useState<CategoryData[]>([]);
  const [topMarkets, setTopMarkets] = useState<TopMarket[]>([]);
  const [recentEvents, setRecentEvents] = useState<Event[]>([]);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    const [volume, cats, top, events] = await Promise.all([
      fetch("/api/analytics/volume-history").then((r) => r.json()),
      fetch("/api/analytics/category-breakdown").then((r) => r.json()),
      fetch("/api/analytics/top-markets").then((r) => r.json()),
      fetch("/api/analytics/recent-events").then((r) => r.json()),
    ]);
    setVolumeHistory(volume);
    setCategories(cats);
    setTopMarkets(top);
    setRecentEvents(events);
  };

  const eventTypeLabels: Record<string, string> = {
    market_created: "Market Created",
    ai_market_created: "AI Market Created",
    trade: "Trade Executed",
    oracle_vote: "Oracle Vote",
    market_resolved: "Market Resolved",
    bot_executed: "Bot Execution",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Analytics</h1>
        <p className="text-gray-400 mt-1">Market performance and activity insights</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="text-lg font-semibold text-white mb-4">Volume History</h2>
          <div className="h-64">
            {volumeHistory.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={volumeHistory}>
                  <defs>
                    <linearGradient id="volumeGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" stroke="#6b7280" fontSize={12} />
                  <YAxis stroke="#6b7280" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1f2937",
                      border: "1px solid #374151",
                      borderRadius: "8px",
                    }}
                    labelStyle={{ color: "#fff" }}
                  />
                  <Area
                    type="monotone"
                    dataKey="volume"
                    stroke="#22c55e"
                    strokeWidth={2}
                    fill="url(#volumeGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400">
                No volume data yet
              </div>
            )}
          </div>
        </div>

        <div className="card">
          <h2 className="text-lg font-semibold text-white mb-4">Category Breakdown</h2>
          <div className="h-64">
            {categories.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categories}
                    dataKey="count"
                    nameKey="category"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ category, percent }) =>
                      `${category} ${(percent * 100).toFixed(0)}%`
                    }
                    labelLine={{ stroke: "#6b7280" }}
                  >
                    {categories.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1f2937",
                      border: "1px solid #374151",
                      borderRadius: "8px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400">
                No category data yet
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="text-lg font-semibold text-white mb-4">Top Markets by Volume</h2>
          <div className="space-y-3">
            {topMarkets.length > 0 ? (
              topMarkets.slice(0, 5).map((market, idx) => (
                <div key={market.id} className="flex items-center gap-3">
                  <span className="text-lg font-bold text-gray-500 w-6">{idx + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-white truncate">{market.title}</p>
                    <p className="text-xs text-gray-400">{market.category}</p>
                  </div>
                  <p className="font-mono text-green-400">${market.totalVolume.toLocaleString()}</p>
                </div>
              ))
            ) : (
              <p className="text-gray-400 text-center py-4">No markets yet</p>
            )}
          </div>
        </div>

        <div className="card">
          <h2 className="text-lg font-semibold text-white mb-4">Recent Activity</h2>
          <div className="space-y-3 max-h-64 overflow-y-auto scrollbar-thin">
            {recentEvents.length > 0 ? (
              recentEvents.slice(0, 10).map((event) => (
                <div key={event.id} className="flex items-center gap-3 py-2 border-b border-gray-800 last:border-0">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      event.eventType.includes("created")
                        ? "bg-green-500"
                        : event.eventType.includes("trade")
                        ? "bg-blue-500"
                        : event.eventType.includes("resolved")
                        ? "bg-purple-500"
                        : "bg-gray-500"
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white">
                      {eventTypeLabels[event.eventType] || event.eventType}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(event.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-400 text-center py-4">No activity yet</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
