import { describe, expect, test, vi, beforeEach } from "vitest";
import { formatRoundData, formatLogWithMetadata, useWebsocketOrHttpTransport } from "../utils.js";
import { polygonDataFeeds } from "../dataFeeds/polygon.js";
import { ethereumDataFeeds } from "../dataFeeds/ethereum.js";
import { baseDataFeeds } from "../dataFeeds/base.js";
import { arbitrumDataFeeds } from "../dataFeeds/arbitrum.js";

// ─── Utility function tests ─────────────────────────────────────────────────

describe("formatRoundData", () => {
  test("formats round data with correct values", () => {
    const round: readonly [bigint, bigint, bigint, bigint, bigint] = [
      100n,           // roundId
      180000000000n,  // answer (1800.00000000 with 8 decimals)
      1700000000n,    // startedAt
      1700000001n,    // updatedAt
      100n,           // answeredInRound
    ];

    const result = formatRoundData(round, 8, "ETH / USD");

    expect(result.roundId).toBe(100n);
    expect(result.answer).toBe("1800");
    expect(result.description).toBe("ETH / USD");
    expect(result.time).toBeInstanceOf(Date);
    expect(result.time.getTime()).toBe(1700000000 * 1000);
  });

  test("formats with different decimal values", () => {
    const round: readonly [bigint, bigint, bigint, bigint, bigint] = [
      1n,
      100000000000000000000n, // 100 with 18 decimals
      1700000000n,
      1700000001n,
      1n,
    ];

    const result = formatRoundData(round, 18, "LINK / ETH");

    expect(result.answer).toBe("100");
    expect(result.description).toBe("LINK / ETH");
  });

  test("handles zero answer", () => {
    const round: readonly [bigint, bigint, bigint, bigint, bigint] = [
      1n, 0n, 1700000000n, 1700000001n, 1n,
    ];

    const result = formatRoundData(round, 8, "TEST / USD");

    expect(result.answer).toBe("0");
  });

  test("handles fractional amounts", () => {
    const round: readonly [bigint, bigint, bigint, bigint, bigint] = [
      1n,
      123456789n, // 1.23456789 with 8 decimals
      1700000000n,
      1700000001n,
      1n,
    ];

    const result = formatRoundData(round, 8, "TEST / USD");

    expect(result.answer).toBe("1.23456789");
  });
});

describe("formatLogWithMetadata", () => {
  test("formats log data correctly", () => {
    const result = formatLogWithMetadata(
      180000000000n,  // current
      8,              // decimals
      42n,            // roundId
      1700000000n,    // updatedAt
      "ETH / USD"     // description
    );

    expect(result.roundId).toBe(42n);
    expect(result.current).toBe("1800");
    expect(result.updatedAt).toBeInstanceOf(Date);
    expect(result.updatedAt.getTime()).toBe(1700000000 * 1000);
    expect(result.description).toBe("ETH / USD");
    expect(result.decimals).toBe(8);
  });

  test("handles small values", () => {
    const result = formatLogWithMetadata(
      1n,    // 0.00000001 with 8 decimals
      8,
      1n,
      1700000000n,
      "SHIB / USD"
    );

    expect(result.current).toBe("0.00000001");
  });
});

describe("useWebsocketOrHttpTransport", () => {
  test("returns websocket transport for ws:// URL", () => {
    const transport = useWebsocketOrHttpTransport("ws://localhost:8545");
    expect(transport).toBeDefined();
    expect(transport({ chain: undefined, retryCount: 0, timeout: 10000 })).toBeDefined();
  });

  test("returns websocket transport for wss:// URL", () => {
    const transport = useWebsocketOrHttpTransport("wss://mainnet.infura.io/ws/v3/key");
    expect(transport).toBeDefined();
  });

  test("returns http transport for http:// URL", () => {
    const transport = useWebsocketOrHttpTransport("http://localhost:8545");
    expect(transport).toBeDefined();
  });

  test("returns http transport for https:// URL", () => {
    const transport = useWebsocketOrHttpTransport("https://mainnet.infura.io/v3/key");
    expect(transport).toBeDefined();
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

// ─── ChainLinkDataFeed class tests (mocked) ─────────────────────────────────

describe("ChainLinkDataFeed", () => {
  const mockLatestRoundData = [100n, 180000000000n, 1700000000n, 1700000001n, 100n] as const;

  function createMockClient() {
    return {
      chain: { id: 137, name: "Polygon" },
      transport: { type: "http" },
      batch: { multicall: true },
      readContract: vi.fn(),
      watchContractEvent: vi.fn(),
      multicall: vi.fn(),
    } as any;
  }

  test("constructs with correct contract address", async () => {
    const { default: ChainLinkDataFeed } = await import("../ChainLinkDataFeed.js");
    const client = createMockClient();
    const address = "0x443C5116CdF663Eb387e72C688D276e702135C87" as const;

    const feed = new ChainLinkDataFeed({
      contractAddress: address,
      viemClient: client,
    });

    expect(feed.contractAddress).toBe(address);
    expect(feed.decimals).toBe(0);
    expect(feed.description).toBe("");
    expect(feed.isWorking).toBe(true);
  });

  test("getLatestRoundData returns formatted data", async () => {
    const { default: ChainLinkDataFeed } = await import("../ChainLinkDataFeed.js");
    const client = createMockClient();

    const feed = new ChainLinkDataFeed({
      contractAddress: "0x443C5116CdF663Eb387e72C688D276e702135C87",
      viemClient: client,
    });

    // Mock the contract read methods
    feed.contract = {
      read: {
        decimals: vi.fn().mockResolvedValue(8),
        description: vi.fn().mockResolvedValue("ETH / USD"),
        latestRoundData: vi.fn().mockResolvedValue(mockLatestRoundData),
        phaseId: vi.fn().mockResolvedValue(1n),
        phaseAggregators: vi.fn().mockResolvedValue("0x1234567890123456789012345678901234567890"),
        getRoundData: vi.fn().mockResolvedValue(mockLatestRoundData),
      },
      address: "0x443C5116CdF663Eb387e72C688D276e702135C87",
      abi: [],
    } as any;

    const data = await feed.getLatestRoundData(true);

    expect(data.description).toBe("ETH / USD");
    expect(data.roundId).toBe(100n);
    expect(data.answer).toBe("1800");
    expect(data.time).toBeInstanceOf(Date);
  });

  test("getLatestRoundData returns raw data when format is false", async () => {
    const { default: ChainLinkDataFeed } = await import("../ChainLinkDataFeed.js");
    const client = createMockClient();

    const feed = new ChainLinkDataFeed({
      contractAddress: "0x443C5116CdF663Eb387e72C688D276e702135C87",
      viemClient: client,
    });

    feed.contract = {
      read: {
        decimals: vi.fn().mockResolvedValue(8),
        description: vi.fn().mockResolvedValue("ETH / USD"),
        latestRoundData: vi.fn().mockResolvedValue(mockLatestRoundData),
        phaseId: vi.fn(),
        phaseAggregators: vi.fn(),
        getRoundData: vi.fn(),
      },
      address: "0x443C5116CdF663Eb387e72C688D276e702135C87",
      abi: [],
    } as any;

    const data = await feed.getLatestRoundData(false);

    expect(data).toEqual(mockLatestRoundData);
  });

  test("getRoundData returns formatted data for a specific round", async () => {
    const { default: ChainLinkDataFeed } = await import("../ChainLinkDataFeed.js");
    const client = createMockClient();

    const feed = new ChainLinkDataFeed({
      contractAddress: "0x443C5116CdF663Eb387e72C688D276e702135C87",
      viemClient: client,
    });

    feed.contract = {
      read: {
        decimals: vi.fn().mockResolvedValue(8),
        description: vi.fn().mockResolvedValue("BTC / USD"),
        latestRoundData: vi.fn(),
        phaseId: vi.fn(),
        phaseAggregators: vi.fn(),
        getRoundData: vi.fn().mockResolvedValue([50n, 4200000000000n, 1700000000n, 1700000001n, 50n]),
      },
      address: "0x443C5116CdF663Eb387e72C688D276e702135C87",
      abi: [],
    } as any;

    const data = await feed.getRoundData(50n);

    expect(data).toEqual({
      roundId: 50n,
      answer: "42000",
      time: new Date(1700000000 * 1000),
      description: "BTC / USD",
    });
  });

  test("updateMetadata sets decimals and description", async () => {
    const { default: ChainLinkDataFeed } = await import("../ChainLinkDataFeed.js");
    const client = createMockClient();

    const feed = new ChainLinkDataFeed({
      contractAddress: "0x443C5116CdF663Eb387e72C688D276e702135C87",
      viemClient: client,
    });

    feed.contract = {
      read: {
        decimals: vi.fn().mockResolvedValue(8),
        description: vi.fn().mockResolvedValue("ETH / USD"),
        latestRoundData: vi.fn(),
        phaseId: vi.fn(),
        phaseAggregators: vi.fn(),
        getRoundData: vi.fn(),
      },
      address: "0x443C5116CdF663Eb387e72C688D276e702135C87",
      abi: [],
    } as any;

    await feed.updateMetadata();

    expect(feed.decimals).toBe(8);
    expect(feed.description).toBe("ETH / USD");
  });

  test("updateMetadata sets isWorking to false on error", async () => {
    const { default: ChainLinkDataFeed } = await import("../ChainLinkDataFeed.js");
    const client = createMockClient();

    const feed = new ChainLinkDataFeed({
      contractAddress: "0x443C5116CdF663Eb387e72C688D276e702135C87",
      viemClient: client,
    });

    feed.contract = {
      read: {
        decimals: vi.fn().mockRejectedValue(new Error("Contract call failed")),
        description: vi.fn(),
        latestRoundData: vi.fn(),
        phaseId: vi.fn(),
        phaseAggregators: vi.fn(),
        getRoundData: vi.fn(),
      },
      address: "0x443C5116CdF663Eb387e72C688D276e702135C87",
      abi: [],
    } as any;

    await feed.updateMetadata();

    expect(feed.isWorking).toBe(false);
  });

  test("getCurrentPhase returns phase id", async () => {
    const { default: ChainLinkDataFeed } = await import("../ChainLinkDataFeed.js");
    const client = createMockClient();

    const feed = new ChainLinkDataFeed({
      contractAddress: "0x443C5116CdF663Eb387e72C688D276e702135C87",
      viemClient: client,
    });

    feed.contract = {
      read: {
        decimals: vi.fn().mockResolvedValue(8),
        description: vi.fn().mockResolvedValue("ETH / USD"),
        latestRoundData: vi.fn(),
        phaseId: vi.fn().mockResolvedValue(5n),
        phaseAggregators: vi.fn(),
        getRoundData: vi.fn(),
      },
      address: "0x443C5116CdF663Eb387e72C688D276e702135C87",
      abi: [],
    } as any;

    const phase = await feed.getCurrentPhase();
    expect(phase).toBe(5n);
  });

  test("getPhaseAggregator returns aggregator address", async () => {
    const { default: ChainLinkDataFeed } = await import("../ChainLinkDataFeed.js");
    const client = createMockClient();
    const aggregatorAddr = "0x1234567890123456789012345678901234567890";

    const feed = new ChainLinkDataFeed({
      contractAddress: "0x443C5116CdF663Eb387e72C688D276e702135C87",
      viemClient: client,
    });

    feed.contract = {
      read: {
        decimals: vi.fn().mockResolvedValue(8),
        description: vi.fn().mockResolvedValue("ETH / USD"),
        latestRoundData: vi.fn(),
        phaseId: vi.fn().mockResolvedValue(5n),
        phaseAggregators: vi.fn().mockResolvedValue(aggregatorAddr),
        getRoundData: vi.fn(),
      },
      address: "0x443C5116CdF663Eb387e72C688D276e702135C87",
      abi: [],
    } as any;

    const aggregator = await feed.getPhaseAggregator();
    expect(aggregator).toBe(aggregatorAddr);
  });

  test("metadata is only fetched once", async () => {
    const { default: ChainLinkDataFeed } = await import("../ChainLinkDataFeed.js");
    const client = createMockClient();

    const feed = new ChainLinkDataFeed({
      contractAddress: "0x443C5116CdF663Eb387e72C688D276e702135C87",
      viemClient: client,
    });

    const decimalsMock = vi.fn().mockResolvedValue(8);
    const descriptionMock = vi.fn().mockResolvedValue("ETH / USD");

    feed.contract = {
      read: {
        decimals: decimalsMock,
        description: descriptionMock,
        latestRoundData: vi.fn().mockResolvedValue(mockLatestRoundData),
        phaseId: vi.fn(),
        phaseAggregators: vi.fn(),
        getRoundData: vi.fn(),
      },
      address: "0x443C5116CdF663Eb387e72C688D276e702135C87",
      abi: [],
    } as any;

    // Call getLatestRoundData twice
    await feed.getLatestRoundData(true);
    await feed.getLatestRoundData(true);

    // Metadata should only be fetched once
    expect(decimalsMock).toHaveBeenCalledTimes(1);
    expect(descriptionMock).toHaveBeenCalledTimes(1);
  });
});

// ─── Index exports ───────────────────────────────────────────────────────────

describe("index exports", () => {
  test("exports all expected symbols", async () => {
    const index = await import("../index.js");

    expect(index.ChainLinkDataFeed).toBeDefined();
    expect(index.subscribeToChainLinkPriceUpdate).toBeDefined();
    expect(index.subscribeToChainLinkPriceUpdates).toBeDefined();
    expect(index.useDataFeed).toBeDefined();
    expect(index.useWebsocketOrHttpTransport).toBeDefined();

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
