# gud-price

Zero-dependency Chainlink price feed reader for any EVM chain.

Read real-time prices from Chainlink data feeds on 18+ EVM chains with a single RPC call — no web3, no ABIs.

## Installation

```bash
pip install gud-price
```

## Usage

```python
from gud_price.rpc import read_latest_price
from gud_price.ethereum import ETH_USD
from gud_price.rpcs import rpc

price = read_latest_price(rpc("ethereum"), ETH_USD)
print(f"ETH/USD: {price.answer}")
```

## Supported Chains

Ethereum, Arbitrum, Base, Polygon.

## License

MIT
