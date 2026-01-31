use linera_sdk::{
    base::ChainId,
    views::{linera_views, MapView, RegisterView, RootView, ViewStorageContext},
};
use prediction_market::MarketState;

#[derive(RootView, async_graphql::SimpleObject)]
#[view(context = "ViewStorageContext")]
pub struct ApplicationState {
    pub admin: RegisterView<Option<String>>,
    pub oracle_threshold: RegisterView<u64>,
    pub market_counter: RegisterView<u64>,
    pub markets: MapView<u64, MarketState>,
    pub oracle_votes: MapView<(u64, ChainId), (u8, u64)>,
}
