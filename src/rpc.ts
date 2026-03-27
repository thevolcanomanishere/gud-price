// Chainlink price feed reader — zero dependencies, just fetch()

import { rpcs } from "./rpcs.js";
import { feedChain } from "./feedChains.js";

// ─── Function selectors ──────────────────────────────────────────────────────

const SEL_DECIMALS = "0x313ce567";
const SEL_DESCRIPTION = "0x7284e416";
const SEL_LATEST_ROUND_DATA = "0xfeaf968c";
const SEL_GET_ROUND_DATA = "0x9a6fc8f5";
const SEL_PHASE_ID = "0x58303b10";
const SEL_PHASE_AGGREGATORS = "0xc1597304";
const SEL_AGGREGATOR = "0x245a7bfc";

// ─── ABI decoding helpers ────────────────────────────────────────────────────

/** Read a 256-bit word from hex result at the given 32-byte slot index. */
function readWord(hex: string, slot: number): bigint {
  // skip "0x", each slot is 64 hex chars
  const start = 2 + slot * 64;
  return BigInt("0x" + hex.slice(start, start + 64));
}

/** Decode a Solidity ABI-encoded string from hex result data. */
function decodeString(hex: string): string {
  const offset = Number(readWord(hex, 0)); // byte offset to string data
  const charOffset = 2 + offset * 2;
  const length = Number(BigInt("0x" + hex.slice(charOffset, charOffset + 64)));
  const strHex = hex.slice(charOffset + 64, charOffset + 64 + length * 2);
  return Buffer.from(strHex, "hex").toString("utf8");
}

/** ABI-encode a uint80 argument (left-padded to 32 bytes). */
function encodeUint(value: bigint): string {
  return value.toString(16).padStart(64, "0");
}

/** Format a raw integer price using the feed's decimal count. */
export function formatPrice(raw: bigint, decimals: number): string {
  if (raw === 0n) return "0";
  const negative = raw < 0n;
  let abs = negative ? -raw : raw;
  let str = abs.toString();
  if (decimals === 0) return (negative ? "-" : "") + str;

  str = str.padStart(decimals + 1, "0");
  const intPart = str.slice(0, str.length - decimals);
  const fracPart = str.slice(str.length - decimals).replace(/0+$/, "");
  const result = fracPart ? `${intPart}.${fracPart}` : intPart;
  return (negative ? "-" : "") + result;
}

/** A single RPC URL or a list of fallback URLs (tried in order). */
export type RpcUrl = string | readonly string[];

// ─── Circuit breaker ────────────────────────────────────────────────────────

const failedEndpoints = new Map<string, number>();
const COOLDOWN_MS = 60_000;

function sortByHealth(urls: readonly string[]): string[] {
  const now = Date.now();
  return [...urls].sort((a, b) => {
    const aFailed = failedEndpoints.get(a);
    const bFailed = failedEndpoints.get(b);
    const aHealthy = !aFailed || now - aFailed > COOLDOWN_MS;
    const bHealthy = !bFailed || now - bFailed > COOLDOWN_MS;
    if (aHealthy && !bHealthy) return -1;
    if (!aHealthy && bHealthy) return 1;
    return 0;
  });
}

// ─── URL resolution ─────────────────────────────────────────────────────────

function resolveUrls(contractAddress: string, rpcUrl?: RpcUrl): string[] {
  if (rpcUrl !== undefined) {
    return Array.isArray(rpcUrl) ? [...rpcUrl] : [rpcUrl as string];
  }
  const chain = feedChain(contractAddress);
  if (!chain) {
    throw new Error(
      `Unknown feed address: ${contractAddress}. Pass an RPC URL as the second argument.`,
    );
  }
  return [...rpcs[chain]];
}

// ─── JSON-RPC transport ──────────────────────────────────────────────────────

let rpcIdCounter = 1;

async function ethCall(
  contractAddress: string,
  data: string,
  rpcUrl?: RpcUrl,
): Promise<string> {
  const urls = sortByHealth(resolveUrls(contractAddress, rpcUrl));
  let lastError: Error | undefined;
  for (const url of urls) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: rpcIdCounter++,
          method: "eth_call",
          params: [{ to: contractAddress, data }, "latest"],
        }),
      });
      const json = (await res.json()) as {
        result?: string;
        error?: { code?: number; message?: string; data?: string };
      };
      if (json.error) {
        const msg =
          json.error.message ?? json.error.data ?? JSON.stringify(json.error);
        throw new Error(`RPC error: ${msg}`);
      }
      return json.result!;
    } catch (err) {
      failedEndpoints.set(url, Date.now());
      lastError = err as Error;
    }
  }
  throw lastError!;
}

// ─── Public API ──────────────────────────────────────────────────────────────

export interface RoundData {
  roundId: bigint;
  answer: string;
  startedAt: Date;
  updatedAt: Date;
  answeredInRound: bigint;
}

export interface RoundDataRaw {
  roundId: bigint;
  answer: bigint;
  startedAt: bigint;
  updatedAt: bigint;
  answeredInRound: bigint;
}

export interface FeedMetadata {
  decimals: number;
  description: string;
}

function parseRoundDataRaw(hex: string): RoundDataRaw {
  return {
    roundId: readWord(hex, 0),
    answer: readWord(hex, 1),
    startedAt: readWord(hex, 2),
    updatedAt: readWord(hex, 3),
    answeredInRound: readWord(hex, 4),
  };
}

function formatRound(
  raw: RoundDataRaw,
  decimals: number,
  description: string,
): RoundData & { description: string } {
  return {
    roundId: raw.roundId,
    answer: formatPrice(raw.answer, decimals),
    startedAt: new Date(Number(raw.startedAt) * 1000),
    updatedAt: new Date(Number(raw.updatedAt) * 1000),
    answeredInRound: raw.answeredInRound,
    description,
  };
}

/** Read the decimals and description from a Chainlink price feed contract. */
export async function readFeedMetadata(
  contractAddress: string,
  rpcUrl?: RpcUrl,
): Promise<FeedMetadata> {
  const [decHex, descHex] = await Promise.all([
    ethCall(contractAddress, SEL_DECIMALS, rpcUrl),
    ethCall(contractAddress, SEL_DESCRIPTION, rpcUrl),
  ]);
  return {
    decimals: Number(readWord(decHex, 0)),
    description: decodeString(descHex),
  };
}

/** Read the latest price from a Chainlink feed, formatted as a decimal string. */
export async function readLatestPrice(
  contractAddress: string,
  rpcUrl?: RpcUrl,
): Promise<RoundData & { description: string }> {
  const [meta, hex] = await Promise.all([
    readFeedMetadata(contractAddress, rpcUrl),
    ethCall(contractAddress, SEL_LATEST_ROUND_DATA, rpcUrl),
  ]);
  return formatRound(parseRoundDataRaw(hex), meta.decimals, meta.description);
}

/** Read the latest price using pre-fetched metadata (saves 2 RPC calls). */
export async function readLatestPriceWithMeta(
  contractAddress: string,
  meta: FeedMetadata,
  rpcUrl?: RpcUrl,
): Promise<RoundData & { description: string }> {
  const hex = await ethCall(contractAddress, SEL_LATEST_ROUND_DATA, rpcUrl);
  return formatRound(parseRoundDataRaw(hex), meta.decimals, meta.description);
}

/** Read the latest price as raw bigint values (no formatting). */
export async function readLatestPriceRaw(
  contractAddress: string,
  rpcUrl?: RpcUrl,
): Promise<RoundDataRaw> {
  const hex = await ethCall(contractAddress, SEL_LATEST_ROUND_DATA, rpcUrl);
  return parseRoundDataRaw(hex);
}

/** Read the price at a specific Chainlink round ID. */
export async function readPriceAtRound(
  contractAddress: string,
  roundId: bigint,
  rpcUrl?: RpcUrl,
): Promise<RoundData & { description: string }> {
  const [meta, hex] = await Promise.all([
    readFeedMetadata(contractAddress, rpcUrl),
    ethCall(contractAddress, SEL_GET_ROUND_DATA + encodeUint(roundId), rpcUrl),
  ]);
  return formatRound(parseRoundDataRaw(hex), meta.decimals, meta.description);
}

/** Read the current phase ID from a Chainlink feed proxy. */
export async function readPhaseId(
  contractAddress: string,
  rpcUrl?: RpcUrl,
): Promise<bigint> {
  const hex = await ethCall(contractAddress, SEL_PHASE_ID, rpcUrl);
  return readWord(hex, 0);
}

/** Read the aggregator contract address for a specific phase. */
export async function readPhaseAggregator(
  contractAddress: string,
  phaseId: bigint,
  rpcUrl?: RpcUrl,
): Promise<string> {
  const hex = await ethCall(
    contractAddress,
    SEL_PHASE_AGGREGATORS + encodeUint(phaseId),
    rpcUrl,
  );
  return "0x" + hex.slice(26, 66);
}

/** Read the current aggregator contract address. */
export async function readAggregator(
  contractAddress: string,
  rpcUrl?: RpcUrl,
): Promise<string> {
  const hex = await ethCall(contractAddress, SEL_AGGREGATOR, rpcUrl);
  return "0x" + hex.slice(26, 66);
}

/** Read latest prices from multiple Chainlink feeds in parallel. */
export async function readPrices(
  feeds: Record<string, string>,
  rpcUrl?: RpcUrl,
): Promise<Record<string, RoundData & { description: string }>> {
  const entries = Object.entries(feeds);
  const results = await Promise.all(
    entries.map(([, address]) => readLatestPrice(address, rpcUrl)),
  );
  const out: Record<string, RoundData & { description: string }> = {};
  for (let i = 0; i < entries.length; i++) {
    out[entries[i][0]] = results[i];
  }
  return out;
}
