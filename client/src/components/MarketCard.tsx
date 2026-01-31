import { Link } from "wouter";
import { useState, useEffect } from "react";

interface Market {
  id: number;
  title: string;
  category: string;
  options: string[];
  odds: number[];
  totalVolume: number;
  status: string;
  eventTime?: string;
}

interface MarketCardProps {
  market: Market;
  onDelete?: (id: number) => void;
}

const categoryColors: Record<string, string> = {
  crypto: "from-orange-500/20 to-amber-500/20 text-orange-400 border-orange-500/30",
  sports: "from-cyan-500/20 to-blue-500/20 text-cyan-400 border-cyan-500/30",
  technology: "from-purple-500/20 to-pink-500/20 text-purple-400 border-purple-500/30",
  politics: "from-red-500/20 to-rose-500/20 text-red-400 border-red-500/30",
  entertainment: "from-pink-500/20 to-fuchsia-500/20 text-pink-400 border-pink-500/30",
  general: "from-gray-500/20 to-slate-500/20 text-gray-400 border-gray-500/30",
};

function getCountdown(dateStr?: string): { text: string; isUrgent: boolean; isEnded: boolean } {
  if (!dateStr) return { text: "", isUrgent: false, isEnded: false };
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  
  if (diffMs <= 0) return { text: "Ended", isUrgent: false, isEnded: true };
  
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);
  
  const isUrgent = days === 0 && hours < 24;
  
  if (days > 0) {
    return { text: `${days}d ${hours}h`, isUrgent: false, isEnded: false };
  } else if (hours > 0) {
    return { text: `${hours}h ${minutes}m`, isUrgent, isEnded: false };
  } else if (minutes > 0) {
    return { text: `${minutes}m ${seconds}s`, isUrgent: true, isEnded: false };
  } else {
    return { text: `${seconds}s`, isUrgent: true, isEnded: false };
  }
}

export default function MarketCard({ market, onDelete }: MarketCardProps) {
  const categoryClass = categoryColors[market.category] || categoryColors.general;
  const [countdown, setCountdown] = useState(getCountdown(market.eventTime));

  useEffect(() => {
    if (!market.eventTime || market.status !== "active") return;
    const interval = setInterval(() => {
      setCountdown(getCountdown(market.eventTime));
    }, 1000);
    return () => clearInterval(interval);
  }, [market.eventTime, market.status]);

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onDelete && confirm(`Delete "${market.title}"?`)) {
      onDelete(market.id);
    }
  };

  return (
    <Link href={`/markets/${market.id}`}>
      <div className="card hover:border-green-500/40 transition-all duration-300 cursor-pointer group hover:shadow-[0_0_30px_rgba(0,255,136,0.1)] relative">
        {onDelete && (
          <button
            onClick={handleDelete}
            className="absolute top-2 right-2 w-6 h-6 rounded-full bg-red-500/20 text-red-400 hover:bg-red-500/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
            title="Delete market"
          >
            &times;
          </button>
        )}
        <div className="flex items-start justify-between mb-3">
          <span className={`text-xs px-2.5 py-1 rounded-full bg-gradient-to-r ${categoryClass} border font-semibold`}>
            {market.category}
          </span>
          <span
            className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
              market.status === "active"
                ? "bg-green-500/20 text-green-400 border border-green-500/30"
                : "bg-gray-500/20 text-gray-400 border border-gray-500/30"
            }`}
            style={market.status === "active" ? { boxShadow: '0 0 10px rgba(0, 255, 136, 0.3)' } : {}}
          >
            {market.status}
          </span>
        </div>

        <h3 className="font-semibold text-white group-hover:text-green-400 transition-colors line-clamp-2">
          {market.title}
        </h3>

        <div className="mt-4 space-y-2.5">
          {market.options.slice(0, 2).map((option, idx) => (
            <div key={idx} className="flex items-center justify-between">
              <span className="text-sm text-gray-300 truncate flex-1">{option}</span>
              <div className="flex items-center gap-2">
                <div className="w-20 h-2 bg-gray-800/80 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ 
                      width: `${(market.odds[idx] || 0) * 100}%`,
                      background: 'linear-gradient(90deg, #00ff88, #00aaff)',
                      boxShadow: '0 0 10px rgba(0, 255, 136, 0.5)',
                    }}
                  />
                </div>
                <span 
                  className="text-xs font-mono text-green-400 w-14 text-right"
                  style={{ textShadow: '0 0 5px rgba(0, 255, 136, 0.5)' }}
                >
                  {((market.odds[idx] || 0) * 100).toFixed(1)}%
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 pt-3 border-t border-gray-800/50 flex items-center justify-between text-xs">
          <div className="flex items-center gap-3">
            <span className="text-gray-500">
              Volume: <span className="text-cyan-400 font-mono">${market.totalVolume.toLocaleString()}</span>
            </span>
            {countdown.text && market.status === "active" && (
              <span className={`font-mono px-2 py-0.5 rounded ${
                countdown.isEnded 
                  ? "bg-gray-500/20 text-gray-400" 
                  : countdown.isUrgent 
                    ? "bg-red-500/20 text-red-400 animate-pulse" 
                    : "bg-yellow-500/20 text-yellow-400"
              }`}>
                {countdown.isEnded ? "Ended" : countdown.text}
              </span>
            )}
          </div>
          <span className="text-green-400 font-semibold flex items-center gap-1">
            Trade <span className="group-hover:translate-x-1 transition-transform inline-block">→</span>
          </span>
        </div>
      </div>
    </Link>
  );
}
