import { describe, expect, test, vi } from "vitest";
import {
  formatPrice,
  readLatestPrice,
  readLatestPriceRaw,
  readLatestPriceWithMeta,
  readPriceAtRound,
  readFeedMetadata,
  readPhaseId,
  readPhaseAggregator,
  readAggregator,
  readPrices,
  multicall,
} from "../rpc.js";
import { polygonDataFeeds } from "../dataFeeds/polygon.js";
import { ethereumDataFeeds } from "../dataFeeds/ethereum.js";
import { baseDataFeeds } from "../dataFeeds/base.js";
import { arbitrumDataFeeds } from "../dataFeeds/arbitrum.js";

// ─── formatPrice ─────────────────────────────────────────────────────────────

describe("formatPrice", () => {
  test("formats integer price with 8 decimals", () => {
    expect(formatPrice(180000000000n, 8)).toBe("1800");
  });

  test("formats fractional price", () => {
    expect(formatPrice(123456789n, 8)).toBe("1.23456789");
  });

  test("handles zero", () => {
    expect(formatPrice(0n, 8)).toBe("0");
  });

  test("handles zero decimals", () => {
    expect(formatPrice(42n, 0)).toBe("42");
  });

  test("handles 18 decimals", () => {
    expect(formatPrice(100000000000000000000n, 18)).toBe("100");
  });

  test("handles small fractional values", () => {
    expect(formatPrice(1n, 8)).toBe("0.00000001");
  });

  test("strips trailing zeros", () => {
    expect(formatPrice(180000000000n, 8)).toBe("1800");
    expect(formatPrice(150000000n, 8)).toBe("1.5");
  });

  test("handles negative values", () => {
    expect(formatPrice(-100000000n, 8)).toBe("-1");
  });
});

// ─── RPC functions (mocked fetch) ───────────────────────────────────────────

// Helper to build a hex response with 32-byte words
function hexWords(...values: bigint[]): string {
  return "0x" + values.map((v) => v.toString(16).padStart(64, "0")).join("");
}

// Helper to build an ABI-encoded string response
function hexString(str: string): string {
  const hex = Buffer.from(str, "utf8").toString("hex");
  const offset = 32n; // offset to string data
  const length = BigInt(str.length);
  return (
    "0x" +
    offset.toString(16).padStart(64, "0") +
    length.toString(16).padStart(64, "0") +
    hex.padEnd(Math.ceil(hex.length / 64) * 64, "0")
  );
}

/**
 * Build a mock ABI-encoded Multicall3.aggregate3 Result[] response.
 * Result = (bool success, bytes returnData)
 */
function hexMulticallResults(
  results: Array<{ success: boolean; data: string }>,
): string {
  const n = results.length;

  // sizeof each element: success(32) + bytes_ptr(32) + bytes_len(32) + bytes_data(padded)
  const sizes = results.map(r => {
    const dataBytes = (r.data.length - 2) / 2;
    return 96 + Math.ceil(dataBytes / 32) * 32;
  });

  // Offsets from start of array content (right after length word).
  const offsets: number[] = [];
  let off = n * 32;
  for (const sz of sizes) {
    offsets.push(off);
    off += sz;
  }

  let hex = "";
  hex += "0000000000000000000000000000000000000000000000000000000000000020"; // array offset
  hex += n.toString(16).padStart(64, "0"); // array length
  for (const o of offsets) hex += o.toString(16).padStart(64, "0");

  for (const r of results) {
    const dataHex = r.data.slice(2);
    const dataBytes = dataHex.length / 2;
    const dataPadded = Math.ceil(dataBytes / 32) * 32;
    hex += (r.success ? 1n : 0n).toString(16).padStart(64, "0"); // success
    hex += "0000000000000000000000000000000000000000000000000000000000000040"; // bytes ptr = 64
    hex += dataBytes.toString(16).padStart(64, "0"); // bytes length
    hex += dataHex.padEnd(dataPadded * 2, "0"); // bytes data
  }

  return "0x" + hex;
}

function mockFetch(responses: Record<string, string>) {
  let callIndex = 0;
  const calls: string[] = [];

  global.fetch = vi.fn(async (_url: any, opts: any) => {
    const body = JSON.parse(opts.body);
    calls.push(body.params[0].data);
    const data = body.params[0].data as string;
    const selector = data.slice(0, 10);
    const result = responses[selector];
    if (!result) throw new Error(`Unmocked selector: ${selector}`);
    return {
      json: async () => ({ jsonrpc: "2.0", id: body.id, result }),
    } as Response;
  });

  return calls;
}

describe("readFeedMetadata", () => {
  test("returns decimals and description", async () => {
    mockFetch({
      "0x313ce567": hexWords(8n), // decimals
      "0x7284e416": hexString("ETH / USD"), // description
    });

    const meta = await readFeedMetadata("0xabc", "http://rpc");
    expect(meta.decimals).toBe(8);
    expect(meta.description).toBe("ETH / USD");
  });
});

describe("readLatestPrice", () => {
  test("returns formatted round data with description", async () => {
    mockFetch({
      "0x313ce567": hexWords(8n),
      "0x7284e416": hexString("ETH / USD"),
      "0xfeaf968c": hexWords(
        100n,
        180000000000n,
        1700000000n,
        1700000001n,
        100n,
      ),
    });

    const data = await readLatestPrice("0xabc", "http://rpc");
    expect(data.roundId).toBe(100n);
    expect(data.answer).toBe("1800");
    expect(data.description).toBe("ETH / USD");
    expect(data.startedAt).toBeInstanceOf(Date);
    expect(data.updatedAt).toBeInstanceOf(Date);
    expect(data.answeredInRound).toBe(100n);
  });
});

describe("readLatestPriceRaw", () => {
  test("returns raw bigint values", async () => {
    mockFetch({
      "0xfeaf968c": hexWords(
        100n,
        180000000000n,
        1700000000n,
        1700000001n,
        100n,
      ),
    });

    const data = await readLatestPriceRaw("0xabc", "http://rpc");
    expect(data.roundId).toBe(100n);
    expect(data.answer).toBe(180000000000n);
    expect(data.startedAt).toBe(1700000000n);
    expect(data.updatedAt).toBe(1700000001n);
    expect(data.answeredInRound).toBe(100n);
  });
});

describe("readLatestPriceWithMeta", () => {
  test("uses provided metadata instead of fetching", async () => {
    const calls = mockFetch({
      "0xfeaf968c": hexWords(
        50n,
        4200000000000n,
        1700000000n,
        1700000001n,
        50n,
      ),
    });

    const data = await readLatestPriceWithMeta(
      "0xabc",
      { decimals: 8, description: "BTC / USD" },
      "http://rpc",
    );

    expect(data.answer).toBe("42000");
    expect(data.description).toBe("BTC / USD");
    // Should only make 1 call (latestRoundData), not 3
    expect(calls).toHaveLength(1);
  });
});

describe("readPriceAtRound", () => {
  test("fetches specific round by ID", async () => {
    const calls = mockFetch({
      "0x313ce567": hexWords(8n),
      "0x7284e416": hexString("BTC / USD"),
      "0x9a6fc8f5": hexWords(
        50n,
        4200000000000n,
        1700000000n,
        1700000001n,
        50n,
      ),
    });

    const data = await readPriceAtRound("0xabc", 50n, "http://rpc");
    expect(data.roundId).toBe(50n);
    expect(data.answer).toBe("42000");

    // Verify roundId was ABI-encoded in the call data
    const getRoundCall = calls.find((c) => c.startsWith("0x9a6fc8f5"));
    expect(getRoundCall).toBeDefined();
    expect(getRoundCall!.length).toBe(10 + 64); // selector + uint256
  });
});

describe("readPhaseId", () => {
  test("returns phase ID as bigint", async () => {
    mockFetch({
      "0x58303b10": hexWords(5n),
    });

    const phase = await readPhaseId("0xabc", "http://rpc");
    expect(phase).toBe(5n);
  });
});

describe("readPhaseAggregator", () => {
  test("returns aggregator address", async () => {
    const addr = "0x1234567890abcdef1234567890abcdef12345678";
    mockFetch({
      "0xc1597304": "0x000000000000000000000000" + addr.slice(2),
    });

    const aggregator = await readPhaseAggregator("0xabc", 5n, "http://rpc");
    expect(aggregator).toBe(addr);
  });
});

describe("readAggregator", () => {
  test("returns current aggregator address", async () => {
    const addr = "0xabcdef1234567890abcdef1234567890abcdef12";
    mockFetch({
      "0x245a7bfc": "0x000000000000000000000000" + addr.slice(2),
    });

    const aggregator = await readAggregator("0xabc", "http://rpc");
    expect(aggregator).toBe(addr);
  });
});

describe("readPrices", () => {
  test("batches all feeds into a single multicall", async () => {
    const mockResponse = hexMulticallResults([
      { success: true, data: hexWords(8n) }, // ETH decimals
      { success: true, data: hexString("ETH / USD") }, // ETH description
      {
        success: true,
        data: hexWords(1n, 180000000000n, 1700000000n, 1700000001n, 1n),
      }, // ETH latestRoundData
      { success: true, data: hexWords(8n) }, // BTC decimals
      { success: true, data: hexString("BTC / USD") }, // BTC description
      {
        success: true,
        data: hexWords(2n, 4200000000000n, 1700000000n, 1700000001n, 2n),
      }, // BTC latestRoundData
    ]);

    const calls = mockFetch({ "0x82ad56cb": mockResponse });

    const results = await readPrices(
      { "ETH / USD": "0xaaa", "BTC / USD": "0xbbb" },
      "http://rpc",
    );

    // Only 1 RPC call made (the multicall), not 6 individual calls
    expect(calls).toHaveLength(1);
    expect(calls[0].slice(0, 10)).toBe("0x82ad56cb");

    expect(Object.keys(results)).toHaveLength(2);
    expect(results["ETH / USD"].answer).toBe("1800");
    expect(results["ETH / USD"].description).toBe("ETH / USD");
    expect(results["BTC / USD"].answer).toBe("42000");
    expect(results["BTC / USD"].description).toBe("BTC / USD");
    expect(results["ETH / USD"].roundId).toBe(1n);
    expect(results["BTC / USD"].roundId).toBe(2n);
  });

  test("returns empty object for empty input", async () => {
    const result = await readPrices({}, "http://rpc");
    expect(result).toEqual({});
  });

  test("throws when a sub-call fails", async () => {
    const mockResponse = hexMulticallResults([
      { success: false, data: "0x" }, // decimals call reverted
      { success: true, data: hexString("ETH / USD") },
      {
        success: true,
        data: hexWords(1n, 180000000000n, 1700000000n, 1700000001n, 1n),
      },
    ]);

    mockFetch({ "0x82ad56cb": mockResponse });

    await expect(
      readPrices({ "ETH / USD": "0xaaa" }, "http://rpc"),
    ).rejects.toThrow("Multicall sub-call failed for feed: 0xaaa");
  });

  test("encodes feed addresses in multicall calldata", async () => {
    const mockResponse = hexMulticallResults([
      { success: true, data: hexWords(8n) },
      { success: true, data: hexString("ETH / USD") },
      {
        success: true,
        data: hexWords(1n, 180000000000n, 1700000000n, 1700000001n, 1n),
      },
    ]);

    const calls = mockFetch({ "0x82ad56cb": mockResponse });

    await readPrices({ "ETH / USD": "0xAbCdEf1234567890abcdef1234567890AbCdEf12" }, "http://rpc");

    // The feed address should appear (lowercased) inside the multicall calldata
    expect(calls[0]).toContain("abcdef1234567890abcdef1234567890abcdef12");
  });
});

describe("multicall", () => {
  test("encodes and decodes aggregate3 round-trip", async () => {
    const roundData = hexWords(
      5n,
      4200000000000n,
      1700000000n,
      1700000001n,
      5n,
    );
    const mockResponse = hexMulticallResults([
      { success: true, data: hexWords(8n) },
      { success: true, data: roundData },
    ]);

    mockFetch({ "0x82ad56cb": mockResponse });

    const results = await multicall(
      [
        { target: "0xabc", callData: "0x313ce567" },
        { target: "0xabc", callData: "0xfeaf968c" },
      ],
      "http://rpc",
    );

    expect(results).toHaveLength(2);
    expect(results[0].success).toBe(true);
    expect(results[0].data).toBe(hexWords(8n));
    expect(results[1].success).toBe(true);
    expect(results[1].data).toBe(roundData);
  });

  test("returns success=false for failed sub-calls", async () => {
    const mockResponse = hexMulticallResults([
      { success: true, data: hexWords(42n) },
      { success: false, data: "0x" },
    ]);

    mockFetch({ "0x82ad56cb": mockResponse });

    const results = await multicall(
      [
        { target: "0xaaa", callData: "0x313ce567" },
        { target: "0xbbb", callData: "0x313ce567" },
      ],
      "http://rpc",
    );

    expect(results[0].success).toBe(true);
    expect(results[0].data).toBe(hexWords(42n));
    expect(results[1].success).toBe(false);
    expect(results[1].data).toBe("0x");
  });

  test("handles a single call", async () => {
    const mockResponse = hexMulticallResults([
      { success: true, data: hexWords(18n) },
    ]);

    const calls = mockFetch({ "0x82ad56cb": mockResponse });

    const results = await multicall(
      [{ target: "0xabc", callData: "0x313ce567" }],
      "http://rpc",
    );

    expect(results).toHaveLength(1);
    expect(results[0].success).toBe(true);
    expect(calls).toHaveLength(1); // still only 1 RPC call
  });

  test("handles results with string return data", async () => {
    const mockResponse = hexMulticallResults([
      { success: true, data: hexString("BTC / USD") },
    ]);

    mockFetch({ "0x82ad56cb": mockResponse });

    const results = await multicall(
      [{ target: "0xabc", callData: "0x7284e416" }],
      "http://rpc",
    );

    expect(results[0].success).toBe(true);
    // The raw data should decode as a string via decodeString
    expect(results[0].data).toBe(hexString("BTC / USD"));
  });
});

describe("RPC error handling", () => {
  test("throws on RPC error response", async () => {
    global.fetch = vi.fn(async () => ({
      json: async () => ({
        jsonrpc: "2.0",
        id: 1,
        error: { message: "execution reverted" },
      }),
    })) as any;

    await expect(readLatestPriceRaw("0xabc", "http://rpc")).rejects.toThrow(
      "RPC error: execution reverted",
    );
  });
});

// ─── Data feed address validation ────────────────────────────────────────────

describe("data feed exports", () => {
  test("polygon data feeds has valid addresses", () => {
    expect(Object.keys(polygonDataFeeds).length).toBeGreaterThan(0);
    for (const [name, address] of Object.entries(polygonDataFeeds)) {
      expect(address).toMatch(/^0x[a-fA-F0-9]{40}$/);
      expect(name.length).toBeGreaterThan(0);
    }
  });

  test("ethereum data feeds has valid addresses", () => {
    expect(Object.keys(ethereumDataFeeds).length).toBeGreaterThan(0);
    for (const [, address] of Object.entries(ethereumDataFeeds)) {
      expect(address).toMatch(/^0x[a-fA-F0-9]{40}$/);
    }
  });

  test("base data feeds has valid addresses", () => {
    expect(Object.keys(baseDataFeeds).length).toBeGreaterThan(0);
    for (const [, address] of Object.entries(baseDataFeeds)) {
      expect(address).toMatch(/^0x[a-fA-F0-9]{40}$/);
    }
  });

  test("arbitrum data feeds has valid addresses", () => {
    expect(Object.keys(arbitrumDataFeeds).length).toBeGreaterThan(0);
    for (const [, address] of Object.entries(arbitrumDataFeeds)) {
      expect(address).toMatch(/^0x[a-fA-F0-9]{40}$/);
    }
  });

  test("polygon feeds include common pairs", () => {
    expect(polygonDataFeeds).toHaveProperty("ETH / USD");
    expect(polygonDataFeeds).toHaveProperty("BTC / USD");
    expect(polygonDataFeeds).toHaveProperty("LINK / USD");
  });

  test("ethereum feeds include common pairs", () => {
    expect(ethereumDataFeeds).toHaveProperty("ETH / USD");
    expect(ethereumDataFeeds).toHaveProperty("BTC / USD");
  });
});

// ─── Index exports ───────────────────────────────────────────────────────────

describe("index exports", () => {
  test("exports all expected symbols", async () => {
    const index = await import("../index.js");

    // RPC functions
    expect(index.readLatestPrice).toBeTypeOf("function");
    expect(index.readLatestPriceRaw).toBeTypeOf("function");
    expect(index.readLatestPriceWithMeta).toBeTypeOf("function");
    expect(index.readPriceAtRound).toBeTypeOf("function");
    expect(index.readFeedMetadata).toBeTypeOf("function");
    expect(index.readPhaseId).toBeTypeOf("function");
    expect(index.readPhaseAggregator).toBeTypeOf("function");
    expect(index.readAggregator).toBeTypeOf("function");
    expect(index.readPrices).toBeTypeOf("function");
    expect(index.multicall).toBeTypeOf("function");
    expect(index.formatPrice).toBeTypeOf("function");

    // Data feed exports
    expect(index.ethereumDataFeeds).toBeDefined();
    expect(index.polygonDataFeeds).toBeDefined();
    expect(index.arbitrumDataFeeds).toBeDefined();
    expect(index.baseDataFeeds).toBeDefined();
  });
});
