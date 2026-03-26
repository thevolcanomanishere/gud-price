import { describe, expect, test } from "vitest";
import {
  ChainLinkDataFeed,
  polygonDataFeeds,
  ethereumDataFeeds,
  arbitrumDataFeeds,
  baseDataFeeds,
} from "../index.js";
import { polygon, mainnet, arbitrum, base } from "viem/chains";
import { createPublicClient, fallback, http } from "viem";

// ─── Public RPC clients ─────────────────────────────────────────────────────

const polygonClient = createPublicClient({
  transport: fallback([
    http("https://polygon-bor.publicnode.com"),
    http("https://polygon-rpc.com"),
  ]),
  chain: polygon,
  batch: { multicall: true },
});

const ethereumClient = createPublicClient({
  transport: fallback([
    http("https://ethereum-rpc.publicnode.com"),
    http("https://eth.llamarpc.com"),
  ]),
  chain: mainnet,
  batch: { multicall: true },
});

const arbitrumClient = createPublicClient({
  transport: fallback([
    http("https://arbitrum-one-rpc.publicnode.com"),
    http("https://arb1.arbitrum.io/rpc"),
  ]),
  chain: arbitrum,
  batch: { multicall: true },
});

const baseClient = createPublicClient({
  transport: fallback([
    http("https://base-rpc.publicnode.com"),
    http("https://mainnet.base.org"),
  ]),
  chain: base,
  batch: { multicall: true },
});

// ─── Polygon ─────────────────────────────────────────────────────────────────

describe("Polygon - live RPC", { timeout: 30000 }, () => {
  test("ETH / USD feed returns valid data", async () => {
    const feed = new ChainLinkDataFeed({
      contractAddress: polygonDataFeeds["ETH / USD"],
      viemClient: polygonClient,
    });

    const data = await feed.getLatestRoundData(true);
    console.log("Polygon ETH/USD:", data);

    expect(data).toBeDefined();
    expect(data.description).toBe("ETH / USD");
    expect(data.roundId).toBeTypeOf("bigint");
    expect(data.answer).toBeTypeOf("string");
    expect(Number(data.answer)).toBeGreaterThan(0);
    expect(data.time).toBeInstanceOf(Date);
  });

  test("BTC / USD feed returns valid data", async () => {
    const feed = new ChainLinkDataFeed({
      contractAddress: polygonDataFeeds["BTC / USD"],
      viemClient: polygonClient,
    });

    const data = await feed.getLatestRoundData(true);
    console.log("Polygon BTC/USD:", data);

    expect(data.description).toBe("BTC / USD");
    expect(Number(data.answer)).toBeGreaterThan(0);
  });

  test("MATIC / USD feed returns valid data", async () => {
    const feed = new ChainLinkDataFeed({
      contractAddress: polygonDataFeeds["MATIC / USD"],
      viemClient: polygonClient,
    });

    const data = await feed.getLatestRoundData(true);
    console.log("Polygon MATIC/USD:", data);

    expect(data.description).toBe("MATIC / USD");
    expect(Number(data.answer)).toBeGreaterThan(0);
  });

  test("raw (unformatted) data returns tuple", async () => {
    const feed = new ChainLinkDataFeed({
      contractAddress: polygonDataFeeds["ETH / USD"],
      viemClient: polygonClient,
    });

    const data = await feed.getLatestRoundData(false);

    expect(data).toHaveLength(5);
    expect(data[0]).toBeTypeOf("bigint"); // roundId
    expect(data[1]).toBeTypeOf("bigint"); // answer
    expect(data[1]).toBeGreaterThan(0n);
  });

  test("getCurrentPhase returns a bigint", async () => {
    const feed = new ChainLinkDataFeed({
      contractAddress: polygonDataFeeds["ETH / USD"],
      viemClient: polygonClient,
    });

    const phase = await feed.getCurrentPhase();
    console.log("Polygon ETH/USD phase:", phase);
    expect(phase).toBeTypeOf("bigint");
  });

  test("getPhaseAggregator returns a valid address", async () => {
    const feed = new ChainLinkDataFeed({
      contractAddress: polygonDataFeeds["ETH / USD"],
      viemClient: polygonClient,
    });

    const aggregator = await feed.getPhaseAggregator();
    console.log("Polygon ETH/USD aggregator:", aggregator);
    expect(aggregator).toMatch(/^0x[a-fA-F0-9]{40}$/);
  });
});

// ─── Ethereum ────────────────────────────────────────────────────────────────

describe("Ethereum - live RPC", { timeout: 30000 }, () => {
  test("ETH / USD feed returns valid data", async () => {
    const feed = new ChainLinkDataFeed({
      contractAddress: ethereumDataFeeds["ETH / USD"],
      viemClient: ethereumClient,
    });

    const data = await feed.getLatestRoundData(true);
    console.log("Ethereum ETH/USD:", data);

    expect(data.description).toBe("ETH / USD");
    expect(Number(data.answer)).toBeGreaterThan(0);
  });

  test("BTC / USD feed returns valid data", async () => {
    const feed = new ChainLinkDataFeed({
      contractAddress: ethereumDataFeeds["BTC / USD"],
      viemClient: ethereumClient,
    });

    const data = await feed.getLatestRoundData(true);
    console.log("Ethereum BTC/USD:", data);

    expect(data.description).toBe("BTC / USD");
    expect(Number(data.answer)).toBeGreaterThan(0);
  });
});

// ─── Arbitrum ────────────────────────────────────────────────────────────────

describe("Arbitrum - live RPC", { timeout: 30000 }, () => {
  test("ETH / USD feed returns valid data", async () => {
    const feed = new ChainLinkDataFeed({
      contractAddress: arbitrumDataFeeds["ETH / USD"],
      viemClient: arbitrumClient,
    });

    const data = await feed.getLatestRoundData(true);
    console.log("Arbitrum ETH/USD:", data);

    expect(data.description).toBe("ETH / USD");
    expect(Number(data.answer)).toBeGreaterThan(0);
  });
});

// ─── Base ────────────────────────────────────────────────────────────────────

describe("Base - live RPC", { timeout: 30000 }, () => {
  test("ETH / USD feed returns valid data", async () => {
    const feed = new ChainLinkDataFeed({
      contractAddress: baseDataFeeds["ETH / USD"],
      viemClient: baseClient,
    });

    const data = await feed.getLatestRoundData(true);
    console.log("Base ETH/USD:", data);

    expect(data.description).toBe("ETH / USD");
    expect(Number(data.answer)).toBeGreaterThan(0);
  });
});
