"""Tests that validate generated feed address modules."""

import re
import unittest

from gud_price import ethereum
from gud_price import polygon


HEX_ADDR_RE = re.compile(r"^0x[0-9a-fA-F]{40}$")


class TestEthereumFeeds(unittest.TestCase):
    def test_eth_usd_exists(self):
        self.assertTrue(hasattr(ethereum, "ETH_USD"), "ethereum module missing ETH_USD")

    def test_btc_usd_exists(self):
        self.assertTrue(hasattr(ethereum, "BTC_USD"), "ethereum module missing BTC_USD")

    def test_addresses_are_valid_hex(self):
        for name in dir(ethereum):
            if name.startswith("_"):
                continue
            value = getattr(ethereum, name)
            if not isinstance(value, str):
                continue
            self.assertRegex(
                value,
                HEX_ADDR_RE,
                f"ethereum.{name} = {value!r} is not a valid hex address",
            )

    def test_eth_usd_address_format(self):
        self.assertRegex(ethereum.ETH_USD, HEX_ADDR_RE)

    def test_btc_usd_address_format(self):
        self.assertRegex(ethereum.BTC_USD, HEX_ADDR_RE)


class TestPolygonFeeds(unittest.TestCase):
    def test_known_feeds_exist(self):
        # Polygon has common feeds
        for name in ("AAVE_USD", "BNB_USD", "BTC_USD"):
            self.assertTrue(
                hasattr(polygon, name),
                f"polygon module missing {name}",
            )

    def test_addresses_are_valid_hex(self):
        for name in dir(polygon):
            if name.startswith("_"):
                continue
            value = getattr(polygon, name)
            if not isinstance(value, str):
                continue
            self.assertRegex(
                value,
                HEX_ADDR_RE,
                f"polygon.{name} = {value!r} is not a valid hex address",
            )


if __name__ == "__main__":
    unittest.main()
