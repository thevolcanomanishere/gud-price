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
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const FEEDS_DIR = path.join(ROOT, "feeds");

// ─── Helpers ─────────────────────────────────────────────────────────────────

function sanitizeName(key) {
  let name = key
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
    chains[chain] = JSON.parse(fs.readFileSync(path.join(FEEDS_DIR, file), "utf8"));
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

  // Also generate a map
  const mapName = chain.charAt(0).toUpperCase() + chain.slice(1) + "Feeds";
  lines.push(`// ${mapName} maps feed pair names to contract addresses.`);
  lines.push(`var ${mapName} = map[string]string{`);
  for (const [name, address] of Object.entries(feeds)) {
    lines.push(`\t"${name}": "${address}",`);
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
  python: { ext: "py", fn: generatePython, dir: "generated/python" },
};

const args = process.argv.slice(2);
const langArg = args.find((a) => a.startsWith("--lang="))?.split("=")[1] || "all";
const langs = langArg === "all" ? Object.keys(generators) : langArg.split(",");

const chains = loadFeeds();
const rpcsData = loadRpcs();
let totalFiles = 0;

const rpcsGenerators = {
  go: { fn: generateRpcsGo, path: "generated/go/rpc/rpcs.go" },
  python: { fn: generateRpcsPython, path: "generated/python/rpcs.py" },
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
    const outPath = path.join(outDir, `${chain}.${gen.ext}`);
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

  console.log(`${lang}: ${Object.keys(chains).length} feeds → ${gen.dir}/`);
}

console.log(`\nGenerated ${totalFiles} files across ${langs.length} language(s).`);
