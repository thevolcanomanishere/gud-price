// Chainlink price feed reader — zero dependencies, just fetch()

import { rpcs } from "./rpcs.js";
import type { Chain } from "./rpcs.js";
import { feedChain } from "./feedChains.js";

// ─── Function selectors ──────────────────────────────────────────────────────

const SEL_DECIMALS = "0x313ce567";
const SEL_DESCRIPTION = "0x7284e416";
const SEL_LATEST_ROUND_DATA = "0xfeaf968c";
const SEL_GET_ROUND_DATA = "0x9a6fc8f5";
const SEL_PHASE_ID = "0x58303b10";
const SEL_PHASE_AGGREGATORS = "0xc1597304";
const SEL_AGGREGATOR = "0x245a7bfc";

// ─── Multicall3 ──────────────────────────────────────────────────────────────

/** Multicall3 is deployed at the same address on all supported chains. */
const MULTICALL3 = "0xcA11bde05977b3631167028862bE2a173976CA11";
const SEL_AGGREGATE3 = "0x82ad56cb";

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
  const bytes = new Uint8Array(strHex.match(/.{2}/g)!.map(b => parseInt(b, 16)));
  return new TextDecoder().decode(bytes);
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

// ─── Multicall3 ABI helpers ──────────────────────────────────────────────────

export interface Multicall3Call {
  target: string;
  callData: string;
}

export interface Multicall3Result {
  success: boolean;
  data: string;
}

/**
 * ABI-encode a Multicall3.aggregate3(Call3[]) call.
 * Call3 = (address target, bool allowFailure, bytes callData)
 * All calls use allowFailure=true so one bad feed doesn't abort the batch.
 */
function encodeAggregate3(calls: Multicall3Call[]): string {
  const n = calls.length;

  // sizeof each element: address(32) + bool(32) + bytes_ptr(32) + bytes_len(32) + bytes_data(padded)
  const sizes = calls.map(c => {
    const dataBytes = (c.callData.length - 2) / 2;
    return 128 + Math.ceil(dataBytes / 32) * 32;
  });

  // Offsets from start of array content (right after the length word).
  // Array content = [N offset words] + [element bodies].
  const offsets: number[] = [];
  let off = n * 32;
  for (const sz of sizes) {
    offsets.push(off);
    off += sz;
  }

  let hex = SEL_AGGREGATE3.slice(2); // selector (no 0x)
  hex += "0000000000000000000000000000000000000000000000000000000000000020"; // param offset = 32
  hex += n.toString(16).padStart(64, "0"); // array length
  for (const o of offsets) hex += o.toString(16).padStart(64, "0"); // element offsets

  for (const call of calls) {
    const dataHex = call.callData.slice(2);
    const dataBytes = dataHex.length / 2;
    const dataPadded = Math.ceil(dataBytes / 32) * 32;
    hex += "000000000000000000000000" + call.target.slice(2).toLowerCase(); // address
    hex += "0000000000000000000000000000000000000000000000000000000000000001"; // allowFailure=true
    hex += "0000000000000000000000000000000000000000000000000000000000000060"; // bytes ptr = 96
    hex += dataBytes.toString(16).padStart(64, "0"); // bytes length
    hex += dataHex.padEnd(dataPadded * 2, "0"); // bytes data
  }

  return "0x" + hex;
}

/**
 * ABI-decode the Result[] returned by Multicall3.aggregate3.
 * Result = (bool success, bytes returnData)
 */
function decodeAggregate3Results(hex: string, n: number): Multicall3Result[] {
  const raw = hex.slice(2); // strip "0x"

  function wordAt(bytePos: number): bigint {
    return BigInt("0x" + raw.slice(bytePos * 2, bytePos * 2 + 64));
  }

  // Word 0: offset to array body (= 32).
  const arrayByteOffset = Number(wordAt(0));
  // Array content starts right after the length word.
  const arrayContentStart = arrayByteOffset + 32;

  const results: Multicall3Result[] = [];

  for (let i = 0; i < n; i++) {
    // Each element offset is relative to the start of array content.
    const elemRelOffset = Number(wordAt(arrayContentStart + i * 32));
    const elemStart = arrayContentStart + elemRelOffset;

    const success = wordAt(elemStart) !== 0n;
    const bytesRelOffset = Number(wordAt(elemStart + 32));
    const bytesStart = elemStart + bytesRelOffset;
    const bytesLen = Number(wordAt(bytesStart));

    const dataHexStart = (bytesStart + 32) * 2;
    const data =
      bytesLen > 0
        ? "0x" + raw.slice(dataHexStart, dataHexStart + bytesLen * 2)
        : "0x";

    results.push({ success, data });
  }

  return results;
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

/**
 * Batch multiple contract calls into a single RPC request via Multicall3.
 * Uses allowFailure=true per call; check the `success` field on each result.
 */
export async function multicall(
  calls: Multicall3Call[],
  rpcUrl: RpcUrl,
): Promise<Multicall3Result[]> {
  const calldata = encodeAggregate3(calls);
  const hex = await ethCall(MULTICALL3, calldata, rpcUrl);
  return decodeAggregate3Results(hex, calls.length);
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

/**
 * Read latest prices from multiple Chainlink feeds using a single Multicall3
 * request per chain. N feeds on the same chain = 1 RPC call instead of N×3.
 */
export async function readPrices(
  feeds: Record<string, string>,
  rpcUrl?: RpcUrl,
): Promise<Record<string, RoundData & { description: string }>> {
  const entries = Object.entries(feeds);
  if (entries.length === 0) return {};

  // Build groups: one per chain (or a single group when rpcUrl is explicit).
  const groups: Array<{ feedEntries: [string, string][]; groupRpc: RpcUrl }> =
    [];

  if (rpcUrl !== undefined) {
    groups.push({ feedEntries: entries, groupRpc: rpcUrl });
  } else {
    const byChain = new Map<Chain, [string, string][]>();
    for (const [name, address] of entries) {
      const chain = feedChain(address);
      if (!chain) {
        throw new Error(
          `Unknown feed address: ${address}. Pass an RPC URL as the second argument.`,
        );
      }
      if (!byChain.has(chain)) byChain.set(chain, []);
      byChain.get(chain)!.push([name, address]);
    }
    for (const [chain, chainEntries] of byChain) {
      groups.push({ feedEntries: chainEntries, groupRpc: rpcs[chain] });
    }
  }

  const out: Record<string, RoundData & { description: string }> = {};

  await Promise.all(
    groups.map(async ({ feedEntries, groupRpc }) => {
      // 3 calls per feed: decimals, description, latestRoundData
      const calls: Multicall3Call[] = feedEntries.flatMap(([, addr]) => [
        { target: addr, callData: SEL_DECIMALS },
        { target: addr, callData: SEL_DESCRIPTION },
        { target: addr, callData: SEL_LATEST_ROUND_DATA },
      ]);

      const results = await multicall(calls, groupRpc);

      for (let i = 0; i < feedEntries.length; i++) {
        const [name, addr] = feedEntries[i];
        const decRes = results[i * 3];
        const descRes = results[i * 3 + 1];
        const roundRes = results[i * 3 + 2];

        if (!decRes.success || !descRes.success || !roundRes.success) {
          throw new Error(`Multicall sub-call failed for feed: ${addr}`);
        }

        const decimals = Number(readWord(decRes.data, 0));
        const description = decodeString(descRes.data);
        const raw = parseRoundDataRaw(roundRes.data);

        out[name] = formatRound(raw, decimals, description);
      }
    }),
  );

  return out;
}
