import { describe, expect, test, vi } from "vitest";
import {
  formatPrice,
  getLatestRoundData,
  getLatestRoundDataRaw,
  getLatestRoundDataWithMeta,
  getRoundData,
  getFeedMetadata,
  getPhaseId,
  getPhaseAggregator,
  getAggregator,
  getMultipleFeedPrices,
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

describe("getFeedMetadata", () => {
  test("returns decimals and description", async () => {
    mockFetch({
      "0x313ce567": hexWords(8n),           // decimals
      "0x7284e416": hexString("ETH / USD"), // description
    });

    const meta = await getFeedMetadata("http://rpc", "0xabc");
    expect(meta.decimals).toBe(8);
    expect(meta.description).toBe("ETH / USD");
  });
});

describe("getLatestRoundData", () => {
  test("returns formatted round data with description", async () => {
    mockFetch({
      "0x313ce567": hexWords(8n),
      "0x7284e416": hexString("ETH / USD"),
      "0xfeaf968c": hexWords(100n, 180000000000n, 1700000000n, 1700000001n, 100n),
    });

    const data = await getLatestRoundData("http://rpc", "0xabc");
    expect(data.roundId).toBe(100n);
    expect(data.answer).toBe("1800");
    expect(data.description).toBe("ETH / USD");
    expect(data.startedAt).toBeInstanceOf(Date);
    expect(data.updatedAt).toBeInstanceOf(Date);
    expect(data.answeredInRound).toBe(100n);
  });
});

describe("getLatestRoundDataRaw", () => {
  test("returns raw bigint values", async () => {
    mockFetch({
      "0xfeaf968c": hexWords(100n, 180000000000n, 1700000000n, 1700000001n, 100n),
    });

    const data = await getLatestRoundDataRaw("http://rpc", "0xabc");
    expect(data.roundId).toBe(100n);
    expect(data.answer).toBe(180000000000n);
    expect(data.startedAt).toBe(1700000000n);
    expect(data.updatedAt).toBe(1700000001n);
    expect(data.answeredInRound).toBe(100n);
  });
});

describe("getLatestRoundDataWithMeta", () => {
  test("uses provided metadata instead of fetching", async () => {
    const calls = mockFetch({
      "0xfeaf968c": hexWords(50n, 4200000000000n, 1700000000n, 1700000001n, 50n),
    });

    const data = await getLatestRoundDataWithMeta(
      "http://rpc",
      "0xabc",
      { decimals: 8, description: "BTC / USD" }
    );

    expect(data.answer).toBe("42000");
    expect(data.description).toBe("BTC / USD");
    // Should only make 1 call (latestRoundData), not 3
    expect(calls).toHaveLength(1);
  });
});

describe("getRoundData", () => {
  test("fetches specific round by ID", async () => {
    const calls = mockFetch({
      "0x313ce567": hexWords(8n),
      "0x7284e416": hexString("BTC / USD"),
      "0x9a6fc8f5": hexWords(50n, 4200000000000n, 1700000000n, 1700000001n, 50n),
    });

    const data = await getRoundData("http://rpc", "0xabc", 50n);
    expect(data.roundId).toBe(50n);
    expect(data.answer).toBe("42000");

    // Verify roundId was ABI-encoded in the call data
    const getRoundCall = calls.find((c) => c.startsWith("0x9a6fc8f5"));
    expect(getRoundCall).toBeDefined();
    expect(getRoundCall!.length).toBe(10 + 64); // selector + uint256
  });
});

describe("getPhaseId", () => {
  test("returns phase ID as bigint", async () => {
    mockFetch({
      "0x58303b10": hexWords(5n),
    });

    const phase = await getPhaseId("http://rpc", "0xabc");
    expect(phase).toBe(5n);
  });
});

describe("getPhaseAggregator", () => {
  test("returns aggregator address", async () => {
    const addr = "0x1234567890abcdef1234567890abcdef12345678";
    mockFetch({
      "0xc1597304": "0x000000000000000000000000" + addr.slice(2),
    });

    const aggregator = await getPhaseAggregator("http://rpc", "0xabc", 5n);
    expect(aggregator).toBe(addr);
  });
});

describe("getAggregator", () => {
  test("returns current aggregator address", async () => {
    const addr = "0xabcdef1234567890abcdef1234567890abcdef12";
    mockFetch({
      "0x245a7bfc": "0x000000000000000000000000" + addr.slice(2),
    });

    const aggregator = await getAggregator("http://rpc", "0xabc");
    expect(aggregator).toBe(addr);
  });
});

describe("getMultipleFeedPrices", () => {
  test("fetches multiple feeds in parallel", async () => {
    mockFetch({
      "0x313ce567": hexWords(8n),
      "0x7284e416": hexString("ETH / USD"),
      "0xfeaf968c": hexWords(1n, 180000000000n, 1700000000n, 1700000001n, 1n),
    });

    const results = await getMultipleFeedPrices("http://rpc", {
      "ETH / USD": "0xaaa",
      "BTC / USD": "0xbbb",
    });

    expect(Object.keys(results)).toHaveLength(2);
    expect(results["ETH / USD"]).toBeDefined();
    expect(results["BTC / USD"]).toBeDefined();
    expect(results["ETH / USD"].answer).toBe("1800");
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

    await expect(
      getLatestRoundDataRaw("http://rpc", "0xabc")
    ).rejects.toThrow("RPC error: execution reverted");
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
    expect(polygonDataFeeds).toHaveProperty("MATIC / USD");
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
    expect(index.getLatestRoundData).toBeTypeOf("function");
    expect(index.getLatestRoundDataRaw).toBeTypeOf("function");
    expect(index.getLatestRoundDataWithMeta).toBeTypeOf("function");
    expect(index.getRoundData).toBeTypeOf("function");
    expect(index.getFeedMetadata).toBeTypeOf("function");
    expect(index.getPhaseId).toBeTypeOf("function");
    expect(index.getPhaseAggregator).toBeTypeOf("function");
    expect(index.getAggregator).toBeTypeOf("function");
    expect(index.getMultipleFeedPrices).toBeTypeOf("function");
    expect(index.formatPrice).toBeTypeOf("function");

    // Data feed exports
    expect(index.polygonDataFeeds).toBeDefined();
    expect(index.ethereumDataFeeds).toBeDefined();
    expect(index.baseDataFeeds).toBeDefined();
    expect(index.bscDataFeeds).toBeDefined();
    expect(index.fantomDataFeeds).toBeDefined();
    expect(index.xdaiDataFeeds).toBeDefined();
    expect(index.celoDataFeeds).toBeDefined();
    expect(index.arbitrumDataFeeds).toBeDefined();
    expect(index.avalancheDataFeeds).toBeDefined();
    expect(index.moonbeamDataFeeds).toBeDefined();
    expect(index.optimismDataFeeds).toBeDefined();
    expect(index.harmonyDataFeeds).toBeDefined();
    expect(index.scrollDataFeeds).toBeDefined();
  });
});
