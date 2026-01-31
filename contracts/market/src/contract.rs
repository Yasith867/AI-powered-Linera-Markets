#![cfg_attr(target_arch = "wasm32", no_main)]

mod state;

use linera_sdk::{
    base::WithContractAbi,
    views::{RootView, View},
    Contract, ContractRuntime,
};
use prediction_market::{
    InstantiationArgument, MarketResponse, MarketState, MarketStatus, Message, Operation,
    PredictionMarketAbi, update_odds_after_trade, PRECISION,
};
use state::ApplicationState;

pub struct PredictionMarketContract {
    state: ApplicationState,
    runtime: ContractRuntime<Self>,
}

linera_sdk::contract!(PredictionMarketContract);

impl WithContractAbi for PredictionMarketContract {
    type Abi = PredictionMarketAbi;
}

impl Contract for PredictionMarketContract {
    type Message = Message;
    type Parameters = ();
    type InstantiationArgument = InstantiationArgument;

    async fn load(runtime: ContractRuntime<Self>) -> Self {
        let state = ApplicationState::load(runtime.root_view_storage_context())
            .await
            .expect("Failed to load state");
        Self { state, runtime }
    }

    async fn instantiate(&mut self, argument: Self::InstantiationArgument) {
        self.state.admin.set(argument.admin);
        self.state.oracle_threshold.set(argument.oracle_threshold);
        self.state.market_counter.set(0);
    }

    async fn execute_operation(&mut self, operation: Self::Operation) -> MarketResponse {
        match operation {
            Operation::CreateMarket {
                title,
                description,
                category,
                options,
                initial_liquidity,
                resolution_time,
            } => {
                let market_id = self.state.market_counter.get() + 1;
                self.state.market_counter.set(market_id);

                let num_options = options.len() as u64;
                let initial_odds = vec![PRECISION / num_options; options.len()];

                let market = MarketState {
                    market_id,
                    title,
                    description,
                    category,
                    options,
                    odds: initial_odds,
                    total_volume: 0,
                    liquidity: initial_liquidity,
                    status: MarketStatus::Active,
                    resolved_outcome: None,
                    created_at: self.runtime.system_time().micros() as u64,
                    resolution_time,
                    trade_count: 0,
                };

                self.state.markets.insert(&market_id, market).unwrap();

                MarketResponse::success("Market created successfully").with_market_id(market_id)
            }

            Operation::PlaceTrade {
                market_id,
                option_index,
                amount,
                is_buy,
            } => {
                let market = self.state.markets.get(&market_id).await;
                
                match market {
                    Ok(Some(mut market)) => {
                        if market.status != MarketStatus::Active {
                            return MarketResponse::error("Market is not active");
                        }

                        if option_index as usize >= market.options.len() {
                            return MarketResponse::error("Invalid option index");
                        }

                        let price = market.odds[option_index as usize];
                        
                        market.total_volume += amount;
                        market.trade_count += 1;
                        market.odds = update_odds_after_trade(
                            &market.odds,
                            option_index as usize,
                            amount,
                            is_buy,
                            market.liquidity,
                        );

                        let trade_id = market.trade_count;
                        self.state.markets.insert(&market_id, market).unwrap();

                        let trader = self.runtime
                            .authenticated_signer()
                            .map(|o| o.to_string())
                            .unwrap_or_else(|| "anonymous".to_string());

                        self.runtime
                            .prepare_message(Message::TradeNotification {
                                market_id,
                                trader,
                                option_index,
                                amount,
                                is_buy,
                            })
                            .send_to(self.runtime.chain_id());

                        MarketResponse::success(format!(
                            "Trade executed at price {}",
                            price as f64 / PRECISION as f64
                        ))
                        .with_trade_id(trade_id)
                    }
                    _ => MarketResponse::error("Market not found"),
                }
            }

            Operation::ResolveMarket { market_id, outcome } => {
                let market = self.state.markets.get(&market_id).await;
                
                match market {
                    Ok(Some(mut market)) => {
                        if market.status != MarketStatus::Active {
                            return MarketResponse::error("Market already resolved");
                        }

                        if outcome as usize >= market.options.len() {
                            return MarketResponse::error("Invalid outcome");
                        }

                        market.status = MarketStatus::Resolved;
                        market.resolved_outcome = Some(outcome);
                        self.state.markets.insert(&market_id, market).unwrap();

                        self.runtime
                            .prepare_message(Message::MarketResolved { market_id, outcome })
                            .send_to(self.runtime.chain_id());

                        MarketResponse::success("Market resolved")
                    }
                    _ => MarketResponse::error("Market not found"),
                }
            }

            Operation::ClaimPayout { market_id } => {
                let market = self.state.markets.get(&market_id).await;
                
                match market {
                    Ok(Some(market)) => {
                        if market.status != MarketStatus::Resolved {
                            return MarketResponse::error("Market not resolved yet");
                        }
                        MarketResponse::success("Payout claimed")
                    }
                    _ => MarketResponse::error("Market not found"),
                }
            }

            Operation::AddLiquidity { market_id, amount } => {
                let market = self.state.markets.get(&market_id).await;
                
                match market {
                    Ok(Some(mut market)) => {
                        market.liquidity += amount;
                        self.state.markets.insert(&market_id, market).unwrap();
                        MarketResponse::success("Liquidity added")
                    }
                    _ => MarketResponse::error("Market not found"),
                }
            }

            Operation::SubmitOracleVote {
                market_id,
                outcome,
                weight,
            } => {
                let oracle = self.runtime.chain_id();
                
                self.runtime
                    .prepare_message(Message::OracleVote {
                        market_id,
                        oracle,
                        outcome,
                        weight,
                    })
                    .send_to(self.runtime.chain_id());

                MarketResponse::success("Oracle vote submitted")
            }
        }
    }

    async fn execute_message(&mut self, message: Self::Message) {
        match message {
            Message::OracleVote {
                market_id,
                oracle,
                outcome,
                weight,
            } => {
                self.state
                    .oracle_votes
                    .insert(&(market_id, oracle), (outcome, weight))
                    .unwrap();
            }
            Message::MarketResolved { .. } => {}
            Message::TradeNotification { .. } => {}
        }
    }

    async fn store(mut self) {
        self.state.save().await.expect("Failed to save state");
    }
}
