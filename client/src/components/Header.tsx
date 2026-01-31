import { Link, useLocation } from "wouter";
import { useState, useEffect } from "react";
import { 
  detectLineraWallet, 
  connectLineraWallet, 
  disconnectLineraWallet,
  generateMockAddress,
  shortenAddress,
  CHECKO_INSTALL_URL,
  LINERA_DOCS_URL,
  CROISSANT_INSTALL_URL,
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
    const checkWallet = () => {
      const { installed } = detectLineraWallet();
      setWalletInstalled(installed);
    };
    
    checkWallet();
    const interval = setInterval(checkWallet, 1000);
    setTimeout(() => clearInterval(interval), 10000);
    
    return () => clearInterval(interval);
  }, []);

  const refreshWalletDetection = () => {
    const { installed } = detectLineraWallet();
    setWalletInstalled(installed);
    if (!installed) {
      setWalletError("CheCko wallet not detected. Make sure the extension is enabled for this site.");
    }
  };

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
    { path: "/overview", label: "Overview" },
    { path: "/", label: "Dashboard" },
    { path: "/markets", label: "Markets" },
    { path: "/oracles", label: "Oracles" },
    { path: "/bots", label: "Bots" },
    { path: "/analytics", label: "Analytics" },
  ];

  return (
    <>
      <header className="bg-gray-900/95 backdrop-blur-xl border-b border-gray-700/50 sticky top-0 z-40">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <Link href="/">
              <div className="flex items-center gap-3 cursor-pointer group shrink-0">
                <img 
                  src="/linera-logo.png" 
                  alt="Linera Markets" 
                  className="w-10 h-10 rounded-lg shrink-0"
                />
                <div className="shrink-0">
                  <h1 className="text-lg font-bold text-white group-hover:text-indigo-300 transition-colors whitespace-nowrap">
                    Linera Markets
                  </h1>
                  <p className="text-xs text-gray-400 whitespace-nowrap">AI-Powered Predictions</p>
                </div>
              </div>
            </Link>

            <nav className="flex items-center gap-1">
              {navItems.map((item) => (
                <Link key={item.path} href={item.path}>
                  <button
                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                      location === item.path
                        ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/40"
                        : "text-gray-400 hover:text-white hover:bg-gray-800/50 border border-transparent"
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
                  <div className={`w-2.5 h-2.5 rounded-full ${serverOnline ? 'bg-emerald-400' : 'bg-red-400'}`} />
                  <span className={`text-xs font-semibold ${serverOnline ? 'text-emerald-400' : 'text-red-400'}`}>
                    {serverOnline ? 'Live on Linera' : 'Offline'}
                  </span>
                </div>
                {isConnected && (
                  <>
                    <div className="w-px h-4 bg-gray-700" />
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                      <span className="text-xs text-blue-400">WebSocket</span>
                    </div>
                  </>
                )}
              </div>

              <div className="px-2 py-1 rounded-lg bg-gray-800/50 border border-amber-500/30">
                <span className="text-xs font-mono text-amber-400">Testnet</span>
              </div>

              {walletConnected ? (
                <button
                  onClick={disconnectWallet}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-800/80 border border-indigo-500/30 hover:border-indigo-500/60 transition-all group"
                >
                  <div className="w-2 h-2 rounded-full bg-indigo-400" />
                  <span className="text-xs font-mono text-indigo-300">{shortenAddress(walletAddress, 6)}</span>
                  {useMockWallet && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                      Demo
                    </span>
                  )}
                  <span className="text-gray-500 group-hover:text-red-400 text-xs transition-colors">×</span>
                </button>
              ) : (
                <button
                  onClick={handleConnectClick}
                  disabled={connecting}
                  className="px-3 py-1.5 rounded-lg bg-indigo-500/20 border border-indigo-500/50 text-indigo-300 text-xs font-semibold hover:bg-indigo-500/30 transition-all disabled:opacity-50"
                >
                  {connecting ? 'Connecting...' : 'Connect'}
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {showWalletModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl"
               style={{ boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}>
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
              {walletInstalled ? (
                <button
                  onClick={connectRealWallet}
                  disabled={connecting}
                  className="w-full flex items-center gap-4 p-4 rounded-xl bg-gray-800/50 border border-green-500/50 hover:border-green-400 transition-all group cursor-pointer disabled:opacity-50"
                  style={{ boxShadow: '0 0 15px rgba(0, 255, 136, 0.2)' }}
                >
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-2xl">
                    🦎
                  </div>
                  <div className="flex-1 text-left">
                    <h3 className="font-semibold text-green-400">CheCko Wallet Detected!</h3>
                    <p className="text-xs text-gray-400">{connecting ? 'Connecting...' : 'Click to connect'}</p>
                  </div>
                  <span className="text-green-400">→</span>
                </button>
              ) : (
                <div className="space-y-2">
                  <button
                    onClick={refreshWalletDetection}
                    className="w-full flex items-center gap-4 p-4 rounded-xl bg-gray-800/50 border border-green-500/30 hover:border-green-500/50 transition-all group cursor-pointer"
                  >
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-2xl">
                      🦎
                    </div>
                    <div className="flex-1 text-left">
                      <h3 className="font-semibold text-white group-hover:text-green-400 transition-colors">CheCko Wallet</h3>
                      <p className="text-xs text-gray-400">Click to detect installed wallet</p>
                    </div>
                    <span className="text-gray-500 group-hover:text-green-400 transition-colors">🔄</span>
                  </button>
                  <a
                    href={CHECKO_INSTALL_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-center text-xs text-gray-500 hover:text-green-400 transition-colors"
                  >
                    Don't have CheCko? Download here →
                  </a>
                </div>
              )}

              <a
                href={CROISSANT_INSTALL_URL}
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

            <div className="mt-4 p-3 rounded-lg bg-green-500/5 border border-green-500/20">
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
