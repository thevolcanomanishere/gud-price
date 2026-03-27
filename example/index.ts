/**
 * gud-price usage example.
 *
 * Run: npx tsx example/index.ts
 */

import {
  readLatestPrice,
  readLatestPriceRaw,
  readFeedMetadata,
  readLatestPriceWithMeta,
  readPrices,
  rpcs,
  ethereumDataFeeds,
} from "../src/index.js";

const rpc = rpcs.ethereum;
const feed = ethereumDataFeeds["ETH / USD"];

// ─── Read a single price ────────────────────────────────────────────────────

const price = await readLatestPrice(rpc, feed);
console.log(`ETH / USD: $${price.answer}`);
console.log(`  Round: ${price.roundId}`);
console.log(`  Updated: ${price.updatedAt.toISOString()}`);

// ─── Raw bigint values (useful for on-chain math) ───────────────────────────

const raw = await readLatestPriceRaw(rpc, feed);
console.log(`\nRaw answer: ${raw.answer}`);

// ─── Reuse metadata across multiple reads (saves RPC calls) ─────────────────

const meta = await readFeedMetadata(rpc, feed);
console.log(`\nFeed: ${meta.description} (${meta.decimals} decimals)`);

const withMeta = await readLatestPriceWithMeta(rpc, feed, meta);
console.log(`Price: $${withMeta.answer}`);

// ─── Read multiple feeds in parallel ────────────────────────────────────────

const prices = await readPrices(rpc, {
  "ETH / USD": ethereumDataFeeds["ETH / USD"],
  "BTC / USD": ethereumDataFeeds["BTC / USD"],
});

console.log("\nMultiple feeds:");
for (const [name, data] of Object.entries(prices)) {
  console.log(`  ${name}: $${data.answer}`);
}
