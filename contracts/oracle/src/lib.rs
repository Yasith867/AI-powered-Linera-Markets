use linera_sdk::{
    base::{ApplicationId, ChainId, Owner},
    views::{linera_views, MapView, RegisterView, RootView, ViewStorageContext},
    Contract, ContractRuntime, Service, ServiceRuntime,
};
use serde::{Deserialize, Serialize};
use thiserror::Error;

#[derive(Clone, Debug, Default, Deserialize, Serialize)]
pub struct OracleParameters {
    pub required_consensus: f64,
    pub min_oracles: u8,
}

#[derive(Clone, Debug, Default, Deserialize, Serialize)]
pub struct OracleNode {
    pub name: String,
    pub data_source: String,
    pub accuracy: f64,
    pub total_votes: u64,
    pub is_active: bool,
    pub registered_at: u64,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct VoteRecord {
    pub oracle_id: ChainId,
    pub outcome: u8,
    pub confidence: f64,
    pub data_hash: String,
    pub timestamp: u64,
}

#[derive(Clone, Debug, Default, Deserialize, Serialize)]
pub struct MarketVotes {
    pub votes: Vec<VoteRecord>,
    pub resolved: bool,
    pub final_outcome: Option<u8>,
}

#[derive(Debug, Deserialize, Serialize)]
pub enum Operation {
    RegisterOracle {
        name: String,
        data_source: String,
    },
    SubmitVote {
        market_chain: ChainId,
        outcome: u8,
        confidence: f64,
        data_hash: String,
    },
    DeactivateOracle,
    ReactivateOracle,
}

#[derive(Debug, Deserialize, Serialize)]
pub enum Message {
    VoteSubmitted {
        oracle: ChainId,
        market: ChainId,
        outcome: u8,
        confidence: f64,
    },
    ConsensusReached {
        market: ChainId,
        outcome: u8,
        total_votes: u64,
    },
    OracleRegistered {
        oracle: ChainId,
        name: String,
    },
}

#[derive(Debug, Error)]
pub enum OracleError {
    #[error("Oracle not registered")]
    NotRegistered,
    #[error("Oracle is inactive")]
    Inactive,
    #[error("Already voted on this market")]
    AlreadyVoted,
    #[error("Invalid confidence value")]
    InvalidConfidence,
    #[error("Unauthorized")]
    Unauthorized,
}

#[derive(RootView, async_graphql::SimpleObject)]
#[view(context = "ViewStorageContext")]
pub struct OracleView {
    pub oracle_info: RegisterView<OracleNode>,
    pub market_votes: MapView<ChainId, MarketVotes>,
    pub registered_oracles: MapView<ChainId, OracleNode>,
}

pub struct OracleContract {
    runtime: ContractRuntime<Self>,
}

impl Contract for OracleContract {
    type Message = Message;
    type Parameters = OracleParameters;
    type InstantiationArgument = OracleNode;

    async fn load(runtime: ContractRuntime<Self>) -> Self {
        Self { runtime }
    }

    async fn instantiate(&mut self, node: Self::InstantiationArgument) {
        self.runtime.state().oracle_info.set(node);
    }

    async fn execute_operation(&mut self, operation: Operation) -> Result<(), OracleError> {
        match operation {
            Operation::RegisterOracle { name, data_source } => {
                let oracle = OracleNode {
                    name: name.clone(),
                    data_source,
                    accuracy: 100.0,
                    total_votes: 0,
                    is_active: true,
                    registered_at: self.runtime.system_time().micros(),
                };
                
                self.runtime.state().oracle_info.set(oracle.clone());
                
                let chain_id = self.runtime.chain_id();
                self.runtime.state().registered_oracles.insert(&chain_id, oracle);
                
                self.runtime.prepare_message(Message::OracleRegistered {
                    oracle: chain_id,
                    name,
                }).send_to(chain_id);
                
                Ok(())
            }
            
            Operation::SubmitVote { market_chain, outcome, confidence, data_hash } => {
                if !(0.0..=1.0).contains(&confidence) {
                    return Err(OracleError::InvalidConfidence);
                }
                
                let oracle_info = self.runtime.state().oracle_info.get();
                if !oracle_info.is_active {
                    return Err(OracleError::Inactive);
                }
                
                let mut market_votes = self.runtime.state().market_votes.get(&market_chain).await
                    .unwrap_or_default()
                    .unwrap_or_default();
                
                let oracle_chain = self.runtime.chain_id();
                if market_votes.votes.iter().any(|v| v.oracle_id == oracle_chain) {
                    return Err(OracleError::AlreadyVoted);
                }
                
                market_votes.votes.push(VoteRecord {
                    oracle_id: oracle_chain,
                    outcome,
                    confidence,
                    data_hash,
                    timestamp: self.runtime.system_time().micros(),
                });
                
                self.runtime.state().market_votes.insert(&market_chain, market_votes.clone());
                
                let mut oracle_info = oracle_info.clone();
                oracle_info.total_votes += 1;
                self.runtime.state().oracle_info.set(oracle_info);
                
                self.runtime.prepare_message(Message::VoteSubmitted {
                    oracle: oracle_chain,
                    market: market_chain,
                    outcome,
                    confidence,
                }).send_to(market_chain);
                
                self.check_consensus(market_chain, &market_votes).await;
                
                Ok(())
            }
            
            Operation::DeactivateOracle => {
                let mut oracle_info = self.runtime.state().oracle_info.get().clone();
                oracle_info.is_active = false;
                self.runtime.state().oracle_info.set(oracle_info);
                Ok(())
            }
            
            Operation::ReactivateOracle => {
                let mut oracle_info = self.runtime.state().oracle_info.get().clone();
                oracle_info.is_active = true;
                self.runtime.state().oracle_info.set(oracle_info);
                Ok(())
            }
        }
    }

    async fn execute_message(&mut self, message: Self::Message) {
        match message {
            Message::VoteSubmitted { oracle, market, outcome, confidence } => {
            }
            Message::ConsensusReached { market, outcome, total_votes } => {
            }
            Message::OracleRegistered { oracle, name } => {
            }
        }
    }
}

impl OracleContract {
    async fn check_consensus(&mut self, market: ChainId, votes: &MarketVotes) {
        let params = self.runtime.application_parameters();
        
        if votes.votes.len() < params.min_oracles as usize {
            return;
        }
        
        let mut vote_weights: std::collections::HashMap<u8, f64> = std::collections::HashMap::new();
        
        for vote in &votes.votes {
            *vote_weights.entry(vote.outcome).or_insert(0.0) += vote.confidence;
        }
        
        let total_weight: f64 = vote_weights.values().sum();
        
        for (outcome, weight) in vote_weights {
            if weight / total_weight >= params.required_consensus {
                self.runtime.prepare_message(Message::ConsensusReached {
                    market,
                    outcome,
                    total_votes: votes.votes.len() as u64,
                }).send_to(market);
                
                break;
            }
        }
    }
}

pub struct OracleService {
    runtime: ServiceRuntime<Self>,
}

impl Service for OracleService {
    type Parameters = OracleParameters;

    async fn load(runtime: ServiceRuntime<Self>) -> Self {
        Self { runtime }
    }

    async fn handle_query(&self, query: Self::Query) -> Self::QueryResponse {
        query
    }
}
