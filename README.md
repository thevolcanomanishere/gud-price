# gud-price

Free, real-time price data for currencies, stocks, commodities, and crypto -- no API keys, no subscriptions.

gud-price reads from [Chainlink](https://chain.link/) price feeds, the same oracle network used to secure billions in DeFi. Available for TypeScript, Go, Rust, Python, and Zig.

[![Tests](https://github.com/thevolcanomanishere/gud-price/actions/workflows/test.yml/badge.svg)](https://github.com/thevolcanomanishere/gud-price/actions/workflows/test.yml)

## What prices are available?

**691 feeds** across 4 chains. Here are some examples:

| Category | Examples |
|----------|----------|
| Forex | EUR/USD, GBP/USD, JPY/USD, AUD/USD, CAD/USD, CHF/USD, BRL/USD, NZD/USD, SGD/USD |
| Equities | AAPL/USD, TSLA/USD, AMZN/USD, GOOGL/USD, MSFT/USD, NVDA/USD, META/USD, SPY/USD |
| Crypto | BTC/USD, ETH/USD, SOL/USD, LINK/USD, ARB/USD, AVAX/USD, and hundreds more |
| Stablecoin rates | USDC/USD, USDT/USD, DAI/USD, EURC/USD |
| Cross rates | BTC/ETH, ETH/BTC, and various token/ETH pairs |

See [FEEDS.md](FEEDS.md) for the complete list of all feeds and addresses.

## Quick start

Get the EUR/USD exchange rate in 3 lines:

```typescript
import { readLatestPrice } from "gud-price/rpc";

const data = await readLatestPrice("https://ethereum-rpc.publicnode.com", "0xb49f677943BC038e9857d61E7d053CaA2C1734C1");
console.log(`EUR/USD: ${data.answer}`); // "EUR/USD: 1.0847"
```

Or use the built-in feed constants so you don't need to look up addresses:

```typescript
import { readLatestPrice } from "gud-price/rpc";
import { EUR_USD } from "gud-price/feeds/ethereum";

const data = await readLatestPrice("https://ethereum-rpc.publicnode.com", EUR_USD);
console.log(`EUR/USD: ${data.answer}`);
```

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

const eur = await readLatestPrice("https://ethereum-rpc.publicnode.com", EUR_USD);
const gbp = await readLatestPrice("https://ethereum-rpc.publicnode.com", GBP_USD);
const jpy = await readLatestPrice("https://ethereum-rpc.publicnode.com", JPY_USD);

console.log(`EUR/USD: ${eur.answer}`); // "1.0847"
console.log(`GBP/USD: ${gbp.answer}`); // "1.2634"
console.log(`JPY/USD: ${jpy.answer}`); // "0.0067"
```

### Stock prices

```typescript
import { readPrices } from "gud-price/rpc";
import { AAPL_USD, TSLA_USD, AMZN_USD, GOOGL_USD } from "gud-price/feeds/arbitrum";

const prices = await readPrices("https://arbitrum.drpc.org", {
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

const eth = await readLatestPrice("https://ethereum-rpc.publicnode.com", ETH_USD);
console.log(`ETH/USD: $${eth.answer}`);
```

### Reuse metadata for polling

```typescript
import { readFeedMetadata, readLatestPriceWithMeta } from "gud-price/rpc";
import { EUR_USD } from "gud-price/feeds/polygon";

const rpc = "https://polygon-bor-rpc.publicnode.com";
const meta = await readFeedMetadata(rpc, EUR_USD);

// Each call is now 1 RPC request instead of 3
setInterval(async () => {
  const data = await readLatestPriceWithMeta(rpc, EUR_USD, meta);
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
)

func main() {
	// Get EUR/USD exchange rate
	data, err := rpc.ReadLatestPrice(
		"https://ethereum-rpc.publicnode.com",
		"0xb49f677943BC038e9857d61E7d053CaA2C1734C1", // EUR/USD
	)
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
    let data = rpc::read_latest_price(
        "https://ethereum-rpc.publicnode.com",
        ethereum::EUR_USD,
    )?;
    println!("EUR/USD: {}", data.answer);
    Ok(())
}
```

## Python

```python
from gud_price.rpc import read_latest_price
from gud_price.ethereum import EUR_USD

data = read_latest_price("https://ethereum-rpc.publicnode.com", EUR_USD)
print(f"EUR/USD: {data.answer}")
```

## API (all languages)

| Function | Description |
|---|---|
| `readLatestPrice(rpc, address)` | Latest price, formatted with metadata |
| `readLatestPriceWithMeta(rpc, address, meta)` | Latest price using pre-fetched metadata (1 RPC call) |
| `readLatestPriceRaw(rpc, address)` | Latest price as raw integers |
| `readPriceAtRound(rpc, address, roundId)` | Price at a specific Chainlink round |
| `readFeedMetadata(rpc, address)` | Decimals and description |
| `readPrices(rpc, feeds)` | Multiple feeds in parallel |
| `readPhaseId(rpc, address)` | Current phase ID |
| `readAggregator(rpc, address)` | Current aggregator address |
| `readPhaseAggregator(rpc, address, phaseId)` | Aggregator for a specific phase |
| `formatPrice(raw, decimals)` | Format raw integer price to decimal string |

Function names follow each language's conventions (e.g. `ReadLatestPrice` in Go, `read_latest_price` in Rust/Python).

## Supported chains

Ethereum, Polygon, Arbitrum, Base.

See [FEEDS.md](FEEDS.md) for the full list of all 691 feeds and their addresses.

## How it works

Chainlink price feeds are smart contracts deployed on EVM blockchains. Each feed (e.g. EUR/USD) has a contract address that anyone can read from using an RPC endpoint. gud-price makes a single `eth_call` JSON-RPC request to read the latest price -- no wallet, no transaction, no gas fees.

## RPC endpoints

gud-price ships with built-in public RPC endpoints that work out of the box. These are shared public endpoints -- please use them responsibly and don't hammer them with high-frequency requests.

For production use or higher throughput, supply your own RPC endpoint. Free tiers are available from providers like [Alchemy](https://www.alchemy.com/), [QuickNode](https://www.quicknode.com/), [Infura](https://www.infura.io/), and others. You can also find more public endpoints on [Chainlist](https://chainlist.org/).

Every function in gud-price takes an RPC URL as its first argument, so swapping endpoints is trivial:

```typescript
// Using built-in public RPC
import { rpc } from "gud-price/rpcs";
const data = await readLatestPrice(rpc("ethereum"), EUR_USD);

// Using your own endpoint for better reliability and limits
const data = await readLatestPrice("https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY", EUR_USD);
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
