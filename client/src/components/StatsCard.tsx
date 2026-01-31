interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle: string;
  icon: string;
  color: "green" | "blue" | "purple" | "orange";
}

const colorConfig = {
  green: {
    gradient: "from-green-500/10 to-emerald-500/5",
    border: "border-green-500/30 hover:border-green-400/50",
    glow: "hover:shadow-[0_0_30px_rgba(0,255,136,0.15)]",
    text: "text-green-400",
  },
  blue: {
    gradient: "from-cyan-500/10 to-blue-500/5",
    border: "border-cyan-500/30 hover:border-cyan-400/50",
    glow: "hover:shadow-[0_0_30px_rgba(0,255,255,0.15)]",
    text: "text-cyan-400",
  },
  purple: {
    gradient: "from-purple-500/10 to-pink-500/5",
    border: "border-purple-500/30 hover:border-purple-400/50",
    glow: "hover:shadow-[0_0_30px_rgba(170,0,255,0.15)]",
    text: "text-purple-400",
  },
  orange: {
    gradient: "from-orange-500/10 to-amber-500/5",
    border: "border-orange-500/30 hover:border-orange-400/50",
    glow: "hover:shadow-[0_0_30px_rgba(255,165,0,0.15)]",
    text: "text-orange-400",
  },
};

export default function StatsCard({ title, value, subtitle, icon, color }: StatsCardProps) {
  const config = colorConfig[color];
  
  return (
    <div className={`card bg-gradient-to-br ${config.gradient} ${config.border} ${config.glow} transition-all duration-300 cursor-default`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-400 font-medium">{title}</p>
          <p className={`text-3xl font-black mt-2 ${config.text}`} style={{
            textShadow: color === 'green' ? '0 0 10px rgba(0, 255, 136, 0.5)' : 
                       color === 'blue' ? '0 0 10px rgba(0, 255, 255, 0.5)' :
                       color === 'purple' ? '0 0 10px rgba(170, 0, 255, 0.5)' :
                       '0 0 10px rgba(255, 165, 0, 0.5)'
          }}>{value}</p>
          <p className="text-xs text-gray-500 mt-2">{subtitle}</p>
        </div>
        <div className="text-4xl opacity-60 filter drop-shadow-lg">{icon}</div>
      </div>
    </div>
  );
}
