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

```typescript
import { readLatestPrice, readPrices } from "gud-price/rpc";
import { EUR_USD, BTC_USD } from "gud-price/feeds/ethereum";
import { AAPL_USD, TSLA_USD } from "gud-price/feeds/arbitrum";

// Single price — 3 eth_calls (decimals + description + latestRoundData)
const eur = await readLatestPrice(EUR_USD);
console.log(`EUR/USD: ${eur.answer}`);

// Multiple prices — 1 eth_call total via Multicall3 (feeds grouped by chain)
const prices = await readPrices({ EUR_USD, BTC_USD, AAPL_USD, TSLA_USD });
console.log(`BTC/USD: $${prices["BTC / USD"].answer}`);
```

## Go

```bash
go get github.com/thevolcanomanishere/gud-price/generated/go
```

```go
package main

import (
	"fmt"
	"github.com/thevolcanomanishere/gud-price/generated/go/rpc"
	"github.com/thevolcanomanishere/gud-price/generated/go/ethereum"
)

func main() {
	// Single price
	data, err := rpc.ReadLatestPrice(ethereum.EUR_USD)
	if err != nil {
		panic(err)
	}
	fmt.Printf("EUR/USD: %s\n", data.Answer)

	// Multiple prices — 1 RPC call via Multicall3
	prices, err := rpc.ReadPrices(map[string]string{
		"EUR/USD": ethereum.EUR_USD,
		"BTC/USD": ethereum.BTC_USD,
	})
	if err != nil {
		panic(err)
	}
	fmt.Printf("BTC/USD: $%s\n", prices["BTC/USD"].Answer)
}
```

## Rust

```bash
cargo add gud-price
```

```rust
use std::collections::HashMap;
use gud_price::rpc::{read_latest_price, read_prices};
use gud_price::ethereum::{EUR_USD, BTC_USD};

fn main() {
    // Single price
    let data = read_latest_price(EUR_USD, None).unwrap();
    println!("EUR/USD: {}", data.answer);

    // Multiple prices — 1 RPC call via Multicall3
    let feeds = HashMap::from([
        ("EUR/USD".to_string(), EUR_USD.to_string()),
        ("BTC/USD".to_string(), BTC_USD.to_string()),
    ]);
    let prices = read_prices(&feeds, None).unwrap();
    println!("BTC/USD: ${}", prices["BTC/USD"].answer);
}
```

## Python

```bash
pip install gud-price
```

```python
from gud_price.rpc import read_latest_price, read_prices
from gud_price.ethereum import EUR_USD, BTC_USD

# Single price
data = read_latest_price(EUR_USD)
print(f"EUR/USD: {data.answer}")

# Multiple prices — 1 RPC call via Multicall3
prices = read_prices({"EUR/USD": EUR_USD, "BTC/USD": BTC_USD})
print(f"BTC/USD: ${prices['BTC/USD'].answer}")
```

## Zig

Add to `build.zig.zon`:

```bash
zig fetch --save https://github.com/thevolcanomanishere/gud-price/archive/refs/tags/v0.1.0.tar.gz
```

```zig
const std = @import("std");
const rpc = @import("rpc.zig");
const ethereum = @import("ethereum.zig");

const ETH_RPC = "https://ethereum-rpc.publicnode.com";

pub fn main() !void {
    var gpa = std.heap.GeneralPurposeAllocator(.{}){};
    defer _ = gpa.deinit();
    const alloc = gpa.allocator();

    // Single price — 3 eth_calls (decimals + description + latestRoundData)
    const price = try rpc.readLatestPrice(alloc, ethereum.EUR_USD, ETH_RPC);
    defer price.deinit(alloc);
    std.debug.print("EUR/USD: {s}\n", .{price.answer});

    // Multiple prices — 1 RPC call via Multicall3
    const feeds = [_]rpc.Feed{
        .{ .name = "EUR/USD", .address = ethereum.EUR_USD },
        .{ .name = "BTC/USD", .address = ethereum.BTC_USD },
    };
    const prices = try rpc.readPrices(alloc, &feeds, ETH_RPC);
    defer {
        for (prices) |p| p.round.deinit(alloc);
        alloc.free(prices);
    }
    std.debug.print("BTC/USD: ${s}\n", .{prices[1].round.answer});
}
```

## API (all languages)

| Function | Description |
|---|---|
| `readLatestPrice(address)` | Latest price, formatted with metadata (3 RPC calls) |
| `readLatestPriceWithMeta(address, meta)` | Latest price using pre-fetched metadata (1 RPC call) |
| `readLatestPriceRaw(address)` | Latest price as raw integers |
| `readPriceAtRound(address, roundId)` | Price at a specific Chainlink round |
| `readFeedMetadata(address)` | Decimals and description |
| `readPrices(feeds)` | Multiple feeds via Multicall3 — **1 RPC call per chain** |
| `multicall(calls, rpcUrl)` | Raw Multicall3.aggregate3 batch — returns `{success, data}[]` |
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

Chainlink price feeds are smart contracts deployed on EVM blockchains. Each feed (e.g. EUR/USD) has a contract address that anyone can read from using an RPC endpoint. gud-price uses `eth_call` JSON-RPC requests to read prices -- no wallet, no transaction, no gas fees.

When fetching multiple prices with `readPrices`, all calls for feeds on the same chain are batched into a single request via [Multicall3](https://www.multicall3.com/) (`aggregate3`). 10 feeds on Ethereum = 1 RPC call instead of 30.

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
