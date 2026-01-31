#![cfg_attr(target_arch = "wasm32", no_main)]

mod state;

use async_graphql::{EmptySubscription, Object, Request, Response, Schema};
use linera_sdk::{
    base::WithServiceAbi,
    views::{RootView, View},
    Service, ServiceRuntime,
};
use prediction_market::{MarketState, Operation, PredictionMarketAbi};
use state::ApplicationState;
use std::sync::Arc;

pub struct PredictionMarketService {
    state: Arc<ApplicationState>,
}

linera_sdk::service!(PredictionMarketService);

impl WithServiceAbi for PredictionMarketService {
    type Abi = PredictionMarketAbi;
}

impl Service for PredictionMarketService {
    type Parameters = ();

    async fn new(runtime: ServiceRuntime<Self>) -> Self {
        let state = ApplicationState::load(runtime.root_view_storage_context())
            .await
            .expect("Failed to load state");
        Self {
            state: Arc::new(state),
        }
    }

    async fn handle_query(&self, request: Request) -> Response {
        let schema = Schema::build(
            QueryRoot {
                state: self.state.clone(),
            },
            MutationRoot,
            EmptySubscription,
        )
        .finish();
        schema.execute(request).await
    }
}

struct QueryRoot {
    state: Arc<ApplicationState>,
}

#[Object]
impl QueryRoot {
    async fn market(&self, market_id: u64) -> Option<MarketState> {
        self.state.markets.get(&market_id).await.ok().flatten()
    }

    async fn markets(&self) -> Vec<MarketState> {
        let counter = self.state.market_counter.get();
        let mut result = Vec::new();
        for id in 1..=counter {
            if let Ok(Some(market)) = self.state.markets.get(&id).await {
                result.push(market);
            }
        }
        result
    }

    async fn market_count(&self) -> u64 {
        self.state.market_counter.get()
    }

    async fn active_markets(&self) -> Vec<MarketState> {
        let counter = self.state.market_counter.get();
        let mut result = Vec::new();
        for id in 1..=counter {
            if let Ok(Some(market)) = self.state.markets.get(&id).await {
                if market.status == prediction_market::MarketStatus::Active {
                    result.push(market);
                }
            }
        }
        result
    }
}

struct MutationRoot;

#[Object]
impl MutationRoot {
    async fn place_trade(
        &self,
        market_id: u64,
        option_index: u8,
        amount: u64,
        is_buy: bool,
    ) -> async_graphql::Result<String> {
        Ok(format!(
            "Trade operation created for market {} option {} amount {} {}",
            market_id,
            option_index,
            amount,
            if is_buy { "BUY" } else { "SELL" }
        ))
    }

    async fn create_market(
        &self,
        title: String,
        description: String,
        category: String,
        options: Vec<String>,
        initial_liquidity: u64,
    ) -> async_graphql::Result<String> {
        Ok(format!("Market creation operation: {}", title))
    }

    async fn resolve_market(
        &self,
        market_id: u64,
        outcome: u8,
    ) -> async_graphql::Result<String> {
        Ok(format!(
            "Resolution operation for market {} with outcome {}",
            market_id, outcome
        ))
    }
}
