use linera_sdk::{
    base::{Amount, ApplicationId, ChainId, Owner},
    views::{linera_views, MapView, RegisterView, RootView, ViewStorageContext},
    Contract, ContractRuntime, Service, ServiceRuntime,
};
use serde::{Deserialize, Serialize};
use thiserror::Error;

#[derive(Clone, Debug, Default, Deserialize, Serialize)]
pub struct BotParameters {
    pub market_app_id: Option<ApplicationId>,
    pub max_position_size: Amount,
}

#[derive(Clone, Debug, Default, Deserialize, Serialize, PartialEq)]
pub enum Strategy {
    #[default]
    Momentum,
    Contrarian,
    Arbitrage,
    MarketMaker,
}

#[derive(Clone, Debug, Default, Deserialize, Serialize)]
pub struct BotConfig {
    pub name: String,
    pub strategy: Strategy,
    pub trade_size: Amount,
    pub max_trades_per_block: u8,
    pub min_odds_threshold: f64,
    pub max_odds_threshold: f64,
    pub is_active: bool,
}

#[derive(Clone, Debug, Default, Deserialize, Serialize)]
pub struct TradeRecord {
    pub market_chain: ChainId,
    pub option_index: u8,
    pub amount: Amount,
    pub price: f64,
    pub is_buy: bool,
    pub timestamp: u64,
    pub pnl: Option<f64>,
}

#[derive(Clone, Debug, Default, Deserialize, Serialize)]
pub struct BotStats {
    pub total_trades: u64,
    pub winning_trades: u64,
    pub total_pnl: f64,
    pub current_positions: Vec<(ChainId, u8, Amount)>,
}

#[derive(Debug, Deserialize, Serialize)]
pub enum Operation {
    Configure {
        config: BotConfig,
    },
    Execute,
    Stop,
    Start,
    AnalyzeMarket {
        market_chain: ChainId,
        odds: Vec<f64>,
    },
    ClosePosition {
        market_chain: ChainId,
        option_index: u8,
    },
}

#[derive(Debug, Deserialize, Serialize)]
pub enum Message {
    TradeSignal {
        market: ChainId,
        option_index: u8,
        action: TradeAction,
        confidence: f64,
    },
    PositionUpdate {
        market: ChainId,
        option_index: u8,
        size: Amount,
        pnl: f64,
    },
    BotExecuted {
        trades_made: u64,
        markets_analyzed: u64,
    },
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub enum TradeAction {
    Buy,
    Sell,
    Hold,
}

#[derive(Debug, Error)]
pub enum BotError {
    #[error("Bot is not active")]
    NotActive,
    #[error("Maximum trades reached")]
    MaxTradesReached,
    #[error("No valid trade signal")]
    NoSignal,
    #[error("Position size exceeded")]
    PositionSizeExceeded,
    #[error("Market not found")]
    MarketNotFound,
}

#[derive(RootView, async_graphql::SimpleObject)]
#[view(context = "ViewStorageContext")]
pub struct BotView {
    pub config: RegisterView<BotConfig>,
    pub stats: RegisterView<BotStats>,
    pub trade_history: MapView<u64, TradeRecord>,
    pub market_signals: MapView<ChainId, (TradeAction, f64)>,
}

pub struct BotContract {
    runtime: ContractRuntime<Self>,
}

impl Contract for BotContract {
    type Message = Message;
    type Parameters = BotParameters;
    type InstantiationArgument = BotConfig;

    async fn load(runtime: ContractRuntime<Self>) -> Self {
        Self { runtime }
    }

    async fn instantiate(&mut self, config: Self::InstantiationArgument) {
        self.runtime.state().config.set(config);
        self.runtime.state().stats.set(BotStats::default());
    }

    async fn execute_operation(&mut self, operation: Operation) -> Result<(), BotError> {
        match operation {
            Operation::Configure { config } => {
                self.runtime.state().config.set(config);
                Ok(())
            }
            
            Operation::Execute => {
                let config = self.runtime.state().config.get();
                if !config.is_active {
                    return Err(BotError::NotActive);
                }
                
                let signals: Vec<_> = vec![];
                let mut trades_made = 0u64;
                
                for (market, (action, confidence)) in signals {
                    if trades_made >= config.max_trades_per_block as u64 {
                        break;
                    }
                    
                    if confidence >= 0.7 {
                        match action {
                            TradeAction::Buy => {
                                trades_made += 1;
                            }
                            TradeAction::Sell => {
                                trades_made += 1;
                            }
                            TradeAction::Hold => {}
                        }
                    }
                }
                
                let mut stats = self.runtime.state().stats.get().clone();
                stats.total_trades += trades_made;
                self.runtime.state().stats.set(stats);
                
                self.runtime.prepare_message(Message::BotExecuted {
                    trades_made,
                    markets_analyzed: signals.len() as u64,
                }).send_to(self.runtime.chain_id());
                
                Ok(())
            }
            
            Operation::Stop => {
                let mut config = self.runtime.state().config.get().clone();
                config.is_active = false;
                self.runtime.state().config.set(config);
                Ok(())
            }
            
            Operation::Start => {
                let mut config = self.runtime.state().config.get().clone();
                config.is_active = true;
                self.runtime.state().config.set(config);
                Ok(())
            }
            
            Operation::AnalyzeMarket { market_chain, odds } => {
                let config = self.runtime.state().config.get();
                let signal = self.generate_signal(&config.strategy, &odds);
                
                self.runtime.state().market_signals.insert(&market_chain, signal.clone());
                
                self.runtime.prepare_message(Message::TradeSignal {
                    market: market_chain,
                    option_index: 0,
                    action: signal.0,
                    confidence: signal.1,
                }).send_to(self.runtime.chain_id());
                
                Ok(())
            }
            
            Operation::ClosePosition { market_chain, option_index } => {
                let mut stats = self.runtime.state().stats.get().clone();
                stats.current_positions.retain(|(m, o, _)| 
                    !(*m == market_chain && *o == option_index)
                );
                self.runtime.state().stats.set(stats);
                Ok(())
            }
        }
    }

    async fn execute_message(&mut self, message: Self::Message) {
        match message {
            Message::TradeSignal { market, option_index, action, confidence } => {}
            Message::PositionUpdate { market, option_index, size, pnl } => {
                let mut stats = self.runtime.state().stats.get().clone();
                stats.total_pnl += pnl;
                if pnl > 0.0 {
                    stats.winning_trades += 1;
                }
                self.runtime.state().stats.set(stats);
            }
            Message::BotExecuted { trades_made, markets_analyzed } => {}
        }
    }
}

impl BotContract {
    fn generate_signal(&self, strategy: &Strategy, odds: &[f64]) -> (TradeAction, f64) {
        match strategy {
            Strategy::Momentum => {
                let max_odds = odds.iter().cloned().fold(0.0f64, f64::max);
                if max_odds > 0.6 {
                    (TradeAction::Buy, max_odds)
                } else {
                    (TradeAction::Hold, 0.5)
                }
            }
            
            Strategy::Contrarian => {
                let min_odds = odds.iter().cloned().fold(1.0f64, f64::min);
                if min_odds < 0.3 {
                    (TradeAction::Buy, 1.0 - min_odds)
                } else {
                    (TradeAction::Hold, 0.5)
                }
            }
            
            Strategy::Arbitrage => {
                let total: f64 = odds.iter().sum();
                if total < 0.95 {
                    (TradeAction::Buy, 0.95 - total + 0.5)
                } else if total > 1.05 {
                    (TradeAction::Sell, total - 1.05 + 0.5)
                } else {
                    (TradeAction::Hold, 0.5)
                }
            }
            
            Strategy::MarketMaker => {
                let spread = odds.iter().cloned().fold(0.0f64, f64::max) - 
                            odds.iter().cloned().fold(1.0f64, f64::min);
                if spread > 0.2 {
                    (TradeAction::Buy, 0.5 + spread)
                } else {
                    (TradeAction::Hold, 0.5)
                }
            }
        }
    }
}

pub struct BotService {
    runtime: ServiceRuntime<Self>,
}

impl Service for BotService {
    type Parameters = BotParameters;

    async fn load(runtime: ServiceRuntime<Self>) -> Self {
        Self { runtime }
    }

    async fn handle_query(&self, query: Self::Query) -> Self::QueryResponse {
        query
    }
}
