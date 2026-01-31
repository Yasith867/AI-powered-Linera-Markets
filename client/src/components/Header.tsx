import { Link, useLocation } from "wouter";
import { useState, useEffect } from "react";
import { 
  detectLineraWallet, 
  connectLineraWallet, 
  disconnectLineraWallet,
  subscribeToWalletEvents,
  generateMockAddress,
  shortenAddress,
  CHECKO_INSTALL_URL,
  LINERA_DOCS_URL,
  WALLET_STATUS
} from "../lib/linera-wallet";

interface HeaderProps {
  isConnected: boolean;
}

export default function Header({ isConnected }: HeaderProps) {
  const [location] = useLocation();
  const [serverOnline, setServerOnline] = useState(false);
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState("");
  const [walletInstalled, setWalletInstalled] = useState(false);
  const [walletType, setWalletType] = useState<string | null>(null);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [useMockWallet, setUseMockWallet] = useState(false);
  const [walletError, setWalletError] = useState("");

  useEffect(() => {
    checkServerStatus();
    const interval = setInterval(checkServerStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const { installed, type } = detectLineraWallet();
    setWalletInstalled(installed);
    setWalletType(type);

    if (installed) {
      const unsubscribe = subscribeToWalletEvents(
        (accounts) => {
          if (accounts.length === 0) {
            setWalletConnected(false);
            setWalletAddress("");
          } else {
            setWalletAddress(accounts[0]);
          }
        },
        () => {},
        () => {
          setWalletConnected(false);
          setWalletAddress("");
        }
      );
      return unsubscribe;
    }
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

  const handleConnectClick = () => {
    setShowWalletModal(true);
    setWalletError("");
  };

  const connectRealWallet = async () => {
    if (!walletInstalled) {
      setWalletError("No Linera wallet detected. Install CheCko or use Demo Mode.");
      return;
    }
    
    setConnecting(true);
    setWalletError("");
    
    try {
      const result = await connectLineraWallet();
      
      if (result.success && result.address) {
        setWalletAddress(result.address);
        setWalletConnected(true);
        setUseMockWallet(false);
        setShowWalletModal(false);
      } else {
        setWalletError(result.error || "Failed to connect. Try Demo Mode instead.");
      }
    } catch {
      setWalletError("Wallet connection failed. CheCko/Croissant may not be fully supported yet. Use Demo Mode.");
    }
    
    setConnecting(false);
  };

  const connectMockWallet = () => {
    const mockAddress = generateMockAddress();
    setWalletAddress(mockAddress);
    setWalletConnected(true);
    setUseMockWallet(true);
    setShowWalletModal(false);
  };

  const disconnectWallet = async () => {
    if (!useMockWallet) {
      await disconnectLineraWallet();
    }
    setWalletConnected(false);
    setWalletAddress("");
    setUseMockWallet(false);
  };

  const navItems = [
    { path: "/", label: "Dashboard" },
    { path: "/markets", label: "Markets" },
    { path: "/oracles", label: "Oracles" },
    { path: "/bots", label: "Bots" },
    { path: "/analytics", label: "Analytics" },
  ];

  return (
    <>
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
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-800/80 border border-green-500/30 hover:border-green-500/60 transition-all group"
                >
                  <div className="w-2 h-2 rounded-full bg-green-400" style={{ boxShadow: '0 0 8px rgba(0, 255, 136, 0.8)' }} />
                  <span className="text-xs font-mono text-green-400">{shortenAddress(walletAddress, 6)}</span>
                  {useMockWallet && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
                      Demo
                    </span>
                  )}
                  <span className="text-gray-500 group-hover:text-red-400 text-xs transition-colors">×</span>
                </button>
              ) : (
                <button
                  onClick={handleConnectClick}
                  disabled={connecting}
                  className="btn-neon-cyan text-sm disabled:opacity-50"
                >
                  {connecting ? 'Connecting...' : 'Connect Wallet'}
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {showWalletModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="bg-gray-900 border border-cyan-500/30 rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl"
               style={{ boxShadow: '0 0 60px rgba(0, 255, 255, 0.1)' }}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Connect Wallet</h2>
              <button 
                onClick={() => setShowWalletModal(false)}
                className="text-gray-400 hover:text-white text-2xl leading-none"
              >
                ×
              </button>
            </div>

            {walletError && (
              <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                {walletError}
              </div>
            )}

            <div className="space-y-3">
              <a
                href={CHECKO_INSTALL_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-4 p-4 rounded-xl bg-gray-800/50 border border-gray-700/50 hover:border-green-500/50 transition-all group cursor-pointer"
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-2xl">
                  🦎
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-white group-hover:text-green-400 transition-colors">CheCko Wallet</h3>
                  <p className="text-xs text-gray-400">Install browser extension</p>
                </div>
                <span className="text-gray-500 group-hover:text-green-400 transition-colors">→</span>
              </a>

              <a
                href={LINERA_DOCS_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-4 p-4 rounded-xl bg-gray-800/50 border border-gray-700/50 hover:border-cyan-500/50 transition-all group cursor-pointer"
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-2xl">
                  🥐
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-white group-hover:text-cyan-400 transition-colors">Croissant Wallet</h3>
                  <p className="text-xs text-gray-400">Alternative Linera wallet</p>
                </div>
                <span className="text-gray-500 group-hover:text-cyan-400 transition-colors">→</span>
              </a>

              <div className="relative py-3">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-700"></div>
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="px-3 bg-gray-900 text-gray-500">or continue without wallet</span>
                </div>
              </div>

              <button
                onClick={connectMockWallet}
                className="w-full flex items-center gap-4 p-4 rounded-xl bg-gray-800/30 border border-gray-700/30 hover:border-yellow-500/50 transition-all group"
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 flex items-center justify-center text-2xl">
                  🎮
                </div>
                <div className="flex-1 text-left">
                  <h3 className="font-semibold text-white group-hover:text-yellow-400 transition-colors">Demo Mode</h3>
                  <p className="text-xs text-gray-400">Use simulated wallet for testing</p>
                </div>
                <span className="text-gray-500 group-hover:text-yellow-400 transition-colors">→</span>
              </button>
            </div>

            {walletInstalled && (
              <button
                onClick={connectRealWallet}
                disabled={connecting}
                className="w-full mt-3 py-3 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold hover:from-green-400 hover:to-emerald-500 transition-all disabled:opacity-50"
                style={{ boxShadow: '0 0 20px rgba(0, 255, 136, 0.3)' }}
              >
                {connecting ? 'Connecting...' : `Connect with ${walletType === 'checko' ? 'CheCko' : walletType === 'croissant' ? 'Croissant' : 'Linera'} Wallet`}
              </button>
            )}

            <div className="mt-4 p-3 rounded-lg bg-yellow-500/5 border border-yellow-500/20">
              <p className="text-xs text-yellow-400/80 text-center">
                ⚠️ {WALLET_STATUS.NOTE}
              </p>
            </div>

            <p className="mt-3 text-xs text-gray-500 text-center">
              Connecting to Testnet Conway for microchain transactions
            </p>
          </div>
        </div>
      )}
    </>
  );
}
