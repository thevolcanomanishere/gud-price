"""Lookup from feed address to chain name, built from existing feed modules."""

from gud_price.arbitrum import arbitrum_feeds
from gud_price.base import base_feeds
from gud_price.ethereum import ethereum_feeds
from gud_price.polygon import polygon_feeds

_feed_chains: dict[str, str] = {}
for _addr in arbitrum_feeds.values():
    _feed_chains[_addr.lower()] = "arbitrum"
for _addr in base_feeds.values():
    _feed_chains[_addr.lower()] = "base"
for _addr in ethereum_feeds.values():
    _feed_chains[_addr.lower()] = "ethereum"
for _addr in polygon_feeds.values():
    _feed_chains[_addr.lower()] = "polygon"


def feed_chain(address: str) -> str | None:
    """Get the chain name for a known feed address."""
    return _feed_chains.get(address.lower())
