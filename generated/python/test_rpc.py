"""Tests for the Chainlink RPC client (rpc.py)."""

import io
import json
import unittest
from datetime import datetime, timezone
from unittest.mock import MagicMock, patch

from gud_price.rpc import (
    RoundData,
    RoundDataRaw,
    FeedMetadata,
    SEL_DECIMALS,
    SEL_DESCRIPTION,
    SEL_LATEST_ROUND_DATA,
    SEL_AGGREGATOR,
    SEL_PHASE_ID,
    decode_string,
    encode_uint,
    eth_call,
    format_price,
    read_aggregator,
    read_feed_metadata,
    read_latest_price,
    read_latest_price_raw,
    read_latest_price_with_meta,
    read_phase_id,
    read_prices,
    read_word,
    read_signed_word,
)

RPC_URL = "https://rpc.example.com"
FEED_ADDR = "0x1234567890abcdef1234567890abcdef12345678"


def _pad_word(val: int) -> str:
    """Return a 64-hex-char zero-padded representation of *val*."""
    return format(val & ((1 << 256) - 1), "064x")


def _make_rpc_response(result_hex: str) -> bytes:
    return json.dumps({"jsonrpc": "2.0", "id": 1, "result": result_hex}).encode()


def _mock_urlopen(response_bytes: bytes):
    """Return a context-manager mock suitable for ``urllib.request.urlopen``."""
    cm = MagicMock()
    cm.__enter__ = MagicMock(return_value=MagicMock(read=MagicMock(return_value=response_bytes)))
    cm.__exit__ = MagicMock(return_value=False)
    return cm


# -- format_price tests -------------------------------------------------------


class TestFormatPrice(unittest.TestCase):
    def test_zero(self):
        self.assertEqual(format_price(0, 8), "0")

    def test_no_decimals(self):
        self.assertEqual(format_price(42, 0), "42")

    def test_basic(self):
        # 123456789 with 8 decimals => 1.23456789
        self.assertEqual(format_price(123456789, 8), "1.23456789")

    def test_trailing_zeros_stripped(self):
        # 123400000 with 8 decimals => 1.234
        self.assertEqual(format_price(123400000, 8), "1.234")

    def test_whole_number(self):
        # 100000000 with 8 decimals => 1
        self.assertEqual(format_price(100000000, 8), "1")

    def test_negative(self):
        self.assertEqual(format_price(-123456789, 8), "-1.23456789")

    def test_small_value(self):
        # 1 with 8 decimals => 0.00000001
        self.assertEqual(format_price(1, 8), "0.00000001")

    def test_large_value(self):
        # ETH ~$3500 with 8 decimals
        self.assertEqual(format_price(350000000000, 8), "3500")

    def test_negative_zero_decimals(self):
        self.assertEqual(format_price(-7, 0), "-7")


# -- Hex helper tests ----------------------------------------------------------


class TestHexHelpers(unittest.TestCase):
    def test_read_word_slot0(self):
        hex_str = "0x" + _pad_word(255)
        self.assertEqual(read_word(hex_str, 0), 255)

    def test_read_word_slot1(self):
        hex_str = "0x" + _pad_word(1) + _pad_word(42)
        self.assertEqual(read_word(hex_str, 1), 42)

    def test_read_signed_word_positive(self):
        hex_str = "0x" + _pad_word(100)
        self.assertEqual(read_signed_word(hex_str, 0), 100)

    def test_read_signed_word_negative(self):
        # -1 in two's complement is all f's
        neg1 = (1 << 256) - 1
        hex_str = "0x" + _pad_word(neg1)
        self.assertEqual(read_signed_word(hex_str, 0), -1)

    def test_encode_uint(self):
        self.assertEqual(len(encode_uint(1)), 64)
        self.assertEqual(encode_uint(0), "0" * 64)
        self.assertTrue(encode_uint(255).endswith("ff"))

    def test_decode_string(self):
        # ABI encoding for "ETH / USD":
        # slot 0: offset = 0x20 (32)
        # at byte 32: length = 9
        # then "ETH / USD" as hex
        text = "ETH / USD"
        text_hex = text.encode().hex()
        # pad text_hex to multiple of 64
        padded_text = text_hex.ljust(64, "0")
        hex_str = "0x" + _pad_word(32) + _pad_word(len(text)) + padded_text
        self.assertEqual(decode_string(hex_str), "ETH / USD")


# -- eth_call tests ------------------------------------------------------------


class TestEthCall(unittest.TestCase):
    @patch("gud_price.rpc.urllib.request.urlopen")
    def test_success(self, mock_urlopen):
        result_hex = "0x" + _pad_word(8)
        mock_urlopen.return_value = _mock_urlopen(_make_rpc_response(result_hex))
        got = eth_call(RPC_URL, FEED_ADDR, SEL_DECIMALS)
        self.assertEqual(got, result_hex)

    @patch("gud_price.rpc.urllib.request.urlopen")
    def test_rpc_error_raises(self, mock_urlopen):
        error_resp = json.dumps(
            {"jsonrpc": "2.0", "id": 1, "error": {"message": "execution reverted"}}
        ).encode()
        mock_urlopen.return_value = _mock_urlopen(error_resp)
        with self.assertRaises(RuntimeError) as ctx:
            eth_call(RPC_URL, FEED_ADDR, SEL_DECIMALS)
        self.assertIn("execution reverted", str(ctx.exception))


# -- read_feed_metadata tests --------------------------------------------------


class TestReadFeedMetadata(unittest.TestCase):
    @patch("gud_price.rpc.urllib.request.urlopen")
    def test_read_metadata(self, mock_urlopen):
        # First call: decimals => 8
        dec_hex = "0x" + _pad_word(8)
        # Second call: description => "ETH / USD"
        text = "ETH / USD"
        text_hex = text.encode().hex().ljust(64, "0")
        desc_hex = "0x" + _pad_word(32) + _pad_word(len(text)) + text_hex

        responses = [
            _mock_urlopen(_make_rpc_response(dec_hex)),
            _mock_urlopen(_make_rpc_response(desc_hex)),
        ]
        mock_urlopen.side_effect = responses

        meta = read_feed_metadata(FEED_ADDR, RPC_URL)
        self.assertEqual(meta.decimals, 8)
        self.assertEqual(meta.description, "ETH / USD")


# -- Round data tests ----------------------------------------------------------

# Build a latestRoundData response:
#   roundId=100, answer=350000000000 (3500.00 with 8 dec),
#   startedAt=1700000000, updatedAt=1700000100, answeredInRound=100
_ROUND_HEX = (
    "0x"
    + _pad_word(100)
    + _pad_word(350000000000)
    + _pad_word(1700000000)
    + _pad_word(1700000100)
    + _pad_word(100)
)


class TestReadLatestPriceRaw(unittest.TestCase):
    @patch("gud_price.rpc.urllib.request.urlopen")
    def test_raw(self, mock_urlopen):
        mock_urlopen.return_value = _mock_urlopen(_make_rpc_response(_ROUND_HEX))
        raw = read_latest_price_raw(FEED_ADDR, RPC_URL)
        self.assertIsInstance(raw, RoundDataRaw)
        self.assertEqual(raw.round_id, 100)
        self.assertEqual(raw.answer, 350000000000)
        self.assertEqual(raw.started_at, 1700000000)
        self.assertEqual(raw.updated_at, 1700000100)
        self.assertEqual(raw.answered_in_round, 100)


class TestReadLatestPrice(unittest.TestCase):
    @patch("gud_price.rpc.urllib.request.urlopen")
    def test_latest(self, mock_urlopen):
        dec_hex = "0x" + _pad_word(8)
        text = "ETH / USD"
        text_hex = text.encode().hex().ljust(64, "0")
        desc_hex = "0x" + _pad_word(32) + _pad_word(len(text)) + text_hex

        responses = [
            _mock_urlopen(_make_rpc_response(dec_hex)),
            _mock_urlopen(_make_rpc_response(desc_hex)),
            _mock_urlopen(_make_rpc_response(_ROUND_HEX)),
        ]
        mock_urlopen.side_effect = responses

        rd = read_latest_price(FEED_ADDR, RPC_URL)
        self.assertIsInstance(rd, RoundData)
        self.assertEqual(rd.answer, "3500")
        self.assertEqual(rd.description, "ETH / USD")
        self.assertEqual(rd.started_at, datetime(2023, 11, 14, 22, 13, 20, tzinfo=timezone.utc))


class TestReadLatestPriceWithMeta(unittest.TestCase):
    @patch("gud_price.rpc.urllib.request.urlopen")
    def test_with_meta(self, mock_urlopen):
        mock_urlopen.return_value = _mock_urlopen(_make_rpc_response(_ROUND_HEX))
        meta = FeedMetadata(decimals=8, description="ETH / USD")
        rd = read_latest_price_with_meta(FEED_ADDR, meta, RPC_URL)
        self.assertEqual(rd.answer, "3500")
        self.assertEqual(rd.description, "ETH / USD")


# -- Phase / aggregator tests --------------------------------------------------


class TestPhaseAndAggregator(unittest.TestCase):
    @patch("gud_price.rpc.urllib.request.urlopen")
    def test_read_phase_id(self, mock_urlopen):
        hex_data = "0x" + _pad_word(6)
        mock_urlopen.return_value = _mock_urlopen(_make_rpc_response(hex_data))
        self.assertEqual(read_phase_id(FEED_ADDR, RPC_URL), 6)

    @patch("gud_price.rpc.urllib.request.urlopen")
    def test_read_aggregator(self, mock_urlopen):
        addr = "abcdef1234567890abcdef1234567890abcdef12"
        hex_data = "0x" + ("0" * 24) + addr
        mock_urlopen.return_value = _mock_urlopen(_make_rpc_response(hex_data))
        result = read_aggregator(FEED_ADDR, RPC_URL)
        self.assertEqual(result, "0x" + addr)


# -- read_prices tests ---------------------------------------------------------


class TestReadPrices(unittest.TestCase):
    @patch("gud_price.rpc.urllib.request.urlopen")
    def test_multiple_feeds(self, mock_urlopen):
        dec_hex = "0x" + _pad_word(8)
        text = "ETH / USD"
        text_hex = text.encode().hex().ljust(64, "0")
        desc_hex = "0x" + _pad_word(32) + _pad_word(len(text)) + text_hex

        # Each feed requires 3 calls (decimals, description, latestRoundData)
        single_feed_responses = [
            _mock_urlopen(_make_rpc_response(dec_hex)),
            _mock_urlopen(_make_rpc_response(desc_hex)),
            _mock_urlopen(_make_rpc_response(_ROUND_HEX)),
        ]
        mock_urlopen.side_effect = single_feed_responses * 2

        feeds = {
            "ETH_USD": "0xaddr1",
            "BTC_USD": "0xaddr2",
        }
        result = read_prices(feeds, RPC_URL)
        self.assertIn("ETH_USD", result)
        self.assertIn("BTC_USD", result)
        self.assertEqual(result["ETH_USD"].answer, "3500")


if __name__ == "__main__":
    unittest.main()
