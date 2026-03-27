"""gud-price: Zero-dependency Chainlink price feed reader for any EVM chain."""

from gud_price.rpc import (
    RoundData,
    RoundDataRaw,
    FeedMetadata,
    format_price,
    read_latest_price,
    read_latest_price_raw,
    read_latest_price_with_meta,
    read_prices,
    read_feed_metadata,
    read_phase_id,
    read_aggregator,
)
from gud_price.rpcs import rpcs, rpc

__all__ = [
    "RoundData",
    "RoundDataRaw",
    "FeedMetadata",
    "format_price",
    "read_latest_price",
    "read_latest_price_raw",
    "read_latest_price_with_meta",
    "read_prices",
    "read_feed_metadata",
    "read_phase_id",
    "read_aggregator",
    "rpcs",
    "rpc",
]
