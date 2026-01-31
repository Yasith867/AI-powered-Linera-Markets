use linera_sdk::{
    base::{Amount, ChainId, Owner},
    views::{linera_views, MapView, RegisterView, RootView, ViewStorageContext},
    Contract, ContractRuntime, Service, ServiceRuntime,
};
use serde::{Deserialize, Serialize};
use thiserror::Error;

#[derive(Clone, Debug, Default, Deserialize, Serialize)]
pub struct AMMParameters {
    pub fee_rate: f64,
    pub min_liquidity: Amount,
}

#[derive(Clone, Debug, Default, Deserialize, Serialize)]
pub struct LiquidityPool {
    pub market_chain: ChainId,
    pub total_liquidity: Amount,
    pub option_reserves: Vec<Amount>,
    pub k_constant: f64,
    pub fee_collected: Amount,
    pub total_volume: Amount,
}

#[derive(Clone, Debug, Default, Deserialize, Serialize)]
pub struct LPPosition {
    pub shares: Amount,
    pub deposited_at: u64,
    pub initial_k: f64,
}

#[derive(Debug, Deserialize, Serialize)]
pub enum Operation {
    CreatePool {
        market_chain: ChainId,
        num_options: u8,
        initial_liquidity: Amount,
    },
    AddLiquidity {
        market_chain: ChainId,
        amount: Amount,
    },
    RemoveLiquidity {
        market_chain: ChainId,
        shares: Amount,
    },
    Swap {
        market_chain: ChainId,
        from_option: u8,
        to_option: u8,
        amount: Amount,
    },
    GetQuote {
        market_chain: ChainId,
        option_index: u8,
        amount: Amount,
        is_buy: bool,
    },
}

#[derive(Debug, Deserialize, Serialize)]
pub enum Message {
    PoolCreated {
        market: ChainId,
        liquidity: Amount,
    },
    SwapExecuted {
        market: ChainId,
        from: u8,
        to: u8,
        amount_in: Amount,
        amount_out: Amount,
    },
    LiquidityAdded {
        market: ChainId,
        provider: Owner,
        amount: Amount,
        shares: Amount,
    },
}

#[derive(Debug, Error)]
pub enum AMMError {
    #[error("Pool does not exist")]
    PoolNotFound,
    #[error("Insufficient liquidity")]
    InsufficientLiquidity,
    #[error("Invalid swap parameters")]
    InvalidSwap,
    #[error("Slippage too high")]
    SlippageTooHigh,
    #[error("Minimum liquidity not met")]
    MinLiquidityNotMet,
}

#[derive(RootView, async_graphql::SimpleObject)]
#[view(context = "ViewStorageContext")]
pub struct AMMView {
    pub pools: MapView<ChainId, LiquidityPool>,
    pub lp_positions: MapView<(ChainId, Owner), LPPosition>,
    pub total_pools: RegisterView<u64>,
    pub total_volume: RegisterView<Amount>,
}

pub struct AMMContract {
    runtime: ContractRuntime<Self>,
}

impl Contract for AMMContract {
    type Message = Message;
    type Parameters = AMMParameters;
    type InstantiationArgument = ();

    async fn load(runtime: ContractRuntime<Self>) -> Self {
        Self { runtime }
    }

    async fn instantiate(&mut self, _: Self::InstantiationArgument) {
        self.runtime.state().total_pools.set(0);
        self.runtime.state().total_volume.set(Amount::ZERO);
    }

    async fn execute_operation(&mut self, operation: Operation) -> Result<(), AMMError> {
        let params = self.runtime.application_parameters();
        
        match operation {
            Operation::CreatePool { market_chain, num_options, initial_liquidity } => {
                if initial_liquidity < params.min_liquidity {
                    return Err(AMMError::MinLiquidityNotMet);
                }
                
                let reserve_per_option = Amount::from_tokens(
                    initial_liquidity.as_tokens() / num_options as f64
                );
                let option_reserves = vec![reserve_per_option; num_options as usize];
                
                let k_constant = option_reserves.iter()
                    .map(|r| r.as_tokens())
                    .product::<f64>();
                
                let pool = LiquidityPool {
                    market_chain,
                    total_liquidity: initial_liquidity,
                    option_reserves,
                    k_constant,
                    fee_collected: Amount::ZERO,
                    total_volume: Amount::ZERO,
                };
                
                self.runtime.state().pools.insert(&market_chain, pool);
                
                let count = self.runtime.state().total_pools.get();
                self.runtime.state().total_pools.set(count + 1);
                
                self.runtime.prepare_message(Message::PoolCreated {
                    market: market_chain,
                    liquidity: initial_liquidity,
                }).send_to(market_chain);
                
                Ok(())
            }
            
            Operation::AddLiquidity { market_chain, amount } => {
                let mut pool = self.runtime.state().pools.get(&market_chain).await
                    .map_err(|_| AMMError::PoolNotFound)?
                    .ok_or(AMMError::PoolNotFound)?;
                
                let share_ratio = amount.as_tokens() / pool.total_liquidity.as_tokens();
                let shares = Amount::from_tokens(pool.total_liquidity.as_tokens() * share_ratio);
                
                pool.total_liquidity = pool.total_liquidity.saturating_add(amount);
                
                for reserve in &mut pool.option_reserves {
                    let addition = Amount::from_tokens(reserve.as_tokens() * share_ratio);
                    *reserve = reserve.saturating_add(addition);
                }
                
                pool.k_constant = pool.option_reserves.iter()
                    .map(|r| r.as_tokens())
                    .product();
                
                self.runtime.state().pools.insert(&market_chain, pool);
                
                let provider = self.runtime.authenticated_signer().unwrap_or_default();
                let position = LPPosition {
                    shares,
                    deposited_at: self.runtime.system_time().micros(),
                    initial_k: pool.k_constant,
                };
                
                self.runtime.state().lp_positions.insert(&(market_chain, provider), position);
                
                self.runtime.prepare_message(Message::LiquidityAdded {
                    market: market_chain,
                    provider,
                    amount,
                    shares,
                }).send_to(market_chain);
                
                Ok(())
            }
            
            Operation::RemoveLiquidity { market_chain, shares } => {
                let provider = self.runtime.authenticated_signer().unwrap_or_default();
                
                let position = self.runtime.state().lp_positions
                    .get(&(market_chain, provider)).await
                    .map_err(|_| AMMError::PoolNotFound)?
                    .ok_or(AMMError::InsufficientLiquidity)?;
                
                if position.shares < shares {
                    return Err(AMMError::InsufficientLiquidity);
                }
                
                let mut pool = self.runtime.state().pools.get(&market_chain).await
                    .map_err(|_| AMMError::PoolNotFound)?
                    .ok_or(AMMError::PoolNotFound)?;
                
                let share_ratio = shares.as_tokens() / pool.total_liquidity.as_tokens();
                let withdrawal = Amount::from_tokens(pool.total_liquidity.as_tokens() * share_ratio);
                
                pool.total_liquidity = pool.total_liquidity.saturating_sub(withdrawal);
                
                for reserve in &mut pool.option_reserves {
                    let removal = Amount::from_tokens(reserve.as_tokens() * share_ratio);
                    *reserve = reserve.saturating_sub(removal);
                }
                
                pool.k_constant = pool.option_reserves.iter()
                    .map(|r| r.as_tokens())
                    .product();
                
                self.runtime.state().pools.insert(&market_chain, pool);
                
                let new_position = LPPosition {
                    shares: position.shares.saturating_sub(shares),
                    ..position
                };
                self.runtime.state().lp_positions.insert(&(market_chain, provider), new_position);
                
                Ok(())
            }
            
            Operation::Swap { market_chain, from_option, to_option, amount } => {
                let mut pool = self.runtime.state().pools.get(&market_chain).await
                    .map_err(|_| AMMError::PoolNotFound)?
                    .ok_or(AMMError::PoolNotFound)?;
                
                if from_option as usize >= pool.option_reserves.len() 
                    || to_option as usize >= pool.option_reserves.len() {
                    return Err(AMMError::InvalidSwap);
                }
                
                let fee = Amount::from_tokens(amount.as_tokens() * params.fee_rate);
                let amount_after_fee = amount.saturating_sub(fee);
                
                let from_reserve = pool.option_reserves[from_option as usize];
                let to_reserve = pool.option_reserves[to_option as usize];
                
                let new_from_reserve = from_reserve.saturating_add(amount_after_fee);
                let new_to_reserve = Amount::from_tokens(
                    pool.k_constant / (new_from_reserve.as_tokens() * 
                        pool.option_reserves.iter()
                            .enumerate()
                            .filter(|(i, _)| *i != from_option as usize && *i != to_option as usize)
                            .map(|(_, r)| r.as_tokens())
                            .product::<f64>())
                );
                
                let amount_out = to_reserve.saturating_sub(new_to_reserve);
                
                pool.option_reserves[from_option as usize] = new_from_reserve;
                pool.option_reserves[to_option as usize] = new_to_reserve;
                pool.fee_collected = pool.fee_collected.saturating_add(fee);
                pool.total_volume = pool.total_volume.saturating_add(amount);
                
                self.runtime.state().pools.insert(&market_chain, pool);
                
                let total = self.runtime.state().total_volume.get();
                self.runtime.state().total_volume.set(total.saturating_add(amount));
                
                self.runtime.prepare_message(Message::SwapExecuted {
                    market: market_chain,
                    from: from_option,
                    to: to_option,
                    amount_in: amount,
                    amount_out,
                }).send_to(market_chain);
                
                Ok(())
            }
            
            Operation::GetQuote { market_chain, option_index, amount, is_buy } => {
                Ok(())
            }
        }
    }

    async fn execute_message(&mut self, message: Self::Message) {
        match message {
            Message::PoolCreated { market, liquidity } => {}
            Message::SwapExecuted { market, from, to, amount_in, amount_out } => {}
            Message::LiquidityAdded { market, provider, amount, shares } => {}
        }
    }
}

pub struct AMMService {
    runtime: ServiceRuntime<Self>,
}

impl Service for AMMService {
    type Parameters = AMMParameters;

    async fn load(runtime: ServiceRuntime<Self>) -> Self {
        Self { runtime }
    }

    async fn handle_query(&self, query: Self::Query) -> Self::QueryResponse {
        query
    }
}
