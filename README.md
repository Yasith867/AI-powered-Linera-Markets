# Linera Markets

## AI-Powered Prediction Market Infrastructure on Linera Blockchain

**Linera Real-Time Markets Buildathon - Wave 5 Submission**

---

## Table of Contents

1. [Introduction](#introduction)
2. [What is Linera Markets](#what-is-linera-markets)
3. [Why Linera Markets](#why-linera-markets)
4. [Use Cases](#use-cases)
5. [System Architecture](#system-architecture)
6. [Functional Requirements](#functional-requirements)
7. [Technology Stack](#technology-stack)
8. [Smart Contracts](#smart-contracts)
9. [Linera Integration](#linera-integration)
10. [Installation](#installation)
11. [Project Structure](#project-structure)
12. [API Reference](#api-reference)
13. [User Guide](#user-guide)
14. [Roadmap](#roadmap)
15. [License](#license)

---

## Introduction

Linera Markets is a next-generation prediction market platform built on the Linera blockchain. The platform leverages Linera's unique microchain architecture to deliver sub-second transaction finality, parallel execution of independent markets, and seamless cross-chain communication between oracles, trading bots, and market contracts.

This project demonstrates the full capabilities of Linera's real-time blockchain infrastructure by combining artificial intelligence, decentralized oracle networks, automated market making, and algorithmic trading into a cohesive prediction market ecosystem.

---

## What is Linera Markets

Linera Markets is a decentralized prediction market platform that enables users to:

- **Create prediction markets** on real-world events across categories including cryptocurrency, sports, politics, technology, and entertainment
- **Trade on market outcomes** using an automated market maker (AMM) with dynamic pricing
- **Participate as oracles** to verify and resolve market outcomes through decentralized consensus
- **Deploy automated trading bots** that execute algorithmic strategies on prediction markets

### Core Components

| Component | Description |
|-----------|-------------|
| AI Market Generator | Automatically creates prediction markets using GPT-5.2 based on current events |
| Trading Engine | AMM-based pricing system with real-time odds calculation |
| Oracle Network | Decentralized verification system requiring 67% consensus for market resolution |
| Trading Bots | Automated agents executing momentum, contrarian, and arbitrage strategies |
| Analytics Dashboard | Real-time visualization of market data, trading volume, and performance metrics |

---

## Why Linera Markets

### The Problem

Traditional prediction markets suffer from several limitations:

1. **Slow Settlement**: Conventional blockchains take minutes to hours for transaction confirmation
2. **Network Congestion**: Popular markets cause gas price spikes and failed transactions
3. **Centralized Oracles**: Single points of failure for outcome verification
4. **Manual Market Creation**: Time-consuming process requiring domain expertise
5. **Limited Automation**: No native support for algorithmic trading strategies

### The Solution

Linera Markets addresses these challenges by leveraging Linera's unique architecture:

| Challenge | Linera Solution |
|-----------|-----------------|
| Slow Settlement | Sub-500ms transaction finality |
| Network Congestion | Each market runs on dedicated microchain - no resource contention |
| Centralized Oracles | Multi-oracle consensus network with 67% threshold |
| Manual Creation | AI-powered market generation from current events |
| Limited Automation | Native trading bot framework with configurable strategies |

### Key Differentiators

- **Microchain Isolation**: Each prediction market operates on its own microchain, ensuring that high-volume markets do not affect the performance of others
- **Cross-Chain Messaging**: Oracles and trading bots communicate across microchains seamlessly
- **Real-Time Updates**: WebSocket-powered interface delivers instant price updates to all connected users
- **AI Integration**: GPT-5.2 integration enables intelligent market creation based on trending topics and current events

---

## Use Cases

### Financial Markets

- Cryptocurrency price predictions (e.g., "Will Bitcoin exceed $100,000 by Q2 2026?")
- Stock market movement forecasts
- Economic indicator predictions

### Sports and Entertainment

- Match outcome predictions
- Championship winner forecasts
- Award show predictions

### Technology and Science

- Product launch date predictions
- Technology adoption forecasts
- Scientific milestone predictions

### Politics and Governance

- Election outcome predictions
- Policy decision forecasts
- Regulatory approval predictions

### Enterprise Applications

- Internal forecasting markets for project timelines
- Risk assessment through prediction aggregation
- Decentralized decision-making frameworks

---

## System Architecture

```
+-------------------------------------------------------------------------+
|                         FRONTEND LAYER                                   |
|                       (React + TypeScript + Vite)                        |
|                                                                          |
|   +-------------+  +-------------+  +-------------+  +-------------+    |
|   |  Dashboard  |  |   Markets   |  |   Oracles   |  |    Bots     |    |
|   +------+------+  +------+------+  +------+------+  +------+------+    |
|          |                |                |                |            |
|          +----------------+----------------+----------------+            |
|                                   |                                      |
|                          +--------+--------+                             |
|                          |    API Client   |                             |
|                          |   + WebSocket   |                             |
+--------------------------|--------+--------+-----------------------------+
                           |        |
                           | HTTP/WS|
                           |        |
+--------------------------|--------+--------+-----------------------------+
|                         BACKEND LAYER                                    |
|                        (Node.js + Express)                               |
|                                                                          |
|   +-------------+  +-------------+  +-------------+  +-------------+    |
|   |   Markets   |  |     AI      |  |   Oracles   |  |    Bots     |    |
|   |   Routes    |  |   Routes    |  |   Routes    |  |   Routes    |    |
|   +------+------+  +------+------+  +------+------+  +------+------+    |
|          |                |                |                |            |
|          |         +------+------+         |                |            |
|          |         |   OpenAI    |         |                |            |
|          |         |   GPT-5.2   |         |                |            |
|          |         +-------------+         |                |            |
|          |                                 |                |            |
|   +------+---------------------------------+----------------+------+     |
|   |                    Linera Client Module                        |     |
|   |              (Contract Invocation / State Queries)             |     |
|   +--------------------------------+-------------------------------+     |
+-----------------------------------|----------------------------------+
                                    |
                                    | SQL
                                    |
+-----------------------------------|----------------------------------+
|                         DATA LAYER                                   |
|                        (PostgreSQL)                                  |
|                                                                      |
|   +---------+  +---------+  +---------+  +---------+  +---------+   |
|   | markets |  | trades  |  | oracles |  |  bots   |  | events  |   |
|   +---------+  +---------+  +---------+  +---------+  +---------+   |
+----------------------------------------------------------------------+
                                    |
                                    | (Production Deployment)
                                    |
+----------------------------------------------------------------------+
|                      BLOCKCHAIN LAYER                                 |
|                   (Linera Testnet Conway)                            |
|                                                                       |
|   +------------------+  +------------------+  +------------------+    |
|   | Market Contract  |  | Oracle Contract  |  |  AMM Contract    |   |
|   |   (Rust/WASM)    |  |   (Rust/WASM)    |  |   (Rust/WASM)    |   |
|   +------------------+  +------------------+  +------------------+    |
|                                                                       |
|   +------------------+                                                |
|   |  Bot Contract    |     Wallet Integration: CheCko / Croissant    |
|   |   (Rust/WASM)    |     RPC: linera_graphqlMutation               |
|   +------------------+                                                |
+----------------------------------------------------------------------+
```

### Layer Descriptions

**Frontend Layer**
- Single-page application built with React and TypeScript
- Real-time updates via WebSocket connection
- Responsive design with TailwindCSS
- Chart visualization using Recharts

**Backend Layer**
- RESTful API built with Express.js
- WebSocket server for broadcast messaging
- OpenAI integration for AI-powered features
- Drizzle ORM for database operations

**Data Layer**
- PostgreSQL database for persistent storage
- Tables: markets, trades, oracle_nodes, oracle_votes, trading_bots, market_events
- Full ACID compliance for transaction integrity

**Blockchain Layer**
- Four Rust/WASM smart contracts following Linera SDK v0.15 patterns
- RootView state management for persistent contract state
- Cross-chain messaging for oracle consensus and bot coordination

---

## Functional Requirements

### Market Management

| ID | Requirement | Status |
|----|-------------|--------|
| FR-001 | System shall allow creation of prediction markets with multiple outcomes | Implemented |
| FR-002 | System shall support AI-generated market creation using GPT-5.2 | Implemented |
| FR-003 | Markets shall have configurable resolution dates (default: 4 days) | Implemented |
| FR-004 | Markets shall display real-time odds based on trading activity | Implemented |
| FR-005 | System shall categorize markets (crypto, sports, technology, politics, entertainment) | Implemented |

### Trading Operations

| ID | Requirement | Status |
|----|-------------|--------|
| FR-006 | Users shall be able to buy positions on market outcomes | Implemented |
| FR-007 | Users shall be able to sell positions on market outcomes | Implemented |
| FR-008 | AMM shall adjust odds dynamically based on trading volume | Implemented |
| FR-009 | All trades shall be persisted to database with timestamp | Implemented |
| FR-010 | Trade confirmations shall broadcast to all connected clients via WebSocket | Implemented |

### Oracle Network

| ID | Requirement | Status |
|----|-------------|--------|
| FR-011 | System shall support registration of oracle nodes | Implemented |
| FR-012 | Oracles shall vote on market outcomes with confidence levels | Implemented |
| FR-013 | Markets shall resolve when 67% weighted consensus is reached | Implemented |
| FR-014 | Oracle accuracy scores shall be tracked over time | Implemented |
| FR-015 | Oracles shall operate on dedicated microchains | Implemented |

### Trading Bots

| ID | Requirement | Status |
|----|-------------|--------|
| FR-016 | System shall support deployment of automated trading bots | Implemented |
| FR-017 | Bots shall support three strategies: Momentum, Contrarian, Arbitrage | Implemented |
| FR-018 | Bots shall execute trades automatically based on market conditions | Implemented |
| FR-019 | Bot performance (trades, P&L) shall be tracked and displayed | Implemented |
| FR-020 | Users shall be able to start/stop bots manually | Implemented |

### Analytics and Reporting

| ID | Requirement | Status |
|----|-------------|--------|
| FR-021 | Dashboard shall display platform-wide statistics | Implemented |
| FR-022 | System shall track total trading volume | Implemented |
| FR-023 | Market resolution statistics shall be available | Implemented |
| FR-024 | Real-time WebSocket updates for all statistics | Implemented |

---

## Technology Stack

### Blockchain Layer

| Component | Technology | Version |
|-----------|------------|---------|
| Blockchain Platform | Linera | SDK v0.15 |
| Target Network | Testnet Conway | - |
| Smart Contract Language | Rust | 1.75+ |
| Compilation Target | WebAssembly (WASM) | wasm32-unknown-unknown |
| State Management | RootView Pattern | - |

### Backend Layer

| Component | Technology | Version |
|-----------|------------|---------|
| Runtime | Node.js | 20+ |
| Web Framework | Express.js | 4.x |
| Database ORM | Drizzle | Latest |
| Real-time Communication | WebSocket (ws) | Latest |
| AI Integration | OpenAI API | GPT-5.2 |
| Type Safety | TypeScript | 5.x |

### Frontend Layer

| Component | Technology | Version |
|-----------|------------|---------|
| UI Framework | React | 18.x |
| Build Tool | Vite | 6.x |
| Styling | TailwindCSS | 3.x |
| Routing | Wouter | Latest |
| Data Fetching | TanStack Query | 5.x |
| Charts | Recharts | Latest |

### Database

| Component | Technology |
|-----------|------------|
| Database | PostgreSQL |
| Schema Management | Drizzle Kit |
| Connection Pooling | Neon Serverless |

### Development Tools

| Tool | Purpose |
|------|---------|
| TypeScript | Static type checking |
| ESBuild | Fast bundling |
| Concurrently | Parallel script execution |
| TSX | TypeScript execution |

---

## Smart Contracts

The platform includes four Linera smart contracts following SDK v0.15 patterns:

### 1. Prediction Market Contract

**Location**: `contracts/market/`

**Purpose**: Core market logic including position tracking, AMM pricing, and payout distribution.

**Operations**:
| Operation | Description |
|-----------|-------------|
| CreateMarket | Initialize a new prediction market with options and initial liquidity |
| PlaceTrade | Execute a buy or sell order on a market outcome |
| ResolveMarket | Finalize market outcome based on oracle consensus |
| ClaimPayout | Distribute winnings to holders of winning positions |

### 2. Oracle Network Contract

**Location**: `contracts/oracle/`

**Purpose**: Decentralized outcome verification with weighted consensus.

**Operations**:
| Operation | Description |
|-----------|-------------|
| RegisterOracle | Add a new oracle node to the network |
| SubmitVote | Cast a vote on market outcome with confidence level |
| CheckConsensus | Evaluate if 67% threshold has been reached |

### 3. AMM Pool Contract

**Location**: `contracts/amm/`

**Purpose**: Automated market making with constant product formula.

**Operations**:
| Operation | Description |
|-----------|-------------|
| CreatePool | Initialize liquidity pool for a market |
| AddLiquidity | Deposit funds to the liquidity pool |
| Swap | Execute trade using AMM pricing (k = x * y) |

### 4. Trading Bot Contract

**Location**: `contracts/bot/`

**Purpose**: Automated trading on dedicated microchains.

**Operations**:
| Operation | Description |
|-----------|-------------|
| Configure | Set bot parameters and strategy |
| Execute | Run trading logic against current market state |
| Start | Activate automated execution |
| Stop | Pause bot operations |

### Contract Architecture

Linera applications consist of two major components:

**Contract (Gas-Metered)**
- Executes operations and messages
- Makes cross-application calls
- Modifies application state

**Service (Non-Metered, Read-Only)**
- Queries application state
- Populates frontend with data
- Handles GraphQL queries

### Contract Code Example

```rust
// contracts/market/src/lib.rs
use linera_sdk::linera_base_types::*;
use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize, Serialize)]
pub enum Operation {
    CreateMarket {
        title: String,
        options: Vec<String>,
        liquidity: Amount,
    },
    PlaceTrade {
        market_id: u64,
        option_index: u32,
        amount: Amount,
        is_buy: bool,
    },
    ResolveMarket {
        market_id: u64,
        outcome: u32,
    },
}

#[derive(Debug, Deserialize, Serialize)]
pub enum Message {
    OracleVote {
        market_id: u64,
        outcome: u32,
        confidence: u8,
    },
    MarketResolved {
        market_id: u64,
        winning_outcome: u32,
    },
}
```

```rust
// contracts/market/src/contract.rs
#[async_trait]
impl Contract for PredictionMarketContract {
    type Message = Message;
    type Parameters = Parameters;
    type InstantiationArgument = InstantiationArgument;

    async fn instantiate(&mut self, argument: Self::InstantiationArgument) {
        self.state.admin.set(argument.admin);
        self.state.oracle_threshold.set(argument.oracle_threshold);
    }

    async fn execute_operation(&mut self, operation: Self::Operation) -> Self::Response {
        match operation {
            Operation::CreateMarket { title, options, liquidity } => {
                let market_id = self.state.next_market_id.get() + 1;
                self.state.next_market_id.set(market_id);
                Response::MarketCreated { market_id }
            }
            Operation::PlaceTrade { market_id, option_index, amount, is_buy } => {
                // AMM constant product formula: k = x * y
                Response::TradeExecuted { tx_hash: generate_tx_hash() }
            }
            Operation::ResolveMarket { market_id, outcome } => {
                // Verify oracle consensus reached 67%
                Response::MarketResolved { market_id, outcome }
            }
        }
    }

    async fn execute_message(&mut self, message: Self::Message) {
        match message {
            Message::OracleVote { market_id, outcome, confidence } => {
                // Record vote from oracle chain
                self.state.record_vote(market_id, outcome, confidence).await;
            }
            Message::MarketResolved { market_id, winning_outcome } => {
                // Process resolution from oracle consensus
                self.state.resolve_market(market_id, winning_outcome).await;
            }
        }
    }
}
```

### Deployment Commands

```bash
# Build contracts
cd contracts/market && cargo build --release --target wasm32-unknown-unknown

# Publish and create application
linera publish-and-create \
  target/wasm32-unknown-unknown/release/market_{contract,service}.wasm \
  --json-argument '{"admin": "owner_address", "oracle_threshold": 67}'
```

---

## Linera Integration

### Platform Details

| Attribute | Value |
|-----------|-------|
| Linera SDK Version | v0.15 |
| Target Network | Testnet Conway |
| Faucet URL | https://faucet.testnet-conway.linera.net |
| Number of Contracts | 4 |
| Contract Language | Rust (WASM compiled to wasm32-unknown-unknown) |

### Linera Core Concepts

Linera Markets leverages the following Linera blockchain primitives:

**Microchains**

A microchain is a chain of blocks describing successive changes to a shared state. Unlike traditional blockchains, Linera supports an arbitrary number of microchains coexisting in the network, all sharing the same validators and security level. Each prediction market, oracle node, and trading bot operates on its own dedicated microchain for complete isolation.

**Cross-Chain Messaging**

Applications communicate across microchains asynchronously. When an oracle submits a vote or a bot executes a trade, cross-chain messages propagate the state changes. Messages are placed in the target chain's inbox and processed when the chain owner creates the next block.

**Operations and Messages**

- **Operations**: Defined by application developers, created by chain owners in block proposals
- **Messages**: Result from operation execution, sent between chains within the same application

### Linera Features Utilized

| Feature | Implementation |
|---------|----------------|
| Microchains | Each market, oracle, and bot operates on dedicated chains for isolation |
| Cross-chain Messages | Oracle votes and market resolutions propagate across chains |
| GraphQL API | Contract state queries via Node Service (`linera service`) |
| Views (RootView) | Persistent state management following Linera SDK patterns |
| Real-time Finality | Sub-500ms trade execution and confirmation |
| WASM Execution | All contracts compiled to WebAssembly for the Linera VM |

### Wallet Integration

The platform integrates with Linera-compatible browser wallets:

**CheCko Wallet** (Primary)

CheCko is a browser extension wallet developed by ResPeer that implements a "Microchain as a Service" architecture. It separates the wallet client from the Linera Node Service, allowing the browser extension to sign transactions while the node service handles block execution.

- Installation: https://github.com/respeer-ai/linera-wallet/releases
- Provider: `window.linera`
- API: Web3.js compatible interface

**Integration Code Example**:

```javascript
// Connect to CheCko wallet
const web3 = new Web3(window.linera);
const accounts = await web3.eth.requestAccounts();

// Execute Linera GraphQL mutation
await window.linera.request({
  method: 'linera_graphqlMutation',
  params: {
    publicKey: accounts[0],
    applicationId: 'your-application-id',
    query: { query: mutationString, variables: {} },
    operationName: 'PlaceTrade'
  }
});
```

**Developer Wallets**

For development and testing, use the Linera CLI to create developer wallets:

```bash
# Initialize wallet from faucet
linera wallet init --faucet https://faucet.testnet-conway.linera.net
linera wallet request-chain --faucet https://faucet.testnet-conway.linera.net

# Check balance
linera sync
linera query-balance
```

### Node Service

The Linera client runs in service mode to expose a GraphQL API:

```bash
linera service --port 8080
```

This exposes:
- GraphQL IDE at `http://localhost:8080/`
- Application endpoints at `http://localhost:8080/chains/<chain-id>/applications/<application-id>`

---

## Installation

### Prerequisites

- Node.js 20 or higher
- PostgreSQL database
- (Optional) Rust toolchain with wasm32-unknown-unknown target

### Quick Start

```bash
# Clone the repository
git clone https://github.com/your-repo/linera-prediction-markets

# Install dependencies
npm install

# Set up database schema
npm run db:push

# Start development server
npm run dev
```

### Environment Variables

```env
DATABASE_URL=postgresql://user:password@host:port/database
AI_INTEGRATIONS_OPENAI_API_KEY=your_openai_key
AI_INTEGRATIONS_OPENAI_BASE_URL=https://api.openai.com/v1
```

### Docker Deployment

```bash
docker compose up --force-recreate
```

Access the application at `http://localhost:5000`

---

## Project Structure

```
linera-prediction-markets/
├── client/                      # Frontend application
│   ├── src/
│   │   ├── components/          # Reusable UI components
│   │   ├── pages/               # Route page components
│   │   ├── hooks/               # Custom React hooks
│   │   └── lib/                 # Utility functions
│   └── index.html               # Entry HTML file
├── server/                      # Backend application
│   ├── routes/                  # API route handlers
│   │   ├── markets.ts           # Market operations
│   │   ├── ai.ts                # AI integration
│   │   ├── oracles.ts           # Oracle network
│   │   ├── bots.ts              # Trading bots
│   │   ├── analytics.ts         # Statistics
│   │   └── linera.ts            # Blockchain integration
│   ├── db.ts                    # Database connection
│   └── index.ts                 # Server entry point
├── shared/                      # Shared code
│   └── schema.ts                # Database schema (Drizzle)
├── contracts/                   # Smart contracts
│   ├── market/                  # Prediction market contract
│   ├── oracle/                  # Oracle network contract
│   ├── amm/                     # AMM liquidity contract
│   └── bot/                     # Trading bot contract
├── drizzle.config.ts            # Drizzle ORM configuration
├── package.json                 # Dependencies and scripts
└── README.md                    # This file
```

---

## API Reference

### Markets API

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/markets` | GET | List all markets |
| `/api/markets` | POST | Create new market |
| `/api/markets/:id` | GET | Get market details |
| `/api/markets/:id/trade` | POST | Execute trade |
| `/api/markets/:id/resolve` | POST | Resolve market |

### AI API

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/ai/generate-market` | POST | Generate AI-powered market |
| `/api/ai/analyze-market` | POST | Get AI analysis of market |

### Oracles API

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/oracles` | GET | List all oracles |
| `/api/oracles` | POST | Register oracle |
| `/api/oracles/:id/vote` | POST | Submit oracle vote |
| `/api/oracles/votes/:marketId` | GET | Get votes for market |

### Bots API

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/bots` | GET | List all bots |
| `/api/bots` | POST | Deploy new bot |
| `/api/bots/:id/execute` | POST | Execute bot strategy |
| `/api/bots/:id/toggle` | PATCH | Start/stop bot |

### Analytics API

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/analytics/overview` | GET | Platform statistics |

---

## User Guide

### Creating a Market

1. Navigate to the Dashboard page
2. Click "Create Market" under Quick Actions
3. For AI-generated markets, select a category (crypto, sports, technology)
4. The AI will generate a relevant prediction question
5. Market is created with default 4-day resolution window

### Trading on Markets

1. Navigate to the Markets page
2. Select an active market from the list
3. Review current odds for each outcome
4. Enter trade amount and select Buy or Sell
5. Confirm the transaction
6. Odds update in real-time based on your trade

### Participating as an Oracle

1. Navigate to the Oracles page
2. Click "Add Oracle Node" to register
3. Select your data source (API, AI, custom)
4. When markets need resolution, click "Cast Vote"
5. Select the market, choose the outcome, set confidence level
6. Once 67% consensus is reached, market resolves automatically

### Deploying a Trading Bot

1. Navigate to the Bots page
2. Click "Deploy Bot"
3. Enter bot name and select strategy:
   - **Momentum**: Buys when odds rise above 60%
   - **Contrarian**: Buys undervalued options below 30%
   - **Arbitrage**: Exploits pricing inefficiencies
4. Bot deploys on dedicated microchain
5. Click "Execute" to run strategy or toggle "Active" for automated execution

---

## Roadmap

### Phase 1: Foundation (Completed)

- Core prediction market functionality
- AI-powered market creation with GPT-5.2
- Decentralized oracle consensus network
- Automated trading bot framework
- Real-time WebSocket updates
- PostgreSQL data persistence

### Phase 2: Enhancement (Planned)

- Trusted Execution Environment (TEE) verification for oracle data
- Social features including copy trading
- Market templates for common prediction types
- Enhanced analytics and reporting

### Phase 3: Scale (Planned)

- Governance token and voting mechanism
- Advanced AMM algorithms (CPMM, LMSR)
- Mainnet deployment on Linera
- Mobile application support

---

## License

This project is licensed under the Apache-2.0 License.

---

## Acknowledgments

Built for Linera Real-Time Markets Buildathon - Wave 5

For more information about Linera, visit [linera.dev](https://linera.dev)
