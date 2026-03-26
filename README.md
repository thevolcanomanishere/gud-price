# ts-chainlink-datafeed

Zero-dependency TypeScript library for reading Chainlink price feeds on any EVM chain. Uses raw JSON-RPC calls via `fetch()` — no viem, ethers, or web3 required.

## Install

```bash
npm install @hypotenuselabs/ts-chainlink-datafeed
```

## Usage

### Get a price

```typescript
import { getLatestRoundData, polygonDataFeeds } from "@hypotenuselabs/ts-chainlink-datafeed";

const data = await getLatestRoundData(
  "https://polygon-bor.publicnode.com",
  polygonDataFeeds["ETH / USD"]
);

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

### Get multiple prices

```typescript
import { getMultipleFeedPrices, ethereumDataFeeds } from "@hypotenuselabs/ts-chainlink-datafeed";

const prices = await getMultipleFeedPrices("https://ethereum-rpc.publicnode.com", {
  "ETH / USD": ethereumDataFeeds["ETH / USD"],
  "BTC / USD": ethereumDataFeeds["BTC / USD"],
});

console.log(prices["ETH / USD"].answer); // "1800.5"
console.log(prices["BTC / USD"].answer); // "42000"
```

### Reuse metadata for repeated reads

If you're polling the same feed, fetch metadata once to avoid redundant RPC calls:

```typescript
import { getFeedMetadata, getLatestRoundDataWithMeta, polygonDataFeeds } from "@hypotenuselabs/ts-chainlink-datafeed";

const rpc = "https://polygon-bor.publicnode.com";
const address = polygonDataFeeds["ETH / USD"];

const meta = await getFeedMetadata(rpc, address);
// { decimals: 8, description: "ETH / USD" }

// Now each call is a single RPC request instead of three
setInterval(async () => {
  const data = await getLatestRoundDataWithMeta(rpc, address, meta);
  console.log(data.answer);
}, 5000);
```

### Raw data

```typescript
import { getLatestRoundDataRaw, polygonDataFeeds } from "@hypotenuselabs/ts-chainlink-datafeed";

const raw = await getLatestRoundDataRaw(
  "https://polygon-bor.publicnode.com",
  polygonDataFeeds["ETH / USD"]
);

console.log(raw);
// { roundId: 100n, answer: 180050000000n, startedAt: 1700000000n, updatedAt: 1700000001n, answeredInRound: 100n }
```

### Other functions

```typescript
import { getRoundData, getPhaseId, getAggregator, getPhaseAggregator } from "@hypotenuselabs/ts-chainlink-datafeed";

// Get data for a specific round
const round = await getRoundData(rpc, address, 50n);

// Get current phase ID
const phase = await getPhaseId(rpc, address);

// Get current aggregator address
const agg = await getAggregator(rpc, address);

// Get aggregator for a specific phase
const phaseAgg = await getPhaseAggregator(rpc, address, phase);
```

## API

| Function | Description |
|---|---|
| `getLatestRoundData(rpc, address)` | Latest price, formatted with metadata |
| `getLatestRoundDataWithMeta(rpc, address, meta)` | Latest price using pre-fetched metadata (1 RPC call) |
| `getLatestRoundDataRaw(rpc, address)` | Latest price as raw bigints |
| `getRoundData(rpc, address, roundId)` | Price for a specific round |
| `getFeedMetadata(rpc, address)` | Decimals and description |
| `getMultipleFeedPrices(rpc, feeds)` | Multiple feeds in parallel |
| `getPhaseId(rpc, address)` | Current phase ID |
| `getAggregator(rpc, address)` | Current aggregator address |
| `getPhaseAggregator(rpc, address, phaseId)` | Aggregator for a specific phase |
| `formatPrice(raw, decimals)` | Format raw bigint price to decimal string |

## Supported chains

Feed address lists are available for: Ethereum, Polygon, Arbitrum, Base, Optimism, Avalanche, BSC/BNB, Fantom, Gnosis/xDai, Scroll, Moonbeam, Moonriver, Harmony, Celo, Linea, Metis.

Each is a separate export that tree-shakes independently:

```typescript
import { ethereumDataFeeds } from "@hypotenuselabs/ts-chainlink-datafeed";
import { arbitrumDataFeeds } from "@hypotenuselabs/ts-chainlink-datafeed";
// Only the chains you import are included in your bundle
```

## RPCs

Get free RPC URLs from [Chainlist](https://chainlist.org/).

## Updating feed addresses

The scraper pulls the latest feed addresses from [data.chain.link](https://data.chain.link/feeds):

```bash
npm run updateAllFeeds
```

This requires Playwright and will update all `src/dataFeeds/*.ts` files.

## License

MIT
