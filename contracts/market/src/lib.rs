use async_graphql::{Request, Response, SimpleObject};
use linera_sdk::{
    base::{Amount, ChainId, ContractAbi, Owner, ServiceAbi},
    graphql::GraphQLMutationRoot,
};
use serde::{Deserialize, Serialize};

pub struct PredictionMarketAbi;

impl ContractAbi for PredictionMarketAbi {
    type Operation = Operation;
    type Response = MarketResponse;
}

impl ServiceAbi for PredictionMarketAbi {
    type Query = Request;
    type QueryResponse = Response;
}

#[derive(Clone, Debug, Default, Deserialize, Serialize, SimpleObject)]
pub struct MarketState {
    pub market_id: u64,
    pub title: String,
    pub description: String,
    pub category: String,
    pub options: Vec<String>,
    pub odds: Vec<u64>,
    pub total_volume: u64,
    pub liquidity: u64,
    pub status: MarketStatus,
    pub resolved_outcome: Option<u8>,
    pub created_at: u64,
    pub resolution_time: Option<u64>,
    pub trade_count: u64,
}

#[derive(Clone, Copy, Debug, Default, Deserialize, Serialize, PartialEq, Eq, SimpleObject)]
pub enum MarketStatus {
    #[default]
    Active,
    Resolved,
    Cancelled,
}

#[derive(Clone, Debug, Deserialize, Serialize, SimpleObject)]
pub struct Trade {
    pub trade_id: u64,
    pub trader: String,
    pub option_index: u8,
    pub amount: u64,
    pub price: u64,
    pub is_buy: bool,
    pub timestamp: u64,
}

#[derive(Clone, Debug, Deserialize, Serialize, SimpleObject)]
pub struct Position {
    pub owner: String,
    pub option_index: u8,
    pub shares: u64,
    pub avg_price: u64,
}

#[derive(Debug, Deserialize, Serialize, GraphQLMutationRoot)]
pub enum Operation {
    CreateMarket {
        title: String,
        description: String,
        category: String,
        options: Vec<String>,
        initial_liquidity: u64,
        resolution_time: Option<u64>,
    },
    PlaceTrade {
        market_id: u64,
        option_index: u8,
        amount: u64,
        is_buy: bool,
    },
    ResolveMarket {
        market_id: u64,
        outcome: u8,
    },
    ClaimPayout {
        market_id: u64,
    },
    AddLiquidity {
        market_id: u64,
        amount: u64,
    },
    SubmitOracleVote {
        market_id: u64,
        outcome: u8,
        weight: u64,
    },
}

#[derive(Debug, Deserialize, Serialize)]
pub enum Message {
    OracleVote {
        market_id: u64,
        oracle: ChainId,
        outcome: u8,
        weight: u64,
    },
    MarketResolved {
        market_id: u64,
        outcome: u8,
    },
    TradeNotification {
        market_id: u64,
        trader: String,
        option_index: u8,
        amount: u64,
        is_buy: bool,
    },
}

#[derive(Clone, Debug, Deserialize, Serialize, SimpleObject)]
pub struct MarketResponse {
    pub success: bool,
    pub market_id: Option<u64>,
    pub trade_id: Option<u64>,
    pub message: String,
}

impl MarketResponse {
    pub fn success(message: impl Into<String>) -> Self {
        Self {
            success: true,
            market_id: None,
            trade_id: None,
            message: message.into(),
        }
    }

    pub fn with_market_id(mut self, id: u64) -> Self {
        self.market_id = Some(id);
        self
    }

    pub fn with_trade_id(mut self, id: u64) -> Self {
        self.trade_id = Some(id);
        self
    }

    pub fn error(message: impl Into<String>) -> Self {
        Self {
            success: false,
            market_id: None,
            trade_id: None,
            message: message.into(),
        }
    }
}

#[derive(Clone, Debug, Default, Deserialize, Serialize)]
pub struct InstantiationArgument {
    pub admin: Option<String>,
    pub oracle_threshold: u64,
}

pub const PRECISION: u64 = 1_000_000;

pub fn calculate_amm_price(yes_shares: u64, no_shares: u64, is_yes: bool) -> u64 {
    let total = yes_shares + no_shares;
    if total == 0 {
        return PRECISION / 2;
    }
    if is_yes {
        (yes_shares * PRECISION) / total
    } else {
        (no_shares * PRECISION) / total
    }
}

pub fn update_odds_after_trade(
    current_odds: &[u64],
    option_index: usize,
    amount: u64,
    is_buy: bool,
    liquidity: u64,
) -> Vec<u64> {
    let mut new_odds = current_odds.to_vec();
    let impact = if liquidity > 0 {
        (amount * PRECISION) / (liquidity * 10)
    } else {
        PRECISION / 100
    };
    
    if is_buy {
        new_odds[option_index] = (new_odds[option_index] + impact).min(PRECISION - 10000);
        let reduction = impact / (new_odds.len() - 1) as u64;
        for (i, odd) in new_odds.iter_mut().enumerate() {
            if i != option_index {
                *odd = odd.saturating_sub(reduction).max(10000);
            }
        }
    } else {
        new_odds[option_index] = new_odds[option_index].saturating_sub(impact).max(10000);
        let increase = impact / (new_odds.len() - 1) as u64;
        for (i, odd) in new_odds.iter_mut().enumerate() {
            if i != option_index {
                *odd = (*odd + increase).min(PRECISION - 10000);
            }
        }
    }
    
    let total: u64 = new_odds.iter().sum();
    if total > 0 {
        new_odds.iter().map(|o| (o * PRECISION) / total).collect()
    } else {
        new_odds
    }
}
