const DEFAULT_APP_ID = 'e476187f6ddfeb9d588c7b45d3df334d5501d6499b3f9ad5595cae86cce16a65010000000000000000000000e476187f6ddfeb9d588c7b45d3df334d5501d6499b3f9ad5595cae86cce16a65030000000000000000000000';

export const LINERA_CONFIG = {
  TESTNET_CONWAY: {
    name: 'Testnet Conway',
    faucetUrl: 'https://faucet.testnet-conway.linera.net',
    portalUrl: 'https://portal.linera.net',
  },
  
  PREDICTION_MARKET_APP_ID: DEFAULT_APP_ID,
  
  getAppId(): string {
    return this.PREDICTION_MARKET_APP_ID;
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
