# gud-price

Zero-dependency TypeScript library for reading Chainlink price feeds on any EVM chain. Uses raw JSON-RPC calls via `fetch()` — no viem, ethers, or web3 required.

## Install

```bash
npm install gud-price
```

## Usage

### Read a price

```typescript
import { readLatestPrice } from "gud-price/rpc";
import { ETH_USD } from "gud-price/feeds/ethereum";

const data = await readLatestPrice("https://ethereum-rpc.publicnode.com", ETH_USD);

console.log(data);
// {
//   roundId: 36893488147426144869n,
//   answer: "1800.5",
//   startedAt: 2024-01-10T13:08:43.000Z,
//   updatedAt: 2024-01-10T13:08:43.000Z,
//   answeredInRound: 36893488147426144869n,
//   description: "ETH / USD"
// }
```

### Read multiple prices

```typescript
import { readPrices } from "gud-price/rpc";
import { ETH_USD, BTC_USD } from "gud-price/feeds/ethereum";

const prices = await readPrices("https://ethereum-rpc.publicnode.com", {
  "ETH / USD": ETH_USD,
  "BTC / USD": BTC_USD,
});

console.log(prices["ETH / USD"].answer); // "1800.5"
console.log(prices["BTC / USD"].answer); // "42000"
```

### Reuse metadata for repeated reads

If you're polling the same feed, fetch metadata once to avoid redundant RPC calls:

```typescript
import { readFeedMetadata, readLatestPriceWithMeta } from "gud-price/rpc";
import { ETH_USD } from "gud-price/feeds/polygon";

const rpc = "https://polygon-bor.publicnode.com";

const meta = await readFeedMetadata(rpc, ETH_USD);
// { decimals: 8, description: "ETH / USD" }

// Now each call is a single RPC request instead of three
setInterval(async () => {
  const data = await readLatestPriceWithMeta(rpc, ETH_USD, meta);
  console.log(data.answer);
}, 5000);
```

### Raw data

```typescript
import { readLatestPriceRaw } from "gud-price/rpc";
import { ETH_USD } from "gud-price/feeds/polygon";

const raw = await readLatestPriceRaw("https://polygon-bor.publicnode.com", ETH_USD);
// { roundId: 100n, answer: 180050000000n, startedAt: 1700000000n, updatedAt: 1700000001n, answeredInRound: 100n }
```

### Other functions

```typescript
import { readPriceAtRound, readPhaseId, readAggregator, readPhaseAggregator } from "gud-price/rpc";

// Read the price at a specific round
const round = await readPriceAtRound(rpc, address, 50n);

// Read current phase ID
const phase = await readPhaseId(rpc, address);

// Read current aggregator address
const agg = await readAggregator(rpc, address);

// Read aggregator for a specific phase
const phaseAgg = await readPhaseAggregator(rpc, address, phase);
```

## API

| Function | Description |
|---|---|
| `readLatestPrice(rpc, address)` | Latest price, formatted with metadata |
| `readLatestPriceWithMeta(rpc, address, meta)` | Latest price using pre-fetched metadata (1 RPC call) |
| `readLatestPriceRaw(rpc, address)` | Latest price as raw bigints |
| `readPriceAtRound(rpc, address, roundId)` | Price at a specific Chainlink round |
| `readFeedMetadata(rpc, address)` | Decimals and description |
| `readPrices(rpc, feeds)` | Multiple feeds in parallel |
| `readPhaseId(rpc, address)` | Current phase ID |
| `readAggregator(rpc, address)` | Current aggregator address |
| `readPhaseAggregator(rpc, address, phaseId)` | Aggregator for a specific phase |
| `formatPrice(raw, decimals)` | Format raw bigint price to decimal string |

## Imports

Each chain and the RPC client are separate entry points for optimal tree-shaking:

```typescript
// Individual feed addresses — tree-shakes to just the address string (67 bytes)
import { ETH_USD } from "gud-price/feeds/ethereum";

// Full chain map — for when you need all feeds on a chain
import { ethereumDataFeeds } from "gud-price/feeds/ethereum";

// RPC functions — separate entry point, no feed data included
import { readLatestPrice } from "gud-price/rpc";

// Barrel import — convenience, pulls in all chains + RPC
import { readLatestPrice, ethereumDataFeeds } from "gud-price";
```

## Supported chains

Ethereum, Polygon, Arbitrum, Base, Optimism, Avalanche, BSC/BNB, Fantom, Gnosis/xDai, Scroll, Moonbeam, Moonriver, Harmony, Celo, Linea, Metis.

## RPCs

Get free RPC URLs from [Chainlist](https://chainlist.org/).

## Multi-language support

Feed addresses are stored as JSON in `feeds/` and can be generated into typed constants for any language:

```bash
npm run generate              # All languages: ts, go, rust, zig, python
npm run generate -- --lang=go # Just Go
npm run generate -- --lang=rust,zig  # Multiple
```

Output goes to `generated/<lang>/` (TypeScript goes to `src/dataFeeds/`). Each generated file has individual named constants + a lookup map, idiomatic for the target language.

## Updating feed addresses

```bash
npm run updateAllFeeds
```

This uses Playwright to scrape the latest addresses from [data.chain.link](https://data.chain.link/feeds).

## License

MIT
