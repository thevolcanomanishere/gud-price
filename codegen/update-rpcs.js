#!/usr/bin/env node

/**
 * Fetch public RPCs from chainlist.org, test them, and write the working ones
 * to feeds/rpcs.json + src/rpcs.ts.
 *
 * Usage: node codegen/update-rpcs.js [--timeout=5000] [--max=6] [--concurrency=10]
 *
 * Flags:
 *   --timeout     Per-RPC test timeout in ms (default 5000)
 *   --max         Max RPCs to keep per chain (default 6)
 *   --concurrency Max simultaneous RPC tests (default 10)
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const FEEDS_DIR = path.join(ROOT, "feeds");
const RPCS_JSON = path.join(FEEDS_DIR, "rpcs.json");
const RPCS_TS = path.join(ROOT, "src", "rpcs.ts");

// ─── Chain name → chain ID mapping ─────────────────────────────────────────

const CHAIN_IDS = {
  ethereum: 1,
  polygon: 137,
  arbitrum: 42161,
  base: 8453,
};

// ─── CLI args ───────────────────────────────────────────────────────────────

function arg(name, fallback) {
  const match = process.argv.find((a) => a.startsWith(`--${name}=`));
  return match ? Number(match.split("=")[1]) : fallback;
}

const TIMEOUT = arg("timeout", 3000);
const MAX_PER_CHAIN = arg("max", 6);
const CONCURRENCY = arg("concurrency", 20);

// ─── RPC testing ────────────────────────────────────────────────────────────

async function testRpc(url, expectedChainId) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT);
  try {
    const start = performance.now();
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "eth_chainId",
        params: [],
      }),
      signal: controller.signal,
    });
    const json = await res.json();
    const latency = performance.now() - start;

    if (json.error) return null;
    const returnedId = parseInt(json.result, 16);
    if (returnedId !== expectedChainId) return null;

    return { url, latency };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// ─── Fetch chainlist ────────────────────────────────────────────────────────

async function fetchChainlist() {
  console.log("Fetching https://chainlist.org/rpcs.json ...");
  const res = await fetch("https://chainlist.org/rpcs.json");
  if (!res.ok) throw new Error(`Failed to fetch chainlist: ${res.status}`);
  return res.json();
}

function extractCandidates(chainlistData) {
  // Build a chainId → RPC URLs map from chainlist
  const byChainId = new Map();
  for (const chain of chainlistData) {
    if (chain.isTestnet) continue;
    const id = chain.chainId;
    if (!byChainId.has(id)) byChainId.set(id, []);
    for (const rpc of chain.rpc || []) {
      const url = typeof rpc === "string" ? rpc : rpc.url;
      if (!url) continue;
      // Skip URLs with API key placeholders
      if (url.includes("${") || url.includes("{")) continue;
      // Skip wss:// endpoints
      if (url.startsWith("wss://")) continue;
      // Skip non-https in production
      if (!url.startsWith("https://")) continue;
      byChainId.get(id).push({
        url: url.replace(/\/+$/, ""),
        tracking: typeof rpc === "object" ? rpc.tracking : undefined,
      });
    }
  }

  // Map our chain names to candidate RPCs
  const candidates = {};
  for (const [chain, chainId] of Object.entries(CHAIN_IDS)) {
    const rpcs = byChainId.get(chainId) || [];
    // Prefer privacy-respecting RPCs first
    const sorted = rpcs.sort((a, b) => {
      const order = { none: 0, limited: 1, yes: 2, unspecified: 3 };
      return (order[a.tracking] ?? 3) - (order[b.tracking] ?? 3);
    });
    candidates[chain] = sorted.map((r) => r.url);
  }
  return candidates;
}

// ─── Code generation ────────────────────────────────────────────────────────

function generateRpcsTs(rpcs) {
  const lines = [];
  lines.push("/** Default public RPC endpoints per chain. First entry is primary. */");
  lines.push("export const rpcs = {");
  for (const [chain, urls] of Object.entries(rpcs)) {
    lines.push(`  ${chain}: [`);
    for (const url of urls) {
      lines.push(`    "${url}",`);
    }
    lines.push("  ],");
  }
  lines.push("} as const;");
  lines.push("");
  lines.push("export type Chain = keyof typeof rpcs;");
  lines.push("");
  lines.push("/** Get the primary (first) RPC URL for a chain. */");
  lines.push("export function rpc(chain: Chain): string {");
  lines.push("  return rpcs[chain][0];");
  lines.push("}");
  lines.push("");
  return lines.join("\n");
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  const chainlistData = await fetchChainlist();
  const candidates = extractCandidates(chainlistData);

  const chains = Object.entries(candidates);

  // Test all chains in parallel
  const chainResults = await Promise.all(
    chains.map(async ([chain, urls]) => {
      const chainId = CHAIN_IDS[chain];
      if (urls.length === 0) {
        console.log(`  ⚠ ${chain}: no candidates from chainlist`);
        return [chain, []];
      }

      const unique = [...new Set(urls)];
      console.log(`  ${chain} (${unique.length} candidates) ...`);
      // Limit concurrency per chain to avoid saturating the network
      const tested = [];
      for (let i = 0; i < unique.length; i += CONCURRENCY) {
        const batch = unique.slice(i, i + CONCURRENCY);
        tested.push(...await Promise.all(batch.map((url) => testRpc(url, chainId))));
      }

      const working = tested
        .filter(Boolean)
        .sort((a, b) => a.latency - b.latency)
        .slice(0, MAX_PER_CHAIN);

      if (working.length === 0) {
        console.log(`    ✗ ${chain}: no working RPCs`);
      } else {
        console.log(`    ✓ ${chain}: ${working.length} ok (fastest ${Math.round(working[0].latency)}ms)`);
      }

      return [chain, working.map((r) => r.url)];
    })
  );

  const result = Object.fromEntries(chainResults);

  // Write feeds/rpcs.json
  fs.writeFileSync(RPCS_JSON, JSON.stringify(result, null, 2) + "\n");
  console.log(`\nWrote ${RPCS_JSON}`);

  // Write src/rpcs.ts
  fs.writeFileSync(RPCS_TS, generateRpcsTs(result));
  console.log(`Wrote ${RPCS_TS}`);

  // Summary
  const total = Object.values(result).reduce((s, urls) => s + urls.length, 0);
  const empty = Object.entries(result).filter(([, urls]) => urls.length === 0);
  console.log(`\nDone: ${total} working RPCs across ${chains.length} chains.`);
  if (empty.length) {
    console.log(`Warning: no RPCs found for: ${empty.map(([c]) => c).join(", ")}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
