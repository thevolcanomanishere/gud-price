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
    if (!file.endsWith(".json")) continue;
    const chain = file.replace(".json", "");
    chains[chain] = JSON.parse(fs.readFileSync(path.join(FEEDS_DIR, file), "utf8"));
  }
  return chains;
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
let totalFiles = 0;

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

  console.log(`${lang}: ${Object.keys(chains).length} files → ${gen.dir}/`);
}

console.log(`\nGenerated ${totalFiles} files across ${langs.length} language(s).`);
