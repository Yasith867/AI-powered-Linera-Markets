const DEFAULT_APP_ID = import.meta.env.VITE_LINERA_APP_ID || '';
const DEFAULT_CHAIN_ID = import.meta.env.VITE_LINERA_CHAIN_ID || '';

export const LINERA_CONFIG = {
  TESTNET_CONWAY: {
    name: 'Testnet Conway',
    faucetUrl: 'https://faucet.testnet-conway.linera.net',
    portalUrl: 'https://portal.linera.net',
  },
  
  PREDICTION_MARKET_APP_ID: DEFAULT_APP_ID,
  CHAIN_ID: DEFAULT_CHAIN_ID,
  
  getAppId(): string {
    return this.PREDICTION_MARKET_APP_ID;
  },
  
  getChainId(): string {
    return this.CHAIN_ID;
  },
  
  isConfigured(): boolean {
    return this.PREDICTION_MARKET_APP_ID.length > 0 && 
           !this.PREDICTION_MARKET_APP_ID.includes('placeholder');
  }
};

export const GRAPHQL_OPERATIONS = {
  PLACE_TRADE: `
    mutation PlaceTrade($marketId: Int!, $optionIndex: Int!, $amount: Float!, $isBuy: Boolean!) {
      placeTrade(marketId: $marketId, optionIndex: $optionIndex, amount: $amount, isBuy: $isBuy)
    }
  `,
  
  CREATE_MARKET: `
    mutation CreateMarket($title: String!, $description: String!, $category: String!, $options: [String!]!, $initialLiquidity: Int!) {
      createMarket(title: $title, description: $description, category: $category, options: $options, initialLiquidity: $initialLiquidity)
    }
  `,
  
  RESOLVE_MARKET: `
    mutation ResolveMarket($marketId: Int!, $outcome: Int!) {
      resolveMarket(marketId: $marketId, outcome: $outcome)
    }
  `,
  
  GET_MARKETS: `
    query GetMarkets {
      markets {
        marketId
        title
        description
        category
        options
        odds
        totalVolume
        liquidity
        status
      }
    }
  `,
  
  GET_MARKET: `
    query GetMarket($marketId: Int!) {
      market(marketId: $marketId) {
        marketId
        title
        description
        category
        options
        odds
        totalVolume
        liquidity
        status
        resolvedOutcome
        tradeCount
      }
    }
  `,
};
