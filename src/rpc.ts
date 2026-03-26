// Chainlink price feed reader — zero dependencies, just fetch()

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
  const length = Number(
    BigInt("0x" + hex.slice(charOffset, charOffset + 64))
  );
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

// ─── JSON-RPC transport ──────────────────────────────────────────────────────

let rpcIdCounter = 1;

async function ethCall(
  rpcUrl: string,
  to: string,
  data: string
): Promise<string> {
  const res = await fetch(rpcUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: rpcIdCounter++,
      method: "eth_call",
      params: [{ to, data }, "latest"],
    }),
  });
  const json = (await res.json()) as { result?: string; error?: { message: string } };
  if (json.error) throw new Error(`RPC error: ${json.error.message}`);
  return json.result!;
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

function formatRound(raw: RoundDataRaw, decimals: number, description: string): RoundData & { description: string } {
  return {
    roundId: raw.roundId,
    answer: formatPrice(raw.answer, decimals),
    startedAt: new Date(Number(raw.startedAt) * 1000),
    updatedAt: new Date(Number(raw.updatedAt) * 1000),
    answeredInRound: raw.answeredInRound,
    description,
  };
}

/** Get decimals and description for a feed contract. */
export async function getFeedMetadata(
  rpcUrl: string,
  contractAddress: string
): Promise<FeedMetadata> {
  const [decHex, descHex] = await Promise.all([
    ethCall(rpcUrl, contractAddress, SEL_DECIMALS),
    ethCall(rpcUrl, contractAddress, SEL_DESCRIPTION),
  ]);
  return {
    decimals: Number(readWord(decHex, 0)),
    description: decodeString(descHex),
  };
}

/** Get the latest round data, formatted with price as a decimal string. */
export async function getLatestRoundData(
  rpcUrl: string,
  contractAddress: string
): Promise<RoundData & { description: string }> {
  const [meta, hex] = await Promise.all([
    getFeedMetadata(rpcUrl, contractAddress),
    ethCall(rpcUrl, contractAddress, SEL_LATEST_ROUND_DATA),
  ]);
  return formatRound(parseRoundDataRaw(hex), meta.decimals, meta.description);
}

/** Get the latest round data without fetching metadata (provide your own). */
export async function getLatestRoundDataWithMeta(
  rpcUrl: string,
  contractAddress: string,
  meta: FeedMetadata
): Promise<RoundData & { description: string }> {
  const hex = await ethCall(rpcUrl, contractAddress, SEL_LATEST_ROUND_DATA);
  return formatRound(parseRoundDataRaw(hex), meta.decimals, meta.description);
}

/** Get raw (unformatted) latest round data. */
export async function getLatestRoundDataRaw(
  rpcUrl: string,
  contractAddress: string
): Promise<RoundDataRaw> {
  const hex = await ethCall(rpcUrl, contractAddress, SEL_LATEST_ROUND_DATA);
  return parseRoundDataRaw(hex);
}

/** Get data for a specific round ID. */
export async function getRoundData(
  rpcUrl: string,
  contractAddress: string,
  roundId: bigint
): Promise<RoundData & { description: string }> {
  const [meta, hex] = await Promise.all([
    getFeedMetadata(rpcUrl, contractAddress),
    ethCall(rpcUrl, contractAddress, SEL_GET_ROUND_DATA + encodeUint(roundId)),
  ]);
  return formatRound(parseRoundDataRaw(hex), meta.decimals, meta.description);
}

/** Get the current phase ID. */
export async function getPhaseId(
  rpcUrl: string,
  contractAddress: string
): Promise<bigint> {
  const hex = await ethCall(rpcUrl, contractAddress, SEL_PHASE_ID);
  return readWord(hex, 0);
}

/** Get the aggregator address for a given phase. */
export async function getPhaseAggregator(
  rpcUrl: string,
  contractAddress: string,
  phaseId: bigint
): Promise<string> {
  const hex = await ethCall(
    rpcUrl,
    contractAddress,
    SEL_PHASE_AGGREGATORS + encodeUint(phaseId)
  );
  return "0x" + hex.slice(26, 66);
}

/** Get the current aggregator address. */
export async function getAggregator(
  rpcUrl: string,
  contractAddress: string
): Promise<string> {
  const hex = await ethCall(rpcUrl, contractAddress, SEL_AGGREGATOR);
  return "0x" + hex.slice(26, 66);
}

/** Fetch latest prices for multiple feeds in parallel. */
export async function getMultipleFeedPrices(
  rpcUrl: string,
  feeds: Record<string, string>
): Promise<Record<string, RoundData & { description: string }>> {
  const entries = Object.entries(feeds);
  const results = await Promise.all(
    entries.map(([, address]) => getLatestRoundData(rpcUrl, address))
  );
  const out: Record<string, RoundData & { description: string }> = {};
  for (let i = 0; i < entries.length; i++) {
    out[entries[i][0]] = results[i];
  }
  return out;
}
