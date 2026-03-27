# gud-price

Zero-dependency Chainlink price feed reader for any EVM chain.

Read real-time prices from Chainlink data feeds on 18+ EVM chains with a single RPC call — no ethers, no web3, no ABIs.

## Usage

```rust
use gud_price::rpc::read_latest_price;
use gud_price::ethereum;
use gud_price::rpcs::ETHEREUM_RPCS;

fn main() {
    let price = read_latest_price(ETHEREUM_RPCS[0], ethereum::ETH_USD).unwrap();
    println!("ETH/USD: {price}");
}
```

## Supported Chains

Arbitrum, Avalanche, Base, BNB Chain, BSC, Celo, Ethereum, Fantom, Gnosis, Harmony, Linea, Metis, Moonbeam, Moonriver, Optimism, Polygon, Scroll, xDai.

## License

MIT
