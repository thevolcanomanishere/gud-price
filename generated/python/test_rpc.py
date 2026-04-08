"""Tests for the Chainlink RPC client (rpc.py)."""

import json
import unittest
from datetime import datetime, timezone
from unittest.mock import MagicMock, patch

from gud_price.rpc import (
    SEL_DECIMALS,
    FeedMetadata,
    RoundData,
    RoundDataRaw,
    _decode_aggregate3_results,
    _encode_aggregate3,
    decode_string,
    encode_uint,
    eth_call,
    format_price,
    multicall,
    read_aggregator,
    read_feed_metadata,
    read_latest_price,
    read_latest_price_raw,
    read_latest_price_with_meta,
    read_phase_id,
    read_prices,
    read_signed_word,
    read_word,
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
        error_resp = json.dumps({"jsonrpc": "2.0", "id": 1, "error": {"message": "execution reverted"}}).encode()
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
_ROUND_HEX = "0x" + _pad_word(100) + _pad_word(350000000000) + _pad_word(1700000000) + _pad_word(1700000100) + _pad_word(100)


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


def _encode_aggregate3_response(results: list) -> str:
    """Build a fake ABI-encoded Multicall3.aggregate3 Result[] return value.

    Each element of *results* is a ``(success: bool, data_hex: str)`` pair.
    """
    n = len(results)
    data_hexes = [r[1][2:] for r in results]  # strip "0x"
    data_lens = [len(h) // 2 for h in data_hexes]
    padded_lens = [((d + 31) // 32) * 32 for d in data_lens]
    # Each element: bool(32) + bytes_ptr(32) + bytes_len(32) + bytes_data(padded) = 96 + padded
    elem_sizes = [96 + p for p in padded_lens]

    parts: list[str] = []
    parts.append(format(32, "064x"))   # outer offset to array
    parts.append(format(n, "064x"))    # array length
    offset = n * 32
    for sz in elem_sizes:
        parts.append(format(offset, "064x"))
        offset += sz
    for i, (success, _) in enumerate(results):
        h = data_hexes[i]
        d = data_lens[i]
        p = padded_lens[i]
        parts.append(format(1 if success else 0, "064x"))  # bool success
        parts.append(format(64, "064x"))                    # bytes ptr (2 words)
        parts.append(format(d, "064x"))                     # bytes length
        parts.append(h.ljust(p * 2, "0"))                   # bytes data
    return "0x" + "".join(parts)


class TestEncodeAggregate3(unittest.TestCase):
    def test_starts_with_selector(self):
        calls = [("0xb49f677943BC038e9857d61E7d053CaA2C1734C1", SEL_DECIMALS)]
        encoded = _encode_aggregate3(calls)
        self.assertTrue(encoded.startswith("0x82ad56cb"))

    def test_address_lowercased(self):
        calls = [("0xAbCdEf1234567890ABCDEF1234567890abcdef12", SEL_DECIMALS)]
        encoded = _encode_aggregate3(calls)
        self.assertIn("abcdef1234567890abcdef1234567890abcdef12", encoded)

    def test_empty_calls(self):
        encoded = _encode_aggregate3([])
        # selector(4) + offset(32) + length(32) = 68 bytes = 136 hex + "0x"
        self.assertEqual(len(encoded), 138)


class TestDecodeAggregate3Results(unittest.TestCase):
    def test_round_trip(self):
        dec_hex = "0x" + _pad_word(8)
        response = _encode_aggregate3_response([(True, dec_hex), (False, "0x")])
        results = _decode_aggregate3_results(response, 2)

        self.assertEqual(len(results), 2)
        self.assertTrue(results[0][0])   # success
        self.assertFalse(results[1][0])  # failure

    def test_decoded_data_readable(self):
        dec_hex = "0x" + _pad_word(8)
        response = _encode_aggregate3_response([(True, dec_hex)])
        results = _decode_aggregate3_results(response, 1)
        success, data = results[0]
        self.assertTrue(success)
        from gud_price.rpc import read_word
        self.assertEqual(read_word(data, 0), 8)


class TestMulticall(unittest.TestCase):
    @patch("gud_price.rpc.urllib.request.urlopen")
    def test_returns_results(self, mock_urlopen):
        dec_hex = "0x" + _pad_word(8)
        mc_response = _encode_aggregate3_response([(True, dec_hex), (True, dec_hex)])
        mock_urlopen.return_value = _mock_urlopen(_make_rpc_response(mc_response))

        calls = [
            ("0xaaa", SEL_DECIMALS),
            ("0xbbb", SEL_DECIMALS),
        ]
        results = multicall(calls, RPC_URL)
        self.assertEqual(len(results), 2)
        self.assertTrue(results[0][0])
        self.assertTrue(results[1][0])

    @patch("gud_price.rpc.urllib.request.urlopen")
    def test_single_rpc_call(self, mock_urlopen):
        dec_hex = "0x" + _pad_word(8)
        mc_response = _encode_aggregate3_response([(True, dec_hex)])
        mock_urlopen.return_value = _mock_urlopen(_make_rpc_response(mc_response))

        multicall([("0xaaa", SEL_DECIMALS)], RPC_URL)
        self.assertEqual(mock_urlopen.call_count, 1)


class TestReadPricesSubCallFailure(unittest.TestCase):
    @patch("gud_price.rpc.urllib.request.urlopen")
    def test_raises_on_sub_call_failure(self, mock_urlopen):
        dec_hex = "0x" + _pad_word(8)
        # First sub-call succeeds, second fails — readPrices should raise
        mc_response = _encode_aggregate3_response([
            (True, dec_hex),
            (False, "0x"),
            (False, "0x"),
        ])
        mock_urlopen.return_value = _mock_urlopen(_make_rpc_response(mc_response))

        with self.assertRaises(Exception):
            read_prices({"ETH / USD": "0xaaa"}, RPC_URL)


class TestReadPrices(unittest.TestCase):
    @patch("gud_price.rpc.urllib.request.urlopen")
    def test_multiple_feeds(self, mock_urlopen):
        dec_hex = "0x" + _pad_word(8)
        text = "ETH / USD"
        text_hex = text.encode().hex().ljust(64, "0")
        desc_hex = "0x" + _pad_word(32) + _pad_word(len(text)) + text_hex

        # read_prices batches all calls via Multicall3, so there is a single RPC
        # call per chain group.  Build the expected aggregate3 return value for
        # 6 sub-calls (3 per feed × 2 feeds).
        sub_results = [(True, dec_hex), (True, desc_hex), (True, _ROUND_HEX)] * 2
        mc_response = _encode_aggregate3_response(sub_results)
        mock_urlopen.return_value = _mock_urlopen(_make_rpc_response(mc_response))

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
