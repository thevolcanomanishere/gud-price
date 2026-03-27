import path, { dirname } from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FEEDS_DIR = path.join(__dirname, "../feeds");

// Chains to scrape — add more here as needed
const TARGET_CHAINS = ["ethereum", "arbitrum", "polygon", "base"];

// ─── Fetch and extract embedded feed data ───────────────────────────────────

interface Feed {
  name: string;
  ens: string;
  chain: string;
  network: string;
  proxyAddress: string;
  contractAddress: string;
  feedType: string;
  decimals: number;
}

async function fetchAllFeeds(): Promise<Feed[]> {
  console.log("Fetching https://data.chain.link/feeds ...");
  const res = await fetch("https://data.chain.link/feeds");
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const html = await res.text();

  // Extract __NEXT_DATA__ JSON from the script tag
  const match = html.match(
    /<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/
  );
  if (!match) throw new Error("Could not find __NEXT_DATA__ in page source");

  const nextData = JSON.parse(match[1]);
  const feeds = nextData?.props?.pageProps?.allFeeds;
  if (!Array.isArray(feeds)) throw new Error("allFeeds not found in __NEXT_DATA__");

  return feeds;
}

// ─── Main ───────────────────────────────────────────────────────────────────

const allFeeds = await fetchAllFeeds();
console.log(`Fetched ${allFeeds.length} total feeds from Chainlink`);

let totalCount = 0;

for (const chain of TARGET_CHAINS) {
  const feeds = allFeeds.filter(
    (f) =>
      f.chain === chain &&
      (f.network === "mainnet" || f.network === chain) &&
      f.proxyAddress
  );

  // Build sorted { "PAIR / NAME": "0xAddress" } map
  const map: Record<string, string> = {};
  for (const f of feeds) {
    map[f.name] = f.proxyAddress;
  }

  const sorted = Object.fromEntries(
    Object.entries(map).sort(([a], [b]) => a.localeCompare(b))
  );

  const count = Object.keys(sorted).length;
  totalCount += count;

  const outPath = path.join(FEEDS_DIR, `${chain}.json`);
  fs.writeFileSync(outPath, JSON.stringify(sorted, null, 2) + "\n");
  console.log(`  ${chain}: ${count} feeds → feeds/${chain}.json`);
}

console.log(`\nTotal: ${totalCount} feeds across ${TARGET_CHAINS.length} chains`);
