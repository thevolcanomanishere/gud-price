# gud-price

Multi-language, zero-dependency library for reading Chainlink price feeds on any EVM chain. Feed addresses stored as JSON, with native RPC clients and typed constants generated for TypeScript, Go, Rust, and Python.

[![Tests](https://github.com/thevolcanomanishere/ts-chainlink-datafeeds/actions/workflows/test.yml/badge.svg)](https://github.com/thevolcanomanishere/ts-chainlink-datafeeds/actions/workflows/test.yml)

## Languages

| Language | RPC Client | Feed Addresses | Tests | Install |
|---|---|---|---|---|
| TypeScript | `fetch()` | Tree-shakeable named exports | 25 | `npm install gud-price` |
| Go | `net/http` | Typed constants + map | 13 | `go get` from `generated/go` |
| Rust | `ureq` | `phf` compile-time maps | 27 | Add from `generated/rust` |
| Python | `urllib` | Module constants + dict | 31 | Copy from `generated/python` |

All implementations are zero-dependency (or minimal-dependency) and use raw JSON-RPC `eth_call` under the hood.

## TypeScript

```bash
npm install gud-price
```

```typescript
import { readLatestPrice } from "gud-price/rpc";
import { ETH_USD } from "gud-price/feeds/ethereum";

const data = await readLatestPrice("https://ethereum-rpc.publicnode.com", ETH_USD);
console.log(data.answer); // "1800.5"
console.log(data.description); // "ETH / USD"
```

### Multiple prices

```typescript
import { readPrices } from "gud-price/rpc";
import { ETH_USD, BTC_USD } from "gud-price/feeds/ethereum";

const prices = await readPrices("https://ethereum-rpc.publicnode.com", {
  "ETH / USD": ETH_USD,
  "BTC / USD": BTC_USD,
});
```

### Reuse metadata for polling

```typescript
import { readFeedMetadata, readLatestPriceWithMeta } from "gud-price/rpc";
import { ETH_USD } from "gud-price/feeds/polygon";

const rpc = "https://polygon-bor.publicnode.com";
const meta = await readFeedMetadata(rpc, ETH_USD);

// Each call is now 1 RPC request instead of 3
setInterval(async () => {
  const data = await readLatestPriceWithMeta(rpc, ETH_USD, meta);
  console.log(data.answer);
}, 5000);
```

### Tree-shaking

```typescript
// Single address — 67 bytes bundled
import { ETH_USD } from "gud-price/feeds/ethereum";

// RPC client only — ~1.4 KB
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
	"gudprice/rpc"
)

func main() {
	data, err := rpc.ReadLatestPrice(
		"https://ethereum-rpc.publicnode.com",
		"0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419", // ETH/USD
	)
	if err != nil {
		panic(err)
	}
	fmt.Printf("%s: %s\n", data.Description, data.Answer)
}
```

## Rust

```rust
use gud_price::rpc;
use gud_price::ethereum;

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let data = rpc::read_latest_price(
        "https://ethereum-rpc.publicnode.com",
        ethereum::ETH_USD,
    )?;
    println!("{}: {}", data.description, data.answer);
    Ok(())
}
```

## Python

```python
from rpc import read_latest_price
from ethereum import ETH_USD

data = read_latest_price("https://ethereum-rpc.publicnode.com", ETH_USD)
print(f"{data.description}: {data.answer}")
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

Ethereum, Polygon, Arbitrum, Base, Optimism, Avalanche, BSC/BNB, Fantom, Gnosis/xDai, Scroll, Moonbeam, Moonriver, Harmony, Celo, Linea, Metis.

## Architecture

```
feeds/*.json              ← single source of truth (1,008 feed addresses)
codegen/generate.js       ← generates typed code for all languages
src/                      ← TypeScript (npm: gud-price)
generated/go/             ← Go (stdlib only)
generated/rust/           ← Rust (ureq + phf)
generated/python/         ← Python (stdlib only)
```

## Code generation

```bash
npm run generate                     # All languages
npm run generate -- --lang=go        # Just Go
npm run generate -- --lang=rust,python  # Multiple
```

## Updating feed addresses

```bash
npm run updateAllFeeds
```

Scrapes the latest addresses from [data.chain.link](https://data.chain.link/feeds) using Playwright, then run `npm run generate` to update all languages.

## RPCs

Get free RPC URLs from [Chainlist](https://chainlist.org/).

## License

MIT
