interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle: string;
  icon: string;
  color: "green" | "blue" | "purple" | "orange";
}

const colorClasses = {
  green: "from-green-500/20 to-emerald-500/10 border-green-800",
  blue: "from-blue-500/20 to-cyan-500/10 border-blue-800",
  purple: "from-purple-500/20 to-pink-500/10 border-purple-800",
  orange: "from-orange-500/20 to-amber-500/10 border-orange-800",
};

const textColors = {
  green: "text-green-400",
  blue: "text-blue-400",
  purple: "text-purple-400",
  orange: "text-orange-400",
};

export default function StatsCard({ title, value, subtitle, icon, color }: StatsCardProps) {
  return (
    <div className={`card bg-gradient-to-br ${colorClasses[color]}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-gray-400 text-sm">{title}</p>
          <p className={`text-3xl font-bold mt-1 ${textColors[color]}`}>{value}</p>
          <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
        </div>
        <div className="text-2xl">{icon}</div>
      </div>
    </div>
  );
}
