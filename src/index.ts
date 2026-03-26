// Feed address lists — each tree-shakes independently
export { baseDataFeeds } from "./dataFeeds/base.js";
export { ethereumDataFeeds } from "./dataFeeds/ethereum.js";
export { polygonDataFeeds } from "./dataFeeds/polygon.js";
export { bscDataFeeds } from "./dataFeeds/bsc.js";
export { fantomDataFeeds } from "./dataFeeds/fantom.js";
export { xdaiDataFeeds } from "./dataFeeds/xdai.js";
export { celoDataFeeds } from "./dataFeeds/celo.js";
export { arbitrumDataFeeds } from "./dataFeeds/arbitrum.js";
export { avalancheDataFeeds } from "./dataFeeds/avalanche.js";
export { moonbeamDataFeeds } from "./dataFeeds/moonbeam.js";
export { optimismDataFeeds } from "./dataFeeds/optimism.js";
export { harmonyDataFeeds } from "./dataFeeds/harmony.js";
export { scrollDataFeeds } from "./dataFeeds/scroll.js";

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
  formatPrice,
} from "./rpc.js";

export type {
  RoundData,
  RoundDataRaw,
  FeedMetadata,
} from "./rpc.js";
