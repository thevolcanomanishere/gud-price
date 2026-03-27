"""gud-price: Zero-dependency Chainlink price feed reader for any EVM chain."""

from gud_price.rpc import (
    FeedMetadata,
    RoundData,
    RoundDataRaw,
    format_price,
    read_aggregator,
    read_feed_metadata,
    read_latest_price,
    read_latest_price_raw,
    read_latest_price_with_meta,
    read_phase_id,
    read_prices,
)
from gud_price.rpcs import rpc, rpcs

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
