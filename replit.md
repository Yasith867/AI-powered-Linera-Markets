# Linera AI-Powered Prediction Market Infrastructure

## Overview
A comprehensive prediction market platform built for the Linera Real-Time Markets Buildathon (Wave 5). The project demonstrates advanced use of Linera's microchain architecture with AI-powered market creation, oracle consensus, and automated trading.

## Project Architecture

### Frontend (React + TypeScript + Vite)
- Location: `client/`
- Port: 5000 (bound to 0.0.0.0)
- Key components:
  - Dashboard with real-time stats
  - Markets listing and trading interface
  - Oracle network management
  - Trading bot deployment
  - Analytics dashboard

### Backend (Node.js + Express)
- Location: `server/`
- Port: 3001 (internal API)
- Routes:
  - `/api/markets` - Market CRUD and trading
  - `/api/oracles` - Oracle node management
  - `/api/bots` - Trading bot operations
  - `/api/ai` - AI market generation
  - `/api/analytics` - Statistics and reporting
- WebSocket: `/ws` for real-time updates

### Linera Smart Contracts (Rust/WASM)
- Location: `contracts/`
- Contracts:
  - `market/` - Prediction market logic
  - `oracle/` - Oracle consensus network
  - `amm/` - Automated market maker
  - `bot/` - Trading bot framework

### Database (PostgreSQL)
- Schema: `shared/schema.ts`
- Tables: markets, trades, oracle_nodes, oracle_votes, trading_bots, market_events

## Key Features

1. **AI Market Creation**
   - Uses OpenAI GPT-5.2 via Replit AI Integrations
   - One-click market generation for crypto, sports, technology

2. **Oracle Consensus**
   - 67% weighted consensus for resolution
   - Cross-chain message passing
   - Multiple data sources supported

3. **AMM Pricing**
   - Dynamic odds based on trading activity
   - Constant product formula
   - Automatic liquidity management

4. **Trading Bots**
   - Momentum, Contrarian, Arbitrage strategies
   - Dedicated microchains per bot
   - Configurable trade parameters

## Development Commands

```bash
npm run dev          # Start both frontend and backend
npm run dev:server   # Start backend only
npm run dev:client   # Start frontend only
npm run db:push      # Push schema to database
npm run build        # Build for production
```

## Environment Variables

- `DATABASE_URL` - PostgreSQL connection string
- `AI_INTEGRATIONS_OPENAI_API_KEY` - OpenAI API key (auto-managed)
- `AI_INTEGRATIONS_OPENAI_BASE_URL` - OpenAI base URL (auto-managed)
- `SESSION_SECRET` - Session encryption key

## Recent Changes

- Initial Wave 5 buildathon submission
- Complete frontend with Dashboard, Demo, Markets, Oracles, Bots, Analytics pages
- **Demo page** showcasing all features, architecture, contracts, and deployment steps
- Backend API with WebSocket real-time updates
- Linera Rust contracts for all 4 components
- AI market creation using GPT-5.2
- Oracle consensus with 67% threshold
- Three trading bot strategies
- CheCko wallet integration using linera_graphqlMutation RPC
- Neon/cyberpunk UI theme with glowing effects
- Real-time server status indicator
- Centralized app ID configuration (linera-config.ts)

## Smart Contract Deployment

### Deploy to Testnet Conway

```bash
# 1. Install Linera CLI
curl -sSL https://get.linera.io | sh

# 2. Add WASM target
rustup target add wasm32-unknown-unknown

# 3. Run deployment script
cd contracts && ./deploy.sh
```

### Manual Deployment

```bash
# Initialize wallet
linera wallet init --faucet https://faucet.testnet-conway.linera.net
linera wallet request-chain --faucet https://faucet.testnet-conway.linera.net

# Build contracts
cd contracts/market
cargo build --release --target wasm32-unknown-unknown

# Deploy
linera publish-and-create \
  ../target/wasm32-unknown-unknown/release/prediction_market_contract.wasm \
  ../target/wasm32-unknown-unknown/release/prediction_market_service.wasm \
  --json-argument '{"admin": null, "oracle_threshold": 67}'
```

### Update Application ID

After deployment, update `client/src/lib/linera-config.ts`:
```typescript
PREDICTION_MARKET_APP_ID: 'your-deployed-app-id-here',
```

## Wallet Integration

### CheCko Wallet (by ResPeer)
- Browser extension wallet for Linera blockchain
- Uses `linera_graphqlMutation` RPC for real on-chain transactions
- Install from: https://github.com/respeer-ai/linera-wallet/releases

### RPC Methods Used
- `eth_requestAccounts` - Connect wallet, get public key
- `linera_graphqlMutation` - Send transactions via GraphQL
- `linera_graphqlQuery` - Query application state

### Transaction Flow
```typescript
// 1. Connect wallet
const web3 = new Web3(window.linera);
const accounts = await web3.eth.requestAccounts();

// 2. Send transaction via GraphQL mutation
const result = await window.linera.request({
  method: 'linera_graphqlMutation',
  params: {
    publicKey: accounts[0],
    applicationId: 'your-app-id',
    query: {
      query: 'mutation PlaceTrade(...) { ... }',
      variables: { marketId: 1, optionIndex: 0, amount: 100 }
    },
    operationName: 'PlaceTrade'
  }
});
```

### Demo Mode
- For testing without CheCko, app provides mock wallet mode
- Generates simulated addresses for UI testing

## User Preferences

- Modern dark theme UI
- Real-time WebSocket updates
- Linera branding with green accent (#00ff88)
- Testnet Conway integration badge

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite, TailwindCSS, Recharts, wouter
- **Backend**: Node.js, Express, WebSocket (ws), Drizzle ORM
- **Database**: PostgreSQL
- **AI**: OpenAI via Replit AI Integrations
- **Blockchain**: Linera (Rust/WASM contracts)
