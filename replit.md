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
- Complete frontend with Dashboard, Markets, Oracles, Bots, Analytics pages
- Backend API with WebSocket real-time updates
- Linera Rust contracts for all 4 components
- AI market creation using GPT-5.2
- Oracle consensus with 67% threshold
- Three trading bot strategies

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
