/**
 * Demo entry point — bundled into a single file for the GitHub Pages dashboard.
 * Exports the library functions to window.gudPrice for use by the HTML page.
 */

import { readLatestPrice } from "../src/rpc.js";
import { ethereumDataFeeds } from "../src/dataFeeds/ethereum.js";
import { arbitrumDataFeeds } from "../src/dataFeeds/arbitrum.js";
import { polygonDataFeeds } from "../src/dataFeeds/polygon.js";
import { baseDataFeeds } from "../src/dataFeeds/base.js";

(window as any).gudPrice = {
  readLatestPrice,
  feeds: {
    ethereum: ethereumDataFeeds,
    arbitrum: arbitrumDataFeeds,
    polygon: polygonDataFeeds,
    base: baseDataFeeds,
  },
};
