use linera_sdk::{
    base::{Amount, ApplicationId, ChainId, Owner, Timestamp},
    views::{linera_views, MapView, RegisterView, RootView, ViewStorageContext},
    Contract, ContractRuntime, Service, ServiceRuntime,
};
use serde::{Deserialize, Serialize};
use thiserror::Error;

#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct MarketParameters {
    pub oracle_app_id: Option<ApplicationId>,
}

#[derive(Clone, Debug, Default, Deserialize, Serialize)]
pub struct MarketState {
    pub title: String,
    pub description: String,
    pub options: Vec<String>,
    pub odds: Vec<f64>,
    pub total_volume: Amount,
    pub liquidity: Amount,
    pub status: MarketStatus,
    pub resolved_outcome: Option<u8>,
    pub created_at: u64,
    pub event_time: Option<u64>,
}

#[derive(Clone, Debug, Default, Deserialize, Serialize, PartialEq)]
pub enum MarketStatus {
    #[default]
    Active,
    Resolved,
    Cancelled,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct Position {
    pub option_index: u8,
    pub amount: Amount,
    pub avg_price: f64,
}

#[derive(Debug, Deserialize, Serialize)]
pub enum Operation {
    CreateMarket {
        title: String,
        description: String,
        options: Vec<String>,
        event_time: Option<u64>,
    },
    PlaceTrade {
        option_index: u8,
        amount: Amount,
        is_buy: bool,
    },
    ResolveMarket {
        outcome: u8,
    },
    ClaimPayout,
    UpdateOdds {
        option_index: u8,
        new_odds: f64,
    },
}

#[derive(Debug, Deserialize, Serialize)]
pub enum Message {
    OracleVote {
        market_id: ChainId,
        outcome: u8,
        confidence: f64,
    },
    MarketResolved {
        outcome: u8,
    },
    TradeExecuted {
        trader: Owner,
        option_index: u8,
        amount: Amount,
        price: f64,
    },
}

#[derive(Debug, Error)]
pub enum MarketError {
    #[error("Market is not active")]
    MarketNotActive,
    #[error("Invalid option index")]
    InvalidOption,
    #[error("Insufficient funds")]
    InsufficientFunds,
    #[error("Unauthorized")]
    Unauthorized,
    #[error("Market already resolved")]
    AlreadyResolved,
    #[error("No position to claim")]
    NoPosition,
}

#[derive(RootView, async_graphql::SimpleObject)]
#[view(context = "ViewStorageContext")]
pub struct MarketView {
    pub state: RegisterView<MarketState>,
    pub positions: MapView<Owner, Vec<Position>>,
    pub oracle_votes: MapView<ChainId, (u8, f64)>,
    pub trade_count: RegisterView<u64>,
}

pub struct MarketContract {
    runtime: ContractRuntime<Self>,
}

impl Contract for MarketContract {
    type Message = Message;
    type Parameters = MarketParameters;
    type InstantiationArgument = MarketState;

    async fn load(runtime: ContractRuntime<Self>) -> Self {
        Self { runtime }
    }

    async fn instantiate(&mut self, state: Self::InstantiationArgument) {
        self.runtime.state().state.set(state);
        self.runtime.state().trade_count.set(0);
    }

    async fn execute_operation(&mut self, operation: Operation) -> Result<(), MarketError> {
        match operation {
            Operation::CreateMarket { title, description, options, event_time } => {
                let num_options = options.len();
                let initial_odds = vec![1.0 / num_options as f64; num_options];
                
                let state = MarketState {
                    title,
                    description,
                    options,
                    odds: initial_odds,
                    total_volume: Amount::ZERO,
                    liquidity: Amount::from_tokens(1000),
                    status: MarketStatus::Active,
                    resolved_outcome: None,
                    created_at: self.runtime.system_time().micros(),
                    event_time,
                };
                
                self.runtime.state().state.set(state);
                Ok(())
            }
            
            Operation::PlaceTrade { option_index, amount, is_buy } => {
                let mut state = self.runtime.state().state.get().clone();
                
                if state.status != MarketStatus::Active {
                    return Err(MarketError::MarketNotActive);
                }
                
                if option_index as usize >= state.options.len() {
                    return Err(MarketError::InvalidOption);
                }
                
                let price = state.odds[option_index as usize];
                
                state.total_volume = state.total_volume.saturating_add(amount);
                state.odds = Self::update_odds(&state.odds, option_index as usize, amount, is_buy, state.liquidity);
                
                self.runtime.state().state.set(state);
                
                let trader = self.runtime.authenticated_signer().unwrap_or_default();
                let mut positions = self.runtime.state().positions.get(&trader).await
                    .unwrap_or_default()
                    .unwrap_or_default();
                
                if is_buy {
                    positions.push(Position {
                        option_index,
                        amount,
                        avg_price: price,
                    });
                }
                
                self.runtime.state().positions.insert(&trader, positions);
                
                let count = self.runtime.state().trade_count.get();
                self.runtime.state().trade_count.set(count + 1);
                
                self.runtime.prepare_message(Message::TradeExecuted {
                    trader,
                    option_index,
                    amount,
                    price,
                }).send_to(self.runtime.chain_id());
                
                Ok(())
            }
            
            Operation::ResolveMarket { outcome } => {
                let mut state = self.runtime.state().state.get().clone();
                
                if state.status != MarketStatus::Active {
                    return Err(MarketError::AlreadyResolved);
                }
                
                if outcome as usize >= state.options.len() {
                    return Err(MarketError::InvalidOption);
                }
                
                state.status = MarketStatus::Resolved;
                state.resolved_outcome = Some(outcome);
                
                self.runtime.state().state.set(state);
                
                self.runtime.prepare_message(Message::MarketResolved { outcome })
                    .with_authentication()
                    .send_to(self.runtime.chain_id());
                
                Ok(())
            }
            
            Operation::ClaimPayout => {
                let state = self.runtime.state().state.get();
                
                if state.status != MarketStatus::Resolved {
                    return Err(MarketError::MarketNotActive);
                }
                
                let outcome = state.resolved_outcome.ok_or(MarketError::NoPosition)?;
                let trader = self.runtime.authenticated_signer().unwrap_or_default();
                
                let positions = self.runtime.state().positions.get(&trader).await
                    .unwrap_or_default()
                    .unwrap_or_default();
                
                let winning_positions: Vec<_> = positions.iter()
                    .filter(|p| p.option_index == outcome)
                    .collect();
                
                if winning_positions.is_empty() {
                    return Err(MarketError::NoPosition);
                }
                
                self.runtime.state().positions.remove(&trader);
                Ok(())
            }
            
            Operation::UpdateOdds { option_index, new_odds } => {
                let mut state = self.runtime.state().state.get().clone();
                
                if option_index as usize >= state.odds.len() {
                    return Err(MarketError::InvalidOption);
                }
                
                state.odds[option_index as usize] = new_odds;
                
                let total: f64 = state.odds.iter().sum();
                state.odds = state.odds.iter().map(|o| o / total).collect();
                
                self.runtime.state().state.set(state);
                Ok(())
            }
        }
    }

    async fn execute_message(&mut self, message: Self::Message) {
        match message {
            Message::OracleVote { market_id: _, outcome, confidence } => {
                let sender = self.runtime.message_id().chain_id;
                self.runtime.state().oracle_votes.insert(&sender, (outcome, confidence));
                
                self.check_oracle_consensus().await;
            }
            Message::MarketResolved { outcome: _ } => {
            }
            Message::TradeExecuted { trader: _, option_index: _, amount: _, price: _ } => {
            }
        }
    }
}

impl MarketContract {
    fn update_odds(
        current_odds: &[f64],
        option_index: usize,
        amount: Amount,
        is_buy: bool,
        liquidity: Amount,
    ) -> Vec<f64> {
        let impact = amount.as_tokens() / (liquidity.as_tokens() * 10.0);
        let mut new_odds = current_odds.to_vec();
        
        if is_buy {
            new_odds[option_index] = (new_odds[option_index] + impact).min(0.99);
            let reduction = impact / (new_odds.len() - 1) as f64;
            for (i, odd) in new_odds.iter_mut().enumerate() {
                if i != option_index {
                    *odd = (*odd - reduction).max(0.01);
                }
            }
        } else {
            new_odds[option_index] = (new_odds[option_index] - impact).max(0.01);
            let increase = impact / (new_odds.len() - 1) as f64;
            for (i, odd) in new_odds.iter_mut().enumerate() {
                if i != option_index {
                    *odd = (*odd + increase).min(0.99);
                }
            }
        }
        
        let total: f64 = new_odds.iter().sum();
        new_odds.iter().map(|o| o / total).collect()
    }
    
    async fn check_oracle_consensus(&mut self) {
        let mut vote_counts: std::collections::HashMap<u8, f64> = std::collections::HashMap::new();
        
        let oracle_votes = &self.runtime.state().oracle_votes;
        let votes: Vec<(u8, f64)> = vec![];
        
        for (outcome, confidence) in votes {
            *vote_counts.entry(outcome).or_insert(0.0) += confidence;
        }
        
        let total_weight: f64 = vote_counts.values().sum();
        
        for (outcome, weight) in vote_counts {
            if weight / total_weight >= 0.67 {
                let _ = self.execute_operation(Operation::ResolveMarket { outcome }).await;
                break;
            }
        }
    }
}

pub struct MarketService {
    runtime: ServiceRuntime<Self>,
}

impl Service for MarketService {
    type Parameters = MarketParameters;

    async fn load(runtime: ServiceRuntime<Self>) -> Self {
        Self { runtime }
    }

    async fn handle_query(&self, query: Self::Query) -> Self::QueryResponse {
        query
    }
}

impl MarketService {
    pub fn state(&self) -> &MarketView {
        self.runtime.state()
    }
}
