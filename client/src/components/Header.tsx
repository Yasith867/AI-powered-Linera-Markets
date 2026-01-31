import { Link, useLocation } from "wouter";
import { useState, useEffect } from "react";

interface HeaderProps {
  isConnected: boolean;
}

export default function Header({ isConnected }: HeaderProps) {
  const [location] = useLocation();
  const [serverOnline, setServerOnline] = useState(false);
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState("");

  useEffect(() => {
    checkServerStatus();
    const interval = setInterval(checkServerStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const checkServerStatus = async () => {
    try {
      const response = await fetch("/api/health", { 
        method: "GET",
        signal: AbortSignal.timeout(3000)
      });
      setServerOnline(response.ok);
    } catch {
      setServerOnline(false);
    }
  };

  const connectWallet = () => {
    const mockAddress = `linera1${Math.random().toString(36).slice(2, 10)}...${Math.random().toString(36).slice(2, 6)}`;
    setWalletAddress(mockAddress);
    setWalletConnected(true);
  };

  const disconnectWallet = () => {
    setWalletConnected(false);
    setWalletAddress("");
  };

  const navItems = [
    { path: "/", label: "Dashboard" },
    { path: "/markets", label: "Markets" },
    { path: "/oracles", label: "Oracles" },
    { path: "/bots", label: "Bots" },
    { path: "/analytics", label: "Analytics" },
  ];

  return (
    <header className="bg-gray-900/90 backdrop-blur-xl border-b border-cyan-500/20 sticky top-0 z-40">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link href="/">
            <div className="flex items-center gap-3 cursor-pointer group">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center relative overflow-hidden"
                   style={{
                     background: 'linear-gradient(135deg, #00ff88 0%, #00aaff 100%)',
                     boxShadow: '0 0 20px rgba(0, 255, 136, 0.5), 0 0 40px rgba(0, 255, 136, 0.3)'
                   }}>
                <span className="text-black font-black text-xl">L</span>
              </div>
              <div>
                <h1 className="text-lg font-bold neon-text-green group-hover:neon-flicker">
                  Linera Markets
                </h1>
                <p className="text-xs text-cyan-400/70">AI-Powered Predictions</p>
              </div>
            </div>
          </Link>

          <nav className="flex items-center gap-1">
            {navItems.map((item) => (
              <Link key={item.path} href={item.path}>
                <button
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-300 ${
                    location === item.path
                      ? "neon-border-green bg-green-500/10 text-green-400"
                      : "text-gray-400 hover:text-green-400 hover:bg-green-500/5 border border-transparent"
                  }`}
                >
                  {item.label}
                </button>
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 px-3 py-1.5 rounded-lg bg-gray-800/50 border border-gray-700/50">
              <div className="flex items-center gap-2">
                <div className={`w-2.5 h-2.5 rounded-full ${serverOnline ? 'status-online' : 'status-offline'}`} />
                <span className={`text-xs font-semibold ${serverOnline ? 'text-green-400' : 'text-red-400'}`}>
                  {serverOnline ? 'Live on Linera' : 'Offline'}
                </span>
              </div>
              {isConnected && (
                <>
                  <div className="w-px h-4 bg-gray-700" />
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                    <span className="text-xs text-cyan-400">WebSocket</span>
                  </div>
                </>
              )}
            </div>

            <div className="px-3 py-1.5 rounded-lg wallet-badge">
              <span className="text-xs font-mono text-purple-400">Testnet Conway</span>
            </div>

            {walletConnected ? (
              <button
                onClick={disconnectWallet}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-800/80 border border-green-500/30 hover:border-green-500/60 transition-all"
              >
                <div className="w-2 h-2 rounded-full bg-green-400" />
                <span className="text-xs font-mono text-green-400">{walletAddress}</span>
              </button>
            ) : (
              <button
                onClick={connectWallet}
                className="btn-neon-cyan text-sm"
              >
                Connect Wallet
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
