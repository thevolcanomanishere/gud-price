#!/usr/bin/env node

/**
 * Generate typed feed address constants from JSON source of truth.
 *
 * Usage: node codegen/generate.js [--lang ts|go|rust|zig|all]
 *
 * Reads from feeds/*.json, outputs to generated/<lang>/
 */

import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const FEEDS_DIR = path.join(ROOT, "feeds");

// ─── Helpers ─────────────────────────────────────────────────────────────────

function sanitizeName(key) {
  let name = key
    .replace(/\+\+/g, "pp")
    .replace(/ \/ /g, "_")
    .replace(/[^a-zA-Z0-9]/g, "_")
    .replace(/_+/g, "_")
    .replace(/_$/, "");
  if (/^[0-9]/.test(name)) name = "_" + name;
  return name;
}

function loadFeeds() {
  const chains = {};
  for (const file of fs.readdirSync(FEEDS_DIR).sort()) {
    if (!file.endsWith(".json") || file === "rpcs.json") continue;
    const chain = file.replace(".json", "");
    const raw = JSON.parse(fs.readFileSync(path.join(FEEDS_DIR, file), "utf8"));
    // Deduplicate: skip feeds whose sanitized name collides with an earlier entry
    const seen = new Set();
    const deduped = {};
    for (const [name, address] of Object.entries(raw)) {
      const key = sanitizeName(name).toUpperCase();
      if (seen.has(key)) continue;
      seen.add(key);
      deduped[name] = address;
    }
    chains[chain] = deduped;
  }
  return chains;
}

function loadRpcs() {
  return JSON.parse(fs.readFileSync(path.join(FEEDS_DIR, "rpcs.json"), "utf8"));
}

// ─── RPC endpoint generators ────────────────────────────────────────────────

function generateRpcsGo(rpcs) {
  const lines = [];
  lines.push("package rpc");
  lines.push("");
  lines.push("// DefaultRPCs maps chain names to their public RPC endpoints.");
  lines.push("// The first endpoint in each slice is the primary/official one.");
  lines.push("var DefaultRPCs = map[string][]string{");
  for (const [chain, urls] of Object.entries(rpcs)) {
    lines.push(`\t"${chain}": {`);
    for (const url of urls) {
      lines.push(`\t\t"${url}",`);
    }
    lines.push("\t},");
  }
  lines.push("}");
  lines.push("");
  lines.push("// RPC returns the primary public RPC endpoint for the given chain.");
  lines.push("func RPC(chain string) string {");
  lines.push("\turls, ok := DefaultRPCs[chain]");
  lines.push("\tif !ok || len(urls) == 0 {");
  lines.push(`\t\treturn ""`);
  lines.push("\t}");
  lines.push("\treturn urls[0]");
  lines.push("}");
  lines.push("");
  return lines.join("\n");
}

function generateRpcsPython(rpcs) {
  const lines = [];
  lines.push('"""Default public RPC endpoints for all supported chains."""');
  lines.push("");
  lines.push("rpcs: dict[str, list[str]] = {");
  for (const [chain, urls] of Object.entries(rpcs)) {
    lines.push(`    "${chain}": [`);
    for (const url of urls) {
      lines.push(`        "${url}",`);
    }
    lines.push("    ],");
  }
  lines.push("}");
  lines.push("");
  lines.push("");
  lines.push("def rpc(chain: str) -> str:");
  lines.push('    """Get the primary public RPC endpoint for a chain."""');
  lines.push("    urls = rpcs.get(chain, [])");
  lines.push('    return urls[0] if urls else ""');
  lines.push("");
  return lines.join("\n");
}

function generateRpcsRust(rpcs) {
  const lines = [];
  lines.push("//! Default public RPC endpoints for all supported chains.");
  lines.push("");
  lines.push("/// Get the primary public RPC endpoint for a chain.");
  lines.push("pub fn rpc(chain: &str) -> &'static str {");
  lines.push("    match chain {");
  // Deduplicate: bsc and bnb share the same RPCs, just pick the first URL for each
  const seen = new Set();
  for (const [chain, urls] of Object.entries(rpcs)) {
    if (seen.has(chain)) continue;
    seen.add(chain);
    lines.push(`        "${chain}" => "${urls[0]}",`);
  }
  lines.push('        _ => "",');
  lines.push("    }");
  lines.push("}");
  lines.push("");
  lines.push("/// Get all public RPC endpoints for a chain.");
  lines.push("pub fn rpcs(chain: &str) -> &'static [&'static str] {");
  lines.push("    match chain {");
  for (const [chain, urls] of Object.entries(rpcs)) {
    lines.push(`        "${chain}" => &[${urls.map((u) => `"${u}"`).join(", ")}],`);
  }
  lines.push("        _ => &[],");
  lines.push("    }");
  lines.push("}");
  lines.push("");
  return lines.join("\n");
}

// ─── TypeScript ──────────────────────────────────────────────────────────────

function generateTypeScript(chain, feeds) {
  const lines = [];
  const entries = Object.entries(feeds);

  for (const [name, address] of entries) {
    lines.push(`export const ${sanitizeName(name)} = "${address}" as const;`);
  }

  lines.push("");
  lines.push(`export const ${chain}DataFeeds = {`);
  for (const [name] of entries) {
    lines.push(`  "${name}": ${sanitizeName(name)},`);
  }
  lines.push("} as const;");
  lines.push("");

  return lines.join("\n");
}

// ─── Go ──────────────────────────────────────────────────────────────────────

function generateGo(chain, feeds) {
  const pkg = chain.toLowerCase();
  const lines = [];
  lines.push(`package ${pkg}`);
  lines.push("");
  lines.push("// Chainlink price feed contract addresses.");
  lines.push("const (");

  for (const [name, address] of Object.entries(feeds)) {
    lines.push(`\t${sanitizeName(name)} = "${address}"`);
  }

  lines.push(")");
  lines.push("");

  // Generate a map that references the consts (no address duplication)
  const mapName = chain.charAt(0).toUpperCase() + chain.slice(1) + "Feeds";
  lines.push(`// ${mapName} maps feed pair names to contract addresses.`);
  lines.push(`var ${mapName} = map[string]string{`);
  for (const [name] of Object.entries(feeds)) {
    lines.push(`\t"${name}": ${sanitizeName(name)},`);
  }
  lines.push("}");
  lines.push("");

  return lines.join("\n");
}

// ─── Rust ────────────────────────────────────────────────────────────────────

function generateRust(chain, feeds) {
  const lines = [];
  lines.push("//! Chainlink price feed contract addresses.");
  lines.push("");
  lines.push("use phf::phf_map;");
  lines.push("");

  for (const [name, address] of Object.entries(feeds)) {
    lines.push(`pub const ${sanitizeName(name).toUpperCase()}: &str = "${address}";`);
  }

  lines.push("");
  const mapName = chain.toUpperCase() + "_FEEDS";
  lines.push(`/// Map of feed pair names to contract addresses.`);
  lines.push(`pub static ${mapName}: phf::Map<&'static str, &'static str> = phf_map! {`);
  for (const [name, address] of Object.entries(feeds)) {
    lines.push(`    "${name}" => "${address}",`);
  }
  lines.push("};");
  lines.push("");

  return lines.join("\n");
}

// ─── Zig ─────────────────────────────────────────────────────────────────────

function generateZig(chain, feeds) {
  const lines = [];
  lines.push("//! Chainlink price feed contract addresses.");
  lines.push("");

  for (const [name, address] of Object.entries(feeds)) {
    lines.push(`pub const ${sanitizeName(name)} = "${address}";`);
  }

  lines.push("");

  // Generate a struct with a lookup
  lines.push(`pub const Feed = struct {`);
  lines.push(`    name: []const u8,`);
  lines.push(`    address: []const u8,`);
  lines.push(`};`);
  lines.push("");
  lines.push(`pub const feeds = [_]Feed{`);
  for (const [name, address] of Object.entries(feeds)) {
    lines.push(`    .{ .name = "${name}", .address = "${address}" },`);
  }
  lines.push("};");
  lines.push("");

  return lines.join("\n");
}

// ─── Python ──────────────────────────────────────────────────────────────────

function generatePython(chain, feeds) {
  const lines = [];
  lines.push(`"""Chainlink price feed contract addresses for ${chain}."""`);
  lines.push("");

  for (const [name, address] of Object.entries(feeds)) {
    lines.push(`${sanitizeName(name)} = "${address}"`);
  }

  lines.push("");
  lines.push(`${chain}_feeds: dict[str, str] = {`);
  for (const [name, address] of Object.entries(feeds)) {
    lines.push(`    "${name}": "${address}",`);
  }
  lines.push("}");
  lines.push("");

  return lines.join("\n");
}

// ─── Main ────────────────────────────────────────────────────────────────────

const generators = {
  ts: { ext: "ts", fn: generateTypeScript, dir: "src/dataFeeds" },
  go: { ext: "go", fn: generateGo, dir: "generated/go" },
  rust: { ext: "rs", fn: generateRust, dir: "generated/rust/src" },
  zig: { ext: "zig", fn: generateZig, dir: "generated/zig" },
  python: { ext: "py", fn: generatePython, dir: "generated/python/gud_price" },
};

const args = process.argv.slice(2);
const langArg = args.find((a) => a.startsWith("--lang="))?.split("=")[1] || "all";
const langs = langArg === "all" ? Object.keys(generators) : langArg.split(",");

const chains = loadFeeds();
const rpcsData = loadRpcs();
let totalFiles = 0;

const rpcsGenerators = {
  go: { fn: generateRpcsGo, path: "generated/go/rpc/rpcs.go" },
  python: { fn: generateRpcsPython, path: "generated/python/gud_price/rpcs.py" },
  rust: { fn: generateRpcsRust, path: "generated/rust/src/rpcs.rs" },
};

for (const lang of langs) {
  const gen = generators[lang];
  if (!gen) {
    console.error(`Unknown language: ${lang}`);
    continue;
  }

  const outDir = path.join(ROOT, gen.dir);
  fs.mkdirSync(outDir, { recursive: true });

  for (const [chain, feeds] of Object.entries(chains)) {
    const code = gen.fn(chain, feeds);
    // Go: each chain is its own package in a subdirectory
    const chainDir = lang === "go" ? path.join(outDir, chain) : outDir;
    fs.mkdirSync(chainDir, { recursive: true });
    const outPath = path.join(chainDir, `${chain}.${gen.ext}`);
    fs.writeFileSync(outPath, code);
    totalFiles++;
  }

  // Generate RPCs file for this language
  if (rpcsGenerators[lang]) {
    const rpcsGen = rpcsGenerators[lang];
    const rpcsPath = path.join(ROOT, rpcsGen.path);
    fs.mkdirSync(path.dirname(rpcsPath), { recursive: true });
    fs.writeFileSync(rpcsPath, rpcsGen.fn(rpcsData));
    totalFiles++;
    console.log(`${lang}: rpcs → ${rpcsGen.path}`);
  }

  // Run gofmt on generated Go files
  if (lang === "go") {
    try {
      execSync(`gofmt -w ${path.join(ROOT, gen.dir)}`, { stdio: "pipe" });
    } catch {}
  }

  console.log(`${lang}: ${Object.keys(chains).length} feeds → ${gen.dir}/`);
}

// ─── Feed chain lookup generators ────────────────────────────────────────────
// These generate lightweight files that import existing feed modules and build
// the address→chain lookup at init time, avoiding address duplication.

function generateFeedChainsTs(chainNames) {
  const lines = [];
  lines.push('import type { Chain } from "./rpcs.js";');
  for (const chain of chainNames) {
    lines.push(`import { ${chain}DataFeeds } from "./dataFeeds/${chain}.js";`);
  }
  lines.push("");
  lines.push("const feedChainMap: Record<string, Chain> = {};");
  lines.push("");
  for (const chain of chainNames) {
    lines.push(`for (const addr of Object.values(${chain}DataFeeds)) feedChainMap[addr.toLowerCase()] = "${chain}";`);
  }
  lines.push("");
  lines.push("export function feedChain(address: string): Chain | undefined {");
  lines.push("  return feedChainMap[address.toLowerCase()];");
  lines.push("}");
  lines.push("");
  return lines.join("\n");
}

function generateFeedChainsGo(chainNames) {
  const lines = [];
  lines.push("package rpc");
  lines.push("");
  lines.push("import (");
  lines.push('\t"strings"');
  lines.push("");
  for (const chain of chainNames) {
    lines.push(`\t"github.com/thevolcanomanishere/gud-price/generated/go/${chain}"`);
  }
  lines.push(")");
  lines.push("");
  lines.push("var feedChains map[string]string");
  lines.push("");
  lines.push("func init() {");
  lines.push("\tfeedChains = make(map[string]string)");
  for (const chain of chainNames) {
    const mapName = chain.charAt(0).toUpperCase() + chain.slice(1) + "Feeds";
    lines.push(`\tfor _, addr := range ${chain}.${mapName} {`);
    lines.push(`\t\tfeedChains[strings.ToLower(addr)] = "${chain}"`);
    lines.push("\t}");
  }
  lines.push("}");
  lines.push("");
  lines.push("// FeedChain returns the chain name for a known feed address, or empty string.");
  lines.push("func FeedChain(address string) string {");
  lines.push("\treturn feedChains[strings.ToLower(address)]");
  lines.push("}");
  lines.push("");
  return lines.join("\n");
}

function generateFeedChainsRust(chainNames) {
  const lines = [];
  lines.push("//! Lookup from feed address to chain name, built from existing feed modules.");
  lines.push("");
  lines.push("use std::collections::HashMap;");
  lines.push("use std::sync::LazyLock;");
  lines.push("");
  lines.push("static FEED_CHAINS: LazyLock<HashMap<String, &'static str>> = LazyLock::new(|| {");
  lines.push("    let mut m = HashMap::new();");
  for (const chain of chainNames) {
    const mapName = chain.toUpperCase() + "_FEEDS";
    lines.push(`    for (_, addr) in crate::${chain}::${mapName}.entries() {`);
    lines.push(`        m.insert(addr.to_lowercase(), "${chain}");`);
    lines.push("    }");
  }
  lines.push("    m");
  lines.push("});");
  lines.push("");
  lines.push("/// Get the chain name for a known feed address.");
  lines.push("pub fn feed_chain(address: &str) -> Option<&'static str> {");
  lines.push("    FEED_CHAINS.get(&address.to_lowercase()).copied()");
  lines.push("}");
  lines.push("");
  return lines.join("\n");
}

function generateFeedChainsPython(chainNames) {
  const lines = [];
  lines.push('"""Lookup from feed address to chain name, built from existing feed modules."""');
  lines.push("");
  for (const chain of chainNames) {
    lines.push(`from gud_price.${chain} import ${chain}_feeds`);
  }
  lines.push("");
  lines.push("_feed_chains: dict[str, str] = {}");
  for (const chain of chainNames) {
    lines.push(`for _addr in ${chain}_feeds.values():`);
    lines.push(`    _feed_chains[_addr.lower()] = "${chain}"`);
  }
  lines.push("");
  lines.push("");
  lines.push("def feed_chain(address: str) -> str | None:");
  lines.push('    """Get the chain name for a known feed address."""');
  lines.push("    return _feed_chains.get(address.lower())");
  lines.push("");
  return lines.join("\n");
}

// ─── FEEDS.md ─────────────────────────────────────────────────────────────────

function generateFeedsMd(chains) {
  const lines = [];
  lines.push("# Supported Feeds");
  lines.push("");
  lines.push(
    "> Auto-generated by `codegen/generate.js` — do not edit by hand."
  );
  lines.push("");

  let totalFeeds = 0;
  for (const [chain, feeds] of Object.entries(chains)) {
    const name = chain.charAt(0).toUpperCase() + chain.slice(1);
    const count = Object.keys(feeds).length;
    totalFeeds += count;
    lines.push(`## ${name} (${count} feeds)`);
    lines.push("");
    lines.push("| Feed | Address |");
    lines.push("|------|---------|");
    for (const [feedName, address] of Object.entries(feeds)) {
      lines.push(`| ${feedName} | \`${address}\` |`);
    }
    lines.push("");
  }

  lines.push(
    `---\n\n**${totalFeeds} feeds** across **${Object.keys(chains).length} chains**.`
  );
  lines.push("");
  return lines.join("\n");
}

// ─── Feed chain lookup maps ───────────────────────────────────────────────────

const chainNames = Object.keys(chains);

const feedChainsGenerators = {
  ts: { fn: generateFeedChainsTs, path: "src/feedChains.ts" },
  go: { fn: generateFeedChainsGo, path: "generated/go/rpc/feed_chains.go" },
  rust: { fn: generateFeedChainsRust, path: "generated/rust/src/feed_chains.rs" },
  python: { fn: generateFeedChainsPython, path: "generated/python/gud_price/feed_chains.py" },
};

for (const lang of langs) {
  if (feedChainsGenerators[lang]) {
    const gen = feedChainsGenerators[lang];
    const outPath = path.join(ROOT, gen.path);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, gen.fn(chainNames));
    totalFiles++;
    console.log(`${lang}: feed_chains → ${gen.path}`);
  }
}

const feedsMdPath = path.join(ROOT, "FEEDS.md");
fs.writeFileSync(feedsMdPath, generateFeedsMd(chains));
console.log(`docs: FEEDS.md (${Object.keys(chains).length} chains)`);

console.log(`\nGenerated ${totalFiles} files across ${langs.length} language(s).`);
