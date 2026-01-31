# Linera Prediction Market Smart Contracts

This directory contains the Rust/WASM smart contracts for the Linera prediction market platform.

## Prerequisites

1. **Install Linera CLI:**
```bash
curl -sSL https://get.linera.io | sh
```

2. **Install Rust with WASM target:**
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
rustup target add wasm32-unknown-unknown
```

## Contracts

### 1. Market Contract (`market/`)
Core prediction market functionality:
- Create markets with multiple options
- Place trades (buy/sell)
- AMM-based pricing
- Market resolution
- Payout claims

### 2. Oracle Contract (`oracle/`)
Decentralized oracle consensus:
- Submit votes with weights
- 67% consensus threshold
- Cross-chain voting

### 3. AMM Contract (`amm/`)
Automated Market Maker:
- Constant product formula
- Liquidity provision
- Dynamic pricing

### 4. Bot Contract (`bot/`)
Trading bot framework:
- Strategy execution
- Microchain isolation

## Quick Deploy

```bash
./deploy.sh
```

## Manual Deployment

### Step 1: Initialize Wallet
```bash
linera wallet init --faucet https://faucet.testnet-conway.linera.net
linera wallet request-chain --faucet https://faucet.testnet-conway.linera.net
```

### Step 2: Build Contracts
```bash
cd market
cargo build --release --target wasm32-unknown-unknown
```

### Step 3: Deploy
```bash
linera publish-and-create \
  ../target/wasm32-unknown-unknown/release/prediction_market_contract.wasm \
  ../target/wasm32-unknown-unknown/release/prediction_market_service.wasm \
  --json-argument '{"admin": null, "oracle_threshold": 67}'
```

### Step 4: Get Application ID
The `publish-and-create` command outputs the application ID. Copy this and update:
- `client/src/lib/linera-config.ts` - `PREDICTION_MARKET_APP_ID`

### Step 5: Start Node Service
```bash
linera service
```

Open http://localhost:8080 to access GraphiQL.

## GraphQL API

### Queries

```graphql
# Get all markets
query {
  markets {
    marketId
    title
    status
    odds
  }
}

# Get specific market
query {
  market(marketId: 1) {
    title
    options
    odds
    totalVolume
  }
}
```

### Mutations (via CheCko wallet)

```graphql
# Place a trade
mutation {
  placeTrade(marketId: 1, optionIndex: 0, amount: 100000, isBuy: true)
}

# Create a market
mutation {
  createMarket(
    title: "Will BTC reach $100k?",
    description: "...",
    category: "crypto",
    options: ["Yes", "No"],
    initialLiquidity: 1000000
  )
}
```

## Architecture

```
Frontend (React) 
    ↓ window.linera.request()
CheCko Wallet
    ↓ linera_graphqlMutation
Linera Node Service
    ↓ GraphQL
Prediction Market Contract (WASM)
    ↓ State Updates
Linera Microchain
```

## Contract ABI

The contract exposes these operations:

| Operation | Parameters | Description |
|-----------|------------|-------------|
| CreateMarket | title, description, category, options, liquidity | Create new market |
| PlaceTrade | market_id, option_index, amount, is_buy | Execute trade |
| ResolveMarket | market_id, outcome | Resolve with winning option |
| ClaimPayout | market_id | Claim winnings |
| AddLiquidity | market_id, amount | Add market liquidity |
| SubmitOracleVote | market_id, outcome, weight | Oracle consensus vote |

## Testnet Conway

- **Faucet:** https://faucet.testnet-conway.linera.net
- **Explorer:** https://portal.linera.net
- **Docs:** https://linera.dev

## Development

```bash
# Check wallet
linera wallet show

# List chains
linera wallet list

# Query balance
linera query-balance <CHAIN_ID>
```
