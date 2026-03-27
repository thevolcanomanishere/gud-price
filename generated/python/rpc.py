"""Chainlink price feed RPC client -- zero external dependencies."""

from __future__ import annotations

import json
import urllib.error
import urllib.request
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Dict

# -- Function selectors -------------------------------------------------------

SEL_DECIMALS = "0x313ce567"
SEL_DESCRIPTION = "0x7284e416"
SEL_LATEST_ROUND_DATA = "0xfeaf968c"
SEL_GET_ROUND_DATA = "0x9a6fc8f5"
SEL_PHASE_ID = "0x58303b10"
SEL_PHASE_AGGREGATORS = "0xc1597304"
SEL_AGGREGATOR = "0x245a7bfc"

# -- Data classes --------------------------------------------------------------


@dataclass
class FeedMetadata:
    """Decimals and human-readable description of a Chainlink feed."""

    decimals: int
    description: str


@dataclass
class RoundData:
    """Decoded round data with the price formatted as a decimal string."""

    round_id: int
    answer: str
    started_at: datetime
    updated_at: datetime
    answered_in_round: int
    description: str = ""


@dataclass
class RoundDataRaw:
    """Raw round data with all values as plain integers."""

    round_id: int
    answer: int
    started_at: int
    updated_at: int
    answered_in_round: int


# -- ABI helpers ---------------------------------------------------------------


def read_word(hex_str: str, slot: int) -> int:
    """Read a 256-bit word from *hex_str* at the given 32-byte slot index."""
    start = 2 + slot * 64  # skip "0x"
    raw = hex_str[start : start + 64]
    if not raw:
        return 0
    return int(raw, 16)


def read_signed_word(hex_str: str, slot: int) -> int:
    """Read a signed 256-bit word (two's complement) at *slot*."""
    val = read_word(hex_str, slot)
    if val >= (1 << 255):
        val -= 1 << 256
    return val


def decode_string(hex_str: str) -> str:
    """Decode a Solidity ABI-encoded ``string`` return value."""
    offset = read_word(hex_str, 0)  # byte offset to string data
    char_offset = 2 + offset * 2
    length = int(hex_str[char_offset : char_offset + 64], 16)
    str_hex = hex_str[char_offset + 64 : char_offset + 64 + length * 2]
    return bytes.fromhex(str_hex).decode("utf-8")


def encode_uint(value: int) -> str:
    """ABI-encode a uint argument (left-padded to 32 bytes)."""
    return format(value, "064x")


def format_price(raw: int, decimals: int) -> str:
    """Format a raw integer price using the feed's decimal count.

    >>> format_price(123456789, 8)
    '1.23456789'
    >>> format_price(0, 8)
    '0'
    """
    if raw == 0:
        return "0"
    negative = raw < 0
    abs_val = -raw if negative else raw
    s = str(abs_val)
    if decimals == 0:
        return ("-" if negative else "") + s

    s = s.zfill(decimals + 1)
    int_part = s[: len(s) - decimals]
    frac_part = s[len(s) - decimals :].rstrip("0")
    result = f"{int_part}.{frac_part}" if frac_part else int_part
    return ("-" if negative else "") + result


# -- JSON-RPC transport --------------------------------------------------------

_rpc_id_counter = 0


def eth_call(rpc_url: str, to: str, data: str) -> str:
    """Perform an ``eth_call`` via JSON-RPC and return the hex result."""
    global _rpc_id_counter
    _rpc_id_counter += 1

    payload = json.dumps(
        {
            "jsonrpc": "2.0",
            "id": _rpc_id_counter,
            "method": "eth_call",
            "params": [{"to": to, "data": data}, "latest"],
        }
    ).encode("utf-8")

    req = urllib.request.Request(
        rpc_url,
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            body = json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        raise RuntimeError(f"RPC HTTP error {e.code}: {e.read().decode('utf-8', errors='replace')}")
    except urllib.error.URLError as e:
        raise RuntimeError(f"RPC connection error: {e.reason}")

    if "error" in body and body["error"]:
        err = body["error"]
        if isinstance(err, dict):
            msg = err.get("message", str(err))
        else:
            msg = str(err)
        raise RuntimeError(f"RPC error: {msg}")
    return body["result"]


# -- Internal round-data parsing -----------------------------------------------


def _parse_round_data_raw(hex_str: str) -> RoundDataRaw:
    return RoundDataRaw(
        round_id=read_word(hex_str, 0),
        answer=read_signed_word(hex_str, 1),
        started_at=read_word(hex_str, 2),
        updated_at=read_word(hex_str, 3),
        answered_in_round=read_word(hex_str, 4),
    )


def _format_round(raw: RoundDataRaw, decimals: int, description: str) -> RoundData:
    return RoundData(
        round_id=raw.round_id,
        answer=format_price(raw.answer, decimals),
        started_at=datetime.fromtimestamp(raw.started_at, tz=timezone.utc),
        updated_at=datetime.fromtimestamp(raw.updated_at, tz=timezone.utc),
        answered_in_round=raw.answered_in_round,
        description=description,
    )


# -- Public API ----------------------------------------------------------------


def read_feed_metadata(rpc_url: str, address: str) -> FeedMetadata:
    """Read decimals and description from a Chainlink price feed contract."""
    dec_hex = eth_call(rpc_url, address, SEL_DECIMALS)
    desc_hex = eth_call(rpc_url, address, SEL_DESCRIPTION)
    return FeedMetadata(
        decimals=read_word(dec_hex, 0),
        description=decode_string(desc_hex),
    )


def read_latest_price(rpc_url: str, address: str) -> RoundData:
    """Read the latest price, formatted as a decimal string."""
    meta = read_feed_metadata(rpc_url, address)
    hex_data = eth_call(rpc_url, address, SEL_LATEST_ROUND_DATA)
    return _format_round(_parse_round_data_raw(hex_data), meta.decimals, meta.description)


def read_latest_price_with_meta(
    rpc_url: str, address: str, meta: FeedMetadata
) -> RoundData:
    """Read the latest price using pre-fetched metadata (saves 2 RPC calls)."""
    hex_data = eth_call(rpc_url, address, SEL_LATEST_ROUND_DATA)
    return _format_round(_parse_round_data_raw(hex_data), meta.decimals, meta.description)


def read_latest_price_raw(rpc_url: str, address: str) -> RoundDataRaw:
    """Read the latest round data as raw integer values."""
    hex_data = eth_call(rpc_url, address, SEL_LATEST_ROUND_DATA)
    return _parse_round_data_raw(hex_data)


def read_price_at_round(rpc_url: str, address: str, round_id: int) -> RoundData:
    """Read the price at a specific Chainlink round ID."""
    meta = read_feed_metadata(rpc_url, address)
    hex_data = eth_call(
        rpc_url, address, SEL_GET_ROUND_DATA + encode_uint(round_id)
    )
    return _format_round(_parse_round_data_raw(hex_data), meta.decimals, meta.description)


def read_phase_id(rpc_url: str, address: str) -> int:
    """Read the current phase ID from a Chainlink feed proxy."""
    hex_data = eth_call(rpc_url, address, SEL_PHASE_ID)
    return read_word(hex_data, 0)


def read_aggregator(rpc_url: str, address: str) -> str:
    """Read the current aggregator contract address."""
    hex_data = eth_call(rpc_url, address, SEL_AGGREGATOR)
    return "0x" + hex_data[26:66]


def read_phase_aggregator(rpc_url: str, address: str, phase_id: int) -> str:
    """Read the aggregator contract address for a specific phase."""
    hex_data = eth_call(
        rpc_url, address, SEL_PHASE_AGGREGATORS + encode_uint(phase_id)
    )
    return "0x" + hex_data[26:66]


def read_prices(
    rpc_url: str, feeds: Dict[str, str]
) -> Dict[str, RoundData]:
    """Read latest prices from multiple Chainlink feeds."""
    result: Dict[str, RoundData] = {}
    for name, address in feeds.items():
        result[name] = read_latest_price(rpc_url, address)
    return result
