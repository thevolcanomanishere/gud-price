# gud-price

Free, real-time price data for currencies, stocks, commodities, and crypto -- no API keys, no subscriptions.

gud-price reads from [Chainlink](https://chain.link/) price feeds, the same oracle network used to secure billions in DeFi. Available for TypeScript, Go, Rust, Python, and Zig.

[![Tests](https://github.com/thevolcanomanishere/gud-price/actions/workflows/test.yml/badge.svg)](https://github.com/thevolcanomanishere/gud-price/actions/workflows/test.yml)
[![npm](https://img.shields.io/npm/v/gud-price)](https://www.npmjs.com/package/gud-price)
[![PyPI](https://img.shields.io/pypi/v/gud-price)](https://pypi.org/project/gud-price/)
[![Crates.io](https://img.shields.io/crates/v/gud-price)](https://crates.io/crates/gud-price)
[![Go](https://img.shields.io/github/v/tag/thevolcanomanishere/gud-price?filter=generated/go/*&label=go)](https://pkg.go.dev/github.com/thevolcanomanishere/gud-price/generated/go)

## What prices are available?

**691 feeds** across 4 chains (Ethereum, Arbitrum, Base, Polygon). Here are some highlights:

| Category | Feeds | Chains |
|----------|-------|--------|
| **Forex** | EUR/USD, GBP/USD, JPY/USD, AUD/USD, CAD/USD, CHF/USD, CNY/USD, KRW/USD, INR/USD, MXN/USD, ZAR/USD, and 15 more currency pairs | 26 fiat currencies across all 4 chains |
| **Equities** | AAPL, TSLA, AMZN, GOOGL, MSFT, NVDA, META, SPY | Arbitrum and Polygon |
| **Commodities** | XAU (Gold), XAG (Silver), XPT (Platinum), WTI (Crude Oil) | Gold and silver on all 4 chains |
| **Crypto** | BTC, ETH, SOL, LINK, ARB, UNI, AAVE, and hundreds more | All chains |
| **Stablecoins** | USDC/USD, USDT/USD, DAI/USD, EURC/USD | All chains |
| **Market indices** | Total Crypto Market Cap, SPY/USD | Ethereum and Arbitrum |

All prices are denominated in USD. Data is sourced from Chainlink's decentralized oracle network, the same infrastructure securing billions in DeFi.

See [FEEDS.md](FEEDS.md) for the complete list of all 691 feeds and their contract addresses.

## Quick start

Get the EUR/USD exchange rate in 3 lines:

```typescript
import { readLatestPrice } from "gud-price/rpc";
import { EUR_USD } from "gud-price/feeds/ethereum";

const data = await readLatestPrice(EUR_USD);
console.log(`EUR/USD: ${data.answer}`); // "EUR/USD: 1.0847"
```

You can also pass any Chainlink feed contract address directly:

```typescript
const data = await readLatestPrice("0xb49f677943BC038e9857d61E7d053CaA2C1734C1");
```

For addresses not built into the library, pass an RPC URL as the second argument:

```typescript
const data = await readLatestPrice("0xYourFeedAddress", "https://ethereum-rpc.publicnode.com");
```

Find more feed addresses at [data.chain.link](https://data.chain.link/feeds).

## Install

| Language | Install | Docs |
|----------|---------|------|
| TypeScript | `npm install gud-price` | [Usage](#typescript) |
| Go | `go get github.com/thevolcanomanishere/gud-price/generated/go` | [Usage](#go) |
| Rust | `cargo add gud-price` | [Usage](#rust) |
| Python | `pip install gud-price` | [Usage](#python) |
| Zig | Add via `build.zig.zon` | [generated/zig/](generated/zig/) |

All implementations are zero-dependency (or minimal-dependency) and use raw JSON-RPC calls under the hood. No ethers, no web3, no ABIs.

## TypeScript

```bash
npm install gud-price
```

### Forex rates

```typescript
import { readLatestPrice } from "gud-price/rpc";
import { EUR_USD, GBP_USD, JPY_USD } from "gud-price/feeds/ethereum";

const eur = await readLatestPrice(EUR_USD);
const gbp = await readLatestPrice(GBP_USD);
const jpy = await readLatestPrice(JPY_USD);

console.log(`EUR/USD: ${eur.answer}`); // "1.0847"
console.log(`GBP/USD: ${gbp.answer}`); // "1.2634"
console.log(`JPY/USD: ${jpy.answer}`); // "0.0067"
```

### Stock prices

```typescript
import { readPrices } from "gud-price/rpc";
import { AAPL_USD, TSLA_USD, AMZN_USD, GOOGL_USD } from "gud-price/feeds/arbitrum";

const prices = await readPrices({
  "Apple": AAPL_USD,
  "Tesla": TSLA_USD,
  "Amazon": AMZN_USD,
  "Google": GOOGL_USD,
});

for (const [name, data] of Object.entries(prices)) {
  console.log(`${name}: $${data.answer}`);
}
```

### Crypto prices

```typescript
import { readLatestPrice } from "gud-price/rpc";
import { ETH_USD, BTC_USD } from "gud-price/feeds/ethereum";

const eth = await readLatestPrice(ETH_USD);
console.log(`ETH/USD: $${eth.answer}`);
```

### Reuse metadata for polling

```typescript
import { readFeedMetadata, readLatestPriceWithMeta } from "gud-price/rpc";
import { EUR_USD } from "gud-price/feeds/polygon";

const meta = await readFeedMetadata(EUR_USD);

// Each call is now 1 RPC request instead of 3
setInterval(async () => {
  const data = await readLatestPriceWithMeta(EUR_USD, meta);
  console.log(`EUR/USD: ${data.answer}`);
}, 5000);
```

### Tree-shaking

```typescript
// Single address -- 67 bytes bundled
import { EUR_USD } from "gud-price/feeds/ethereum";

// RPC client only -- ~1.4 KB
import { readLatestPrice } from "gud-price/rpc";

// Full chain map
import { ethereumDataFeeds } from "gud-price/feeds/ethereum";

// Barrel import (all chains + RPC)
import { readLatestPrice, ethereumDataFeeds } from "gud-price";
```

## Go

```go
package main

import (
	"fmt"
	"github.com/thevolcanomanishere/gud-price/generated/go/rpc"
	"github.com/thevolcanomanishere/gud-price/generated/go/ethereum"
)

func main() {
	data, err := rpc.ReadLatestPrice(ethereum.EUR_USD)
	if err != nil {
		panic(err)
	}
	fmt.Printf("EUR/USD: %s\n", data.Answer)
}
```

## Rust

```rust
use gud_price::rpc;
use gud_price::ethereum;

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let data = rpc::read_latest_price(ethereum::EUR_USD, None)?;
    println!("EUR/USD: {}", data.answer);
    Ok(())
}
```

## Python

```python
from gud_price.rpc import read_latest_price
from gud_price.ethereum import EUR_USD

data = read_latest_price(EUR_USD)
print(f"EUR/USD: {data.answer}")
```

## API (all languages)

| Function | Description |
|---|---|
| `readLatestPrice(address)` | Latest price, formatted with metadata |
| `readLatestPriceWithMeta(address, meta)` | Latest price using pre-fetched metadata (1 RPC call) |
| `readLatestPriceRaw(address)` | Latest price as raw integers |
| `readPriceAtRound(address, roundId)` | Price at a specific Chainlink round |
| `readFeedMetadata(address)` | Decimals and description |
| `readPrices(feeds)` | Multiple feeds in parallel |
| `readPhaseId(address)` | Current phase ID |
| `readAggregator(address)` | Current aggregator address |
| `readPhaseAggregator(address, phaseId)` | Aggregator for a specific phase |
| `formatPrice(raw, decimals)` | Format raw integer price to decimal string |

All functions accept an optional RPC URL as the last argument. When omitted, built-in public endpoints are used with automatic fallback.

Function names follow each language's conventions (e.g. `ReadLatestPrice` in Go, `read_latest_price` in Rust/Python).

## Supported chains

Ethereum, Polygon, Arbitrum, Base.

See [FEEDS.md](FEEDS.md) for the full list of all 691 feeds and their addresses.

## How it works

Chainlink price feeds are smart contracts deployed on EVM blockchains. Each feed (e.g. EUR/USD) has a contract address that anyone can read from using an RPC endpoint. gud-price makes a single `eth_call` JSON-RPC request to read the latest price -- no wallet, no transaction, no gas fees.

## RPC endpoints

gud-price ships with built-in public RPC endpoints and automatically selects the right ones based on which feed you're reading. If an endpoint fails, the library falls back to the next one and remembers which endpoints are down.

These are shared public endpoints -- please use them responsibly and don't hammer them with high-frequency requests.

For production use or higher throughput, supply your own RPC endpoint as the last argument to any function. Free tiers are available from providers like [Alchemy](https://www.alchemy.com/), [QuickNode](https://www.quicknode.com/), [Infura](https://www.infura.io/), and others. You can also find more public endpoints on [Chainlist](https://chainlist.org/).

```typescript
// Uses built-in public RPCs automatically
const data = await readLatestPrice(EUR_USD);

// Or supply your own for better reliability and limits
const data = await readLatestPrice(EUR_USD, "https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY");
```

## Architecture

```
feeds/*.json              <- single source of truth (691 feed addresses)
codegen/generate.js       <- generates typed code for all languages
src/                      <- TypeScript (npm: gud-price)
generated/go/             <- Go (stdlib only)
generated/rust/           <- Rust (ureq + phf)
generated/python/         <- Python (stdlib only)
generated/zig/            <- Zig
```

## Code generation

```bash
npm run generate                        # All languages
npm run generate -- --lang=go           # Just Go
npm run generate -- --lang=rust,python  # Multiple
```

## Updating feed addresses

```bash
npm run updateAllFeeds
```

Scrapes the latest addresses from [data.chain.link](https://data.chain.link/feeds) using Playwright, then run `npm run generate` to update all languages.

## License

MIT
