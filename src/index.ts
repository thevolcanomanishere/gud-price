// Feed address lists — each tree-shakes independently
export { baseDataFeeds } from "./dataFeeds/base.js";
export { ethereumDataFeeds } from "./dataFeeds/ethereum.js";
export { polygonDataFeeds } from "./dataFeeds/polygon.js";
export { arbitrumDataFeeds } from "./dataFeeds/arbitrum.js";

// RPC client — zero dependencies
export {
  readLatestPrice,
  readLatestPriceRaw,
  readLatestPriceWithMeta,
  readPriceAtRound,
  readFeedMetadata,
  readPhaseId,
  readPhaseAggregator,
  readAggregator,
  readPrices,
  multicall,
  formatPrice,
} from "./rpc.js";

export type {
  RoundData,
  RoundDataRaw,
  FeedMetadata,
  Multicall3Call,
  Multicall3Result,
} from "./rpc.js";

// Default public RPC endpoints per chain
export { rpcs, rpc } from "./rpcs.js";
export type { Chain } from "./rpcs.js";
