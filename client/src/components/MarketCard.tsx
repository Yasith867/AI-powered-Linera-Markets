import { Link } from "wouter";

interface Market {
  id: number;
  title: string;
  category: string;
  options: string[];
  odds: number[];
  totalVolume: number;
  status: string;
}

interface MarketCardProps {
  market: Market;
}

const categoryColors: Record<string, string> = {
  crypto: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  sports: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  technology: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  politics: "bg-red-500/20 text-red-400 border-red-500/30",
  entertainment: "bg-pink-500/20 text-pink-400 border-pink-500/30",
  general: "bg-gray-500/20 text-gray-400 border-gray-500/30",
};

export default function MarketCard({ market }: MarketCardProps) {
  const categoryClass = categoryColors[market.category] || categoryColors.general;

  return (
    <Link href={`/markets/${market.id}`}>
      <div className="card hover:border-green-500/50 transition-all cursor-pointer group">
        <div className="flex items-start justify-between mb-3">
          <span className={`text-xs px-2 py-1 rounded-full border ${categoryClass}`}>
            {market.category}
          </span>
          <span
            className={`text-xs px-2 py-1 rounded-full ${
              market.status === "active"
                ? "bg-green-500/20 text-green-400"
                : "bg-gray-500/20 text-gray-400"
            }`}
          >
            {market.status}
          </span>
        </div>

        <h3 className="font-semibold text-white group-hover:text-green-400 transition-colors line-clamp-2">
          {market.title}
        </h3>

        <div className="mt-4 space-y-2">
          {market.options.slice(0, 3).map((option, idx) => (
            <div key={idx} className="flex items-center justify-between">
              <span className="text-sm text-gray-400 truncate flex-1">{option}</span>
              <div className="flex items-center gap-2">
                <div className="w-16 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-green-500 to-emerald-400 rounded-full"
                    style={{ width: `${(market.odds[idx] || 0) * 100}%` }}
                  />
                </div>
                <span className="text-xs font-mono text-green-400 w-12 text-right">
                  {((market.odds[idx] || 0) * 100).toFixed(1)}%
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 pt-3 border-t border-gray-800 flex items-center justify-between text-xs text-gray-500">
          <span>Volume: ${market.totalVolume.toLocaleString()}</span>
          <span className="text-green-400 group-hover:translate-x-1 transition-transform">
            Trade →
          </span>
        </div>
      </div>
    </Link>
  );
}
