import type { Chain } from "./rpcs.js";
import { arbitrumDataFeeds } from "./dataFeeds/arbitrum.js";
import { baseDataFeeds } from "./dataFeeds/base.js";
import { ethereumDataFeeds } from "./dataFeeds/ethereum.js";
import { polygonDataFeeds } from "./dataFeeds/polygon.js";

const feedChainMap: Record<string, Chain> = {};

for (const addr of Object.values(arbitrumDataFeeds))
  feedChainMap[addr.toLowerCase()] = "arbitrum";
for (const addr of Object.values(baseDataFeeds))
  feedChainMap[addr.toLowerCase()] = "base";
for (const addr of Object.values(ethereumDataFeeds))
  feedChainMap[addr.toLowerCase()] = "ethereum";
for (const addr of Object.values(polygonDataFeeds))
  feedChainMap[addr.toLowerCase()] = "polygon";

export function feedChain(address: string): Chain | undefined {
  return feedChainMap[address.toLowerCase()];
}
