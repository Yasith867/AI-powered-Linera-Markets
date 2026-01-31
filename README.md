# 🏆 Linera AI-Powered Prediction Market Infrastructure

> **Real-Time Markets Buildathon - Wave 5 Submission**

A comprehensive prediction market infrastructure built on Linera's microchain architecture, featuring AI-powered market creation, decentralized oracle consensus, automated trading bots, and real-time analytics.

## 🎯 Project Overview

This project demonstrates the full potential of Linera's real-time blockchain capabilities by combining:

- **AI Market Creator Agent** - Automatically generates prediction markets using GPT-5.2
- **Multi-Microchain Oracle Network** - Decentralized data verification with 67% consensus
- **Real-Time AMM** - Automated market making with dynamic pricing
- **Trading Bot Framework** - Customizable automated trading strategies
- **Cross-Chain Messaging** - Seamless coordination between microchains

## ⚡ Key Features

### 1. AI-Powered Market Creation
- One-click AI market generation for crypto, sports, technology categories
- GPT-5.2 powered market question and option generation
- Automatic category classification and event timing

### 2. Oracle Consensus Network
- Multiple oracle nodes voting on outcomes
- 67% weighted consensus for market resolution
- Data source verification and accuracy tracking
- Cross-chain message passing for votes

### 3. Automated Market Maker (AMM)
- Dynamic odds adjustment based on trading activity
- Liquidity pool management per market
- Constant product formula (k = x * y)
- Fee collection and volume tracking

### 4. Trading Bot Framework
Three built-in strategies:
- **Momentum**: Follows market trends
- **Contrarian**: Bets against the crowd
- **Arbitrage**: Exploits pricing inefficiencies

### 5. Real-Time Dashboard
- WebSocket-powered live updates
- Market volume and trade visualization
- Oracle vote tracking
- Bot performance analytics

## 🛠️ Technical Stack

### Linera Contracts (Rust/WASM)
- `prediction-market`: Core market logic with position tracking
- `oracle-network`: Decentralized voting and consensus
- `amm-liquidity`: Automated market making pools
- `trading-bot`: Automated strategy execution

### Backend (Node.js/Express)
- RESTful API for market operations
- WebSocket server for real-time updates
- OpenAI integration for AI features
- PostgreSQL for data persistence

### Frontend (React/TypeScript)
- Vite-powered development
- TailwindCSS styling
- Recharts for data visualization
- Real-time WebSocket client

## 📊 Linera Features Used

| Feature | Implementation |
|---------|----------------|
| Microchains | Each market, oracle, and bot runs on dedicated chains |
| Cross-chain Messages | Oracle votes and market resolutions |
| GraphQL API | Contract state queries |
| Views | Persistent state management |
| Real-time Finality | Sub-500ms trade execution |

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- PostgreSQL database
- (Optional) Rust + wasm32-unknown-unknown target

### Installation

```bash
# Clone the repository
git clone https://github.com/your-repo/linera-prediction-markets

# Install dependencies
npm install

# Set up database
npm run db:push

# Start development server
npm run dev
```

### Environment Variables

```env
DATABASE_URL=postgresql://...
AI_INTEGRATIONS_OPENAI_API_KEY=...
AI_INTEGRATIONS_OPENAI_BASE_URL=...
```

## 🐳 Docker Deployment

```bash
# Build and run with Docker Compose
docker compose up --force-recreate
```

Access the application at `http://localhost:5173`

## 📁 Project Structure

```
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # UI components
│   │   ├── pages/          # Route pages
│   │   └── hooks/          # Custom React hooks
├── server/                 # Express backend
│   ├── routes/             # API endpoints
│   └── db.ts               # Database connection
├── contracts/              # Linera Rust contracts
│   ├── market/             # Prediction market contract
│   ├── oracle/             # Oracle network contract
│   ├── amm/                # AMM liquidity contract
│   └── bot/                # Trading bot contract
├── shared/                 # Shared types and schema
└── docker-compose.yaml     # Container orchestration
```

## 🎮 Usage

### Create a Market
1. Navigate to Dashboard
2. Click "AI Create [category]" button
3. Market is generated and deployed automatically

### Trade on Markets
1. Go to Markets page
2. Select a market
3. Choose an option and enter amount
4. Click Buy or Sell

### Deploy a Trading Bot
1. Navigate to Bots page
2. Click "Deploy Bot"
3. Choose a strategy (Momentum, Contrarian, Arbitrage)
4. Bot executes trades automatically

### Add an Oracle
1. Go to Oracles page
2. Click "Add Oracle Node"
3. Select data source
4. Oracle participates in consensus voting

## 📈 Judging Criteria Alignment

| Criteria | Score Focus |
|----------|-------------|
| **Working Demo (30%)** | Fully functional with AI market creation, trading, oracles, bots |
| **Linera Integration (30%)** | 4 contracts, cross-chain messaging, microchain architecture |
| **Creativity & UX (20%)** | AI-powered features, real-time updates, modern UI |
| **Scalability (10%)** | Parallel microchains, independent execution |
| **Vision & Roadmap (10%)** | Clear path to mainnet, TEE oracles, governance |

## 🗺️ Roadmap

### Phase 1 (Current)
- ✅ Core prediction market functionality
- ✅ AI market creation
- ✅ Oracle consensus network
- ✅ Trading bot framework

### Phase 2
- [ ] TEE verification for oracle data
- [ ] Social features (copy trading)
- [ ] Market templates

### Phase 3
- [ ] Governance voting
- [ ] Advanced AMM algorithms
- [ ] Mainnet deployment

## 👥 Team

- **Developer**: Building on Linera for Real-Time Markets Buildathon

## 📄 License

Apache-2.0

---

**Built for Linera Real-Time Markets Buildathon - Wave 5**

*Don't Be Late. Be Real-Time.* ⚡
