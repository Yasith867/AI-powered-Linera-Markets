# Linera Markets

## Overview

Linera Markets is a decentralized prediction market platform built on the Linera blockchain. The platform enables users to create prediction markets on real-world events, trade on market outcomes using an automated market maker (AMM), participate as oracles for outcome verification, and deploy automated trading bots. The application leverages AI (GPT/Cloudflare Workers AI) to automatically generate prediction markets based on current events.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 19 with TypeScript
- **Routing**: Wouter (lightweight router)
- **Styling**: Tailwind CSS with custom neon-themed design system
- **Build Tool**: Vite with React plugin
- **State Management**: React hooks (useState, useEffect) with custom hooks for API calls and WebSocket connections
- **Charts**: Recharts for data visualization

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ESM modules
- **Real-time Communication**: WebSocket server (ws library) for live updates
- **API Pattern**: RESTful routes organized by domain (markets, oracles, bots, ai, analytics, linera)
- **Development**: tsx for TypeScript execution with watch mode

### Data Storage
- **Database**: PostgreSQL via Neon serverless
- **ORM**: Drizzle ORM with drizzle-zod for schema validation
- **Schema Location**: `shared/schema.ts` contains all table definitions
- **Key Tables**: markets, trades, oracle_nodes, oracle_votes, trading_bots, market_events, conversations, messages

### Deployment Architecture
- **Platform**: Vercel with serverless functions
- **API Routes**: Vercel serverless functions in `/api` directory for production
- **Static Assets**: Built to `dist/public` via Vite
- **Build Process**: Vite builds client, separate server build for local development

### Key Design Patterns
- **Shared Schema**: Database schema shared between client and server via `@shared` path alias
- **Broadcast Pattern**: WebSocket broadcast function passed to route handlers for real-time updates
- **Dual AI Provider**: Supports both OpenAI and Cloudflare Workers AI with automatic fallback
- **Microchain Simulation**: Linera blockchain integration simulated via `server/linera/client.ts`

## External Dependencies

### Database
- **Neon PostgreSQL**: Serverless PostgreSQL database (`@neondatabase/serverless`)
- **Connection**: Via `DATABASE_URL` environment variable

### AI Services
- **OpenAI API**: Primary AI provider for market generation (GPT-4o-mini, GPT-5.2)
- **Cloudflare Workers AI**: Alternative AI provider (Llama 3 8B Instruct)
- **Environment Variables**: `OPENAI_API_KEY`, `CLOUDFLARE_API_KEY`, `CLOUDFLARE_ACCOUNT_ID`

### Blockchain Integration
- **Linera Network**: Testnet Conway integration
- **Web3.js**: For wallet interactions
- **Wallet Support**: CheCko and Croissant wallets
- **Environment Variables**: `VITE_LINERA_APP_ID`, `VITE_LINERA_CHAIN_ID`

### Third-Party Libraries
- **Zod**: Schema validation with `zod-validation-error` for error formatting
- **p-limit/p-retry**: Rate limiting and retry logic for batch AI operations
- **concurrently**: Parallel process execution for development