"""Live RPC integration tests — require network access."""

import unittest
import signal
from gud_price.rpc import read_latest_price, read_latest_price_raw, read_feed_metadata, read_prices


def timeout_handler(signum, frame):
    raise TimeoutError("RPC call timed out")


class LiveEthereumTests(unittest.TestCase):
    def setUp(self):
        signal.signal(signal.SIGALRM, timeout_handler)
        signal.alarm(15)

    def tearDown(self):
        signal.alarm(0)

    def test_eth_usd(self):
        data = read_latest_price("0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419")
        self.assertEqual(data.description, "ETH / USD")
        self.assertGreater(float(data.answer), 0)
        print(f"Ethereum ETH/USD: {data.answer}")

    def test_btc_usd(self):
        data = read_latest_price("0xF4030086522a5bEEa4988F8cA5B36dbC97BeE88c")
        self.assertEqual(data.description, "BTC / USD")
        self.assertGreater(float(data.answer), 0)
        print(f"Ethereum BTC/USD: {data.answer}")


class LivePolygonTests(unittest.TestCase):
    def setUp(self):
        signal.signal(signal.SIGALRM, timeout_handler)
        signal.alarm(15)

    def tearDown(self):
        signal.alarm(0)

    def test_eth_usd(self):
        data = read_latest_price("0xF9680D99D6C9589e2a93a78A04A279e509205945")
        self.assertEqual(data.description, "ETH / USD")
        self.assertGreater(float(data.answer), 0)
        print(f"Polygon ETH/USD: {data.answer}")

    def test_raw_data(self):
        data = read_latest_price_raw("0xF9680D99D6C9589e2a93a78A04A279e509205945")
        self.assertGreater(data.answer, 0)

    def test_metadata(self):
        meta = read_feed_metadata("0xF9680D99D6C9589e2a93a78A04A279e509205945")
        self.assertEqual(meta.decimals, 8)
        self.assertEqual(meta.description, "ETH / USD")


class LiveArbitrumTests(unittest.TestCase):
    def setUp(self):
        signal.signal(signal.SIGALRM, timeout_handler)
        signal.alarm(15)

    def tearDown(self):
        signal.alarm(0)

    def test_eth_usd(self):
        data = read_latest_price("0x639Fe6ab55C921f74e7fac1ee960C0B6293ba612")
        self.assertEqual(data.description, "ETH / USD")
        self.assertGreater(float(data.answer), 0)
        print(f"Arbitrum ETH/USD: {data.answer}")


class LiveBaseTests(unittest.TestCase):
    def setUp(self):
        signal.signal(signal.SIGALRM, timeout_handler)
        signal.alarm(15)

    def tearDown(self):
        signal.alarm(0)

    def test_eth_usd(self):
        data = read_latest_price("0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70")
        self.assertEqual(data.description, "ETH / USD")
        self.assertGreater(float(data.answer), 0)
        print(f"Base ETH/USD: {data.answer}")


class LiveMultipleFeedsTest(unittest.TestCase):
    def setUp(self):
        signal.signal(signal.SIGALRM, timeout_handler)
        signal.alarm(30)

    def tearDown(self):
        signal.alarm(0)

    def test_read_prices(self):
        feeds = {
            "ETH / USD": "0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419",
            "BTC / USD": "0xF4030086522a5bEEa4988F8cA5B36dbC97BeE88c",
        }
        results = read_prices(feeds)
        for name, data in results.items():
            self.assertGreater(float(data.answer), 0)
            print(f"{name}: {data.answer}")


if __name__ == "__main__":
    unittest.main()
