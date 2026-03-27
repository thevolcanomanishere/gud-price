//! Lookup from feed address to chain name, built from existing feed modules.

use std::collections::HashMap;
use std::sync::LazyLock;

static FEED_CHAINS: LazyLock<HashMap<String, &'static str>> = LazyLock::new(|| {
    let mut m = HashMap::new();
    for (_, addr) in crate::arbitrum::ARBITRUM_FEEDS.entries() {
        m.insert(addr.to_lowercase(), "arbitrum");
    }
    for (_, addr) in crate::base::BASE_FEEDS.entries() {
        m.insert(addr.to_lowercase(), "base");
    }
    for (_, addr) in crate::ethereum::ETHEREUM_FEEDS.entries() {
        m.insert(addr.to_lowercase(), "ethereum");
    }
    for (_, addr) in crate::polygon::POLYGON_FEEDS.entries() {
        m.insert(addr.to_lowercase(), "polygon");
    }
    m
});

/// Get the chain name for a known feed address.
pub fn feed_chain(address: &str) -> Option<&'static str> {
    FEED_CHAINS.get(&address.to_lowercase()).copied()
}
