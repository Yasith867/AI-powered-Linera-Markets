import { Link, useLocation } from "wouter";

interface HeaderProps {
  isConnected: boolean;
}

export default function Header({ isConnected }: HeaderProps) {
  const [location] = useLocation();

  const navItems = [
    { path: "/", label: "Dashboard" },
    { path: "/markets", label: "Markets" },
    { path: "/oracles", label: "Oracles" },
    { path: "/bots", label: "Bots" },
    { path: "/analytics", label: "Analytics" },
  ];

  return (
    <header className="bg-gray-900/80 backdrop-blur-md border-b border-gray-800 sticky top-0 z-40">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link href="/">
            <div className="flex items-center gap-3 cursor-pointer">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center">
                <span className="text-white font-bold text-lg">L</span>
              </div>
              <div>
                <h1 className="text-lg font-bold text-white">Linera Markets</h1>
                <p className="text-xs text-gray-400">AI-Powered Predictions</p>
              </div>
            </div>
          </Link>

          <nav className="flex items-center gap-1">
            {navItems.map((item) => (
              <Link key={item.path} href={item.path}>
                <button
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    location === item.path
                      ? "bg-green-500/20 text-green-400 border border-green-500/30"
                      : "text-gray-400 hover:text-white hover:bg-gray-800"
                  }`}
                >
                  {item.label}
                </button>
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div
                className={`w-2 h-2 rounded-full ${
                  isConnected ? "bg-green-500 animate-pulse" : "bg-red-500"
                }`}
              />
              <span className="text-xs text-gray-400">
                {isConnected ? "Live" : "Offline"}
              </span>
            </div>
            <div className="px-3 py-1 rounded-full bg-purple-500/20 border border-purple-500/30">
              <span className="text-xs font-mono text-purple-400">Testnet Conway</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
