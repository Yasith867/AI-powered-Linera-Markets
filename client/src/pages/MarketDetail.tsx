import { useEffect, useState } from "react";
import { useRoute } from "wouter";
import { useApi } from "../hooks/useApi";
import { 
  detectLineraWallet, 
  shortenAddress, 
  connectLineraWallet,
  getConnectedAccount,
  isWalletConnected,
  lineraGraphqlMutation,
  getWeb3Instance,
  getWalletBalance,
  checkSufficientBalance,
  clearBalanceCache,
  restoreWalletConnection,
  PREDICTION_MARKET_APP_ID
} from "../lib/linera-wallet";

interface Trade {
  id: number;
  traderAddress: string;
  optionIndex: number;
  amount: number;
  price: number;
  isBuy: boolean;
  createdAt: string;
}

interface Market {
  id: number;
  title: string;
  description: string;
  category: string;
  options: string[];
  odds: number[];
  totalVolume: number;
  liquidity: number;
  status: string;
  trades: Trade[];
  resolvedOutcome?: number | null;
}

export default function MarketDetail() {
  const [, params] = useRoute("/markets/:id");
  const [market, setMarket] = useState<Market | null>(null);
  const [trading, setTrading] = useState(false);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [amount, setAmount] = useState("");
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [txStatus, setTxStatus] = useState<string | null>(null);
  const [walletBalance, setWalletBalance] = useState<number>(20);
  const [balanceError, setBalanceError] = useState<string | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingTrade, setPendingTrade] = useState<{
    optionIndex: number;
    amount: number;
    isBuy: boolean;
    optionName: string;
  } | null>(null);
  const api = useApi();

  useEffect(() => {
    if (params?.id) {
      fetchMarket();
    }
    checkWalletConnection();
  }, [params?.id]);

  const checkWalletConnection = async () => {
    const { installed } = detectLineraWallet();
    if (!installed) return;
    
    const web3 = getWeb3Instance();
    if (web3) {
      try {
        const accounts = await web3.eth.getAccounts();
        if (accounts && accounts.length > 0) {
          setWalletAddress(accounts[0]);
          await restoreWalletConnection();
          const balance = await getWalletBalance();
          setWalletBalance(balance.formatted);
          return;
        }
      } catch (err) {
        console.log('Failed to get accounts:', err);
      }
    }
    
    let account = getConnectedAccount();
    if (!account) {
      const restored = await restoreWalletConnection();
      if (restored) {
        account = getConnectedAccount();
      }
    }
    
    if (account) {
      setWalletAddress(account.publicKey);
      const balance = await getWalletBalance();
      setWalletBalance(balance.formatted);
    }
  };

  const refreshBalance = async () => {
    clearBalanceCache();
    const balance = await getWalletBalance();
    setWalletBalance(balance.formatted);
  };

  const fetchMarket = async () => {
    const data = await api.get(`/api/get-market?id=${params?.id}`);
    if (data) setMarket(data as Market);
  };

  const initiateTrade = (isBuy: boolean) => {
    if (selectedOption === null || !amount) return;
    
    const tradeAmount = parseFloat(amount);
    if (isNaN(tradeAmount) || tradeAmount <= 0) {
      setBalanceError("Please enter a valid amount");
      setTimeout(() => setBalanceError(null), 3000);
      return;
    }
    
    if (tradeAmount > walletBalance) {
      setBalanceError(`Insufficient balance. You have ${walletBalance.toFixed(2)} LINERA but need ${tradeAmount} LINERA.`);
      return;
    }
    
    const optionName = market?.options[selectedOption] || `Option ${selectedOption + 1}`;
    setPendingTrade({
      optionIndex: selectedOption,
      amount: tradeAmount,
      isBuy,
      optionName
    });
    setShowConfirmDialog(true);
  };

  const cancelTrade = () => {
    setShowConfirmDialog(false);
    setPendingTrade(null);
  };

  const confirmAndExecuteTrade = async () => {
    if (!pendingTrade) return;
    setShowConfirmDialog(false);
    await executeTrade(pendingTrade.isBuy, pendingTrade.optionIndex, pendingTrade.amount);
    setPendingTrade(null);
  };

  const executeTrade = async (isBuy: boolean, optionIdx?: number, tradeAmt?: number) => {
    const useOption = optionIdx ?? selectedOption;
    const useAmount = tradeAmt ?? parseFloat(amount);
    
    if (useOption === null || isNaN(useAmount) || useAmount <= 0) return;
    
    setTrading(true);
    setTxStatus(null);
    setBalanceError(null);
    
    try {
      const { installed } = detectLineraWallet();
      let traderAddress = walletAddress;
      
      if (installed && !traderAddress) {
        setTxStatus("Connecting to CheCko wallet...");
        const result = await connectLineraWallet();
        if (result.success && result.address) {
          traderAddress = result.address;
          setWalletAddress(result.address);
          await refreshBalance();
        } else if (result.error) {
          setTxStatus(result.error);
          setTimeout(() => setTxStatus(null), 3000);
          setTrading(false);
          return;
        }
      }
      
      if (traderAddress) {
        await restoreWalletConnection();
        setTxStatus("Checking wallet balance...");
        
        const balanceCheck = await checkSufficientBalance(useAmount);
        setWalletBalance(balanceCheck.balance);
        
        if (!balanceCheck.sufficient) {
          setBalanceError(balanceCheck.message || "Insufficient balance");
          setTxStatus(null);
          setTrading(false);
          return;
        }
        
        setTxStatus("Sending transaction to CheCko wallet...");
        
        const marketId = parseInt(params?.id || "0");
        
        const mutation = `
          mutation PlaceTrade($marketId: Int!, $optionIndex: Int!, $amount: Float!, $isBuy: Boolean!) {
            placeTrade(marketId: $marketId, optionIndex: $optionIndex, amount: $amount, isBuy: $isBuy) {
              success
            }
          }
        `;
        
        const mutationResult = await lineraGraphqlMutation(
          PREDICTION_MARKET_APP_ID,
          mutation,
          {
            marketId,
            optionIndex: useOption,
            amount: useAmount,
            isBuy
          }
        );
        
        if (mutationResult.success) {
          setTxStatus(`Transaction submitted! Operation: ${mutationResult.operationId?.slice(0, 8) || 'pending'}...`);
          
          await api.post(`/api/trade`, {
            marketId: params?.id,
            trader: traderAddress,
            optionIndex: useOption,
            amount: useAmount,
            type: isBuy ? 'buy' : 'sell',
            operationId: mutationResult.operationId,
          });
          
          setWalletBalance(prev => Math.max(0, prev - useAmount));
          setTimeout(() => setTxStatus("Trade executed on Linera! (~200ms finality)"), 1500);
          setTimeout(() => setTxStatus(null), 5000);
        } else if (mutationResult.error?.includes('rejected') || mutationResult.error?.includes('denied') || mutationResult.error?.includes('cancel')) {
          setTxStatus("Transaction cancelled by user");
          setTimeout(() => setTxStatus(null), 3000);
          setTrading(false);
          return;
        } else if (mutationResult.error?.includes('Invalid application operation') || mutationResult.error?.includes('application')) {
          setTxStatus("Testnet mode: Recording trade with wallet signature...");
          
          await api.post(`/api/trade`, {
            marketId: params?.id,
            trader: traderAddress,
            optionIndex: useOption,
            amount: useAmount,
            type: isBuy ? 'buy' : 'sell',
            operationId: `testnet_${Date.now()}`,
          });
          
          setWalletBalance(prev => Math.max(0, prev - useAmount));
          setTimeout(() => setTxStatus("Trade recorded on testnet! (App not deployed yet)"), 1500);
          setTimeout(() => setTxStatus(null), 5000);
        } else {
          setBalanceError(`Wallet error: ${mutationResult.error || 'Transaction failed'}. Please try again or check wallet connection.`);
          setTxStatus(null);
          setTrading(false);
          return;
        }
      } else if (!installed) {
        setBalanceError("Please install CheCko wallet to trade. Visit: github.com/respeer-ai/linera-wallet/releases");
        setTrading(false);
        return;
      } else {
        setBalanceError("Please connect your CheCko wallet first using the Connect button");
        setTrading(false);
        return;
      }
      
      await fetchMarket();
      setAmount("");
      setSelectedOption(null);
    } catch (error) {
      console.error("Trade failed:", error);
      const err = error as Error;
      if (err.message?.includes('rejected') || err.message?.includes('denied')) {
        setTxStatus("Transaction rejected by user");
      } else {
        setTxStatus(`Trade failed: ${err.message || 'Unknown error'}`);
      }
      setTimeout(() => setTxStatus(null), 3000);
    } finally {
      setTrading(false);
    }
  };

  if (!market) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="card">
        <div className="flex items-start justify-between mb-4">
          <div>
            <span className="text-xs px-2 py-1 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
              {market.category}
            </span>
            <h1 className="text-2xl font-bold text-white mt-2">{market.title}</h1>
            <p className="text-gray-400 mt-1">{market.description}</p>
          </div>
          <span
            className={`px-3 py-1 rounded-full text-sm ${
              market.status === "active"
                ? "bg-green-500/20 text-green-400"
                : "bg-gray-500/20 text-gray-400"
            }`}
          >
            {market.status}
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <div className="bg-gray-800/50 rounded-lg p-4">
            <p className="text-xs text-gray-400">Total Volume</p>
            <p className="text-xl font-bold text-white">${market.totalVolume.toLocaleString()}</p>
          </div>
          <div className="bg-gray-800/50 rounded-lg p-4">
            <p className="text-xs text-gray-400">Liquidity</p>
            <p className="text-xl font-bold text-white">${market.liquidity.toLocaleString()}</p>
          </div>
          <div className="bg-gray-800/50 rounded-lg p-4">
            <p className="text-xs text-gray-400">Total Trades</p>
            <p className="text-xl font-bold text-white">{market.trades?.length || 0}</p>
          </div>
          <div className="bg-gray-800/50 rounded-lg p-4">
            <p className="text-xs text-gray-400">Options</p>
            <p className="text-xl font-bold text-white">{market.options.length}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-xl font-semibold text-white">
            {market.status === "resolved" ? "Final Results" : "Trading Options"}
          </h2>
          {market.options.map((option, idx) => {
            const isWinner = market.status === "resolved" && market.resolvedOutcome === idx;
            const isLoser = market.status === "resolved" && market.resolvedOutcome !== idx;
            return (
              <div
                key={idx}
                onClick={() => market.status === "active" && setSelectedOption(idx)}
                className={`card transition-all ${
                  isWinner
                    ? "border-green-500 bg-green-500/20"
                    : isLoser
                    ? "opacity-60 border-gray-700"
                    : selectedOption === idx
                    ? "border-green-500 bg-green-500/10 cursor-pointer"
                    : market.status === "active" ? "hover:border-gray-700 cursor-pointer" : ""
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                        isWinner
                          ? "bg-green-500 text-white"
                          : isLoser
                          ? "bg-gray-700 text-gray-500"
                          : selectedOption === idx
                          ? "bg-green-500 text-white"
                          : "bg-gray-800 text-gray-400"
                      }`}
                    >
                      {isWinner ? "🏆" : idx + 1}
                    </div>
                    <div>
                      <span className={`font-medium ${isWinner ? "text-green-400" : isLoser ? "text-gray-500" : "text-white"}`}>
                        {option}
                      </span>
                      {isWinner && (
                        <span className="ml-2 text-xs bg-green-500/30 text-green-400 px-2 py-0.5 rounded font-bold">
                          WINNER
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-2xl font-bold ${isWinner ? "text-green-400" : isLoser ? "text-gray-500" : "text-green-400"}`}>
                      {((market.odds[idx] || 0) * 100).toFixed(1)}%
                    </p>
                    <p className="text-xs text-gray-400">
                      {isWinner ? "winning outcome" : isLoser ? "final probability" : "implied probability"}
                    </p>
                  </div>
                </div>
                <div className="mt-3 h-2 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all ${isWinner ? "bg-gradient-to-r from-green-500 to-emerald-400" : isLoser ? "bg-gray-600" : "bg-gradient-to-r from-green-500 to-emerald-400"}`}
                    style={{ width: `${(market.odds[idx] || 0) * 100}%` }}
                  />
                </div>
              </div>
            );
          })}

          {market.status === "active" && selectedOption !== null && (
            <div className="card bg-gray-800/30">
              <div className="mb-3 p-2 rounded-lg bg-amber-500/10 border border-amber-500/30">
                <div className="flex items-center gap-2 text-amber-400 text-xs">
                  <span>🔗</span>
                  <span className="font-medium">Testnet Demo Mode</span>
                  <span className="text-amber-300/70">• Trades are recorded. On-chain settlement requires deployed contract.</span>
                </div>
              </div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium text-white">Place Trade</h3>
                <div className="flex items-center gap-3">
                  {walletAddress && (
                    <>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400">Balance:</span>
                        <span className={`text-xs font-bold ${walletBalance > 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {walletBalance.toFixed(2)} LINERA
                        </span>
                        <button 
                          onClick={refreshBalance}
                          className="text-xs text-gray-500 hover:text-gray-300"
                          title="Refresh balance"
                        >
                          ↻
                        </button>
                      </div>
                      <span className="text-xs text-green-400 font-mono bg-green-500/10 px-2 py-1 rounded">
                        {shortenAddress(walletAddress, 6)}
                      </span>
                    </>
                  )}
                </div>
              </div>
              
              {balanceError && (
                <div className="mb-3 p-3 rounded-lg text-sm bg-red-500/10 border border-red-500/30 text-red-400 flex items-center gap-2">
                  <span className="text-lg">⚠</span>
                  <div>
                    <p className="font-medium">{balanceError}</p>
                    {walletBalance === 0 && (
                      <p className="text-xs mt-1 text-red-300">
                        Get testnet tokens from the faucet: faucet.testnet-conway.linera.net
                      </p>
                    )}
                  </div>
                </div>
              )}
              
              {txStatus && (
                <div className={`mb-3 p-3 rounded-lg text-sm ${
                  txStatus.includes('Sending') || txStatus.includes('Connecting') || txStatus.includes('submitted') || txStatus.includes('Checking')
                    ? 'bg-yellow-500/10 border border-yellow-500/30 text-yellow-400'
                    : txStatus.includes('success') || txStatus.includes('executed') || txStatus.includes('finality')
                    ? 'bg-green-500/10 border border-green-500/30 text-green-400'
                    : txStatus.includes('cancelled') || txStatus.includes('failed') || txStatus.includes('rejected') || txStatus.includes('Error')
                    ? 'bg-red-500/10 border border-red-500/30 text-red-400'
                    : 'bg-cyan-500/10 border border-cyan-500/30 text-cyan-400'
                }`}>
                  {txStatus}
                </div>
              )}
              
              <div className="flex gap-3">
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => {
                    setAmount(e.target.value);
                    setBalanceError(null);
                  }}
                  placeholder="Amount"
                  className="input flex-1"
                  disabled={trading}
                />
                <button
                  onClick={() => initiateTrade(true)}
                  disabled={trading || !amount || selectedOption === null}
                  className="btn-primary px-6"
                >
                  {trading ? "..." : "Buy"}
                </button>
                <button
                  onClick={() => initiateTrade(false)}
                  disabled={trading || !amount || selectedOption === null}
                  className="btn-secondary px-6"
                >
                  {trading ? "..." : "Sell"}
                </button>
              </div>
            </div>
          )}
        </div>

        <div>
          <h2 className="text-xl font-semibold text-white mb-4">Recent Trades</h2>
          <div className="card max-h-96 overflow-y-auto scrollbar-thin">
            {market.trades?.length ? (
              <div className="space-y-3">
                {market.trades.slice(0, 20).map((trade) => (
                  <div key={trade.id} className="flex items-center justify-between py-2 border-b border-gray-800 last:border-0">
                    <div>
                      <p className="text-sm font-mono text-gray-400">
                        {trade.traderAddress.slice(0, 12)}...
                      </p>
                      <p className="text-xs text-gray-500">
                        {trade.isBuy ? "Bought" : "Sold"} {market.options[trade.optionIndex]}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={`font-medium ${trade.isBuy ? "text-green-400" : "text-red-400"}`}>
                        ${trade.amount.toFixed(2)}
                      </p>
                      <p className="text-xs text-gray-500">
                        @ {(trade.price * 100).toFixed(1)}%
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-400 text-center py-4">No trades yet</p>
            )}
          </div>
        </div>
      </div>

      {showConfirmDialog && pendingTrade && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center">
                <span className="text-xl">💰</span>
              </div>
              <h3 className="text-xl font-bold text-white">Confirm Transaction</h3>
            </div>
            
            <div className="bg-gray-800 rounded-lg p-4 mb-4">
              <div className="flex justify-between mb-2">
                <span className="text-gray-400">Action</span>
                <span className={`font-medium ${pendingTrade.isBuy ? 'text-green-400' : 'text-red-400'}`}>
                  {pendingTrade.isBuy ? 'Buy' : 'Sell'}
                </span>
              </div>
              <div className="flex justify-between mb-2">
                <span className="text-gray-400">Option</span>
                <span className="text-white font-medium">{pendingTrade.optionName}</span>
              </div>
              <div className="flex justify-between mb-2">
                <span className="text-gray-400">Amount</span>
                <span className="text-white font-medium">{pendingTrade.amount} LINERA</span>
              </div>
              <div className="border-t border-gray-700 my-2 pt-2">
                <div className="flex justify-between">
                  <span className="text-gray-400">Your Balance</span>
                  <span className="text-green-400 font-medium">{walletBalance.toFixed(2)} LINERA</span>
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-gray-400">After Trade</span>
                  <span className="text-yellow-400 font-medium">
                    {(walletBalance - pendingTrade.amount).toFixed(2)} LINERA
                  </span>
                </div>
              </div>
            </div>
            
            <div className="text-xs text-gray-500 mb-4 space-y-1">
              <p>Wallet: {shortenAddress(walletAddress || '', 6)} (CheCko)</p>
              <p className="text-amber-400/80">Demo Mode: Trade will be recorded in database. On-chain settlement available after contract deployment.</p>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={cancelTrade}
                className="flex-1 py-3 px-4 rounded-lg bg-gray-700 hover:bg-gray-600 text-white font-medium transition"
              >
                Cancel
              </button>
              <button
                onClick={confirmAndExecuteTrade}
                className="flex-1 py-3 px-4 rounded-lg bg-green-600 hover:bg-green-500 text-white font-medium transition"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
