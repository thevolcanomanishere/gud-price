import { describe, expect, test } from "vitest";
import {
  getLatestRoundData,
  getLatestRoundDataRaw,
  getLatestRoundDataWithMeta,
  getFeedMetadata,
  getPhaseId,
  getAggregator,
  getMultipleFeedPrices,
} from "../rpc.js";
import { polygonDataFeeds } from "../dataFeeds/polygon.js";
import { ethereumDataFeeds } from "../dataFeeds/ethereum.js";
import { arbitrumDataFeeds } from "../dataFeeds/arbitrum.js";
import { baseDataFeeds } from "../dataFeeds/base.js";

// ─── Public RPCs ─────────────────────────────────────────────────────────────

const POLYGON_RPC = "https://polygon-bor.publicnode.com";
const ETHEREUM_RPC = "https://ethereum-rpc.publicnode.com";
const ARBITRUM_RPC = "https://arbitrum-one-rpc.publicnode.com";
const BASE_RPC = "https://base-rpc.publicnode.com";

// ─── Polygon ─────────────────────────────────────────────────────────────────

describe("Polygon - live RPC", { timeout: 30000 }, () => {
  test("ETH / USD feed returns valid data", async () => {
    const data = await getLatestRoundData(POLYGON_RPC, polygonDataFeeds["ETH / USD"]);
    console.log("Polygon ETH/USD:", data);

    expect(data.description).toBe("ETH / USD");
    expect(data.roundId).toBeTypeOf("bigint");
    expect(Number(data.answer)).toBeGreaterThan(0);
    expect(data.startedAt).toBeInstanceOf(Date);
  });

  test("BTC / USD feed returns valid data", async () => {
    const data = await getLatestRoundData(POLYGON_RPC, polygonDataFeeds["BTC / USD"]);
    console.log("Polygon BTC/USD:", data);

    expect(data.description).toBe("BTC / USD");
    expect(Number(data.answer)).toBeGreaterThan(0);
  });

  test("raw data returns bigints", async () => {
    const data = await getLatestRoundDataRaw(POLYGON_RPC, polygonDataFeeds["ETH / USD"]);

    expect(data.roundId).toBeTypeOf("bigint");
    expect(data.answer).toBeTypeOf("bigint");
    expect(data.answer).toBeGreaterThan(0n);
  });

  test("metadata + separate round fetch", async () => {
    const meta = await getFeedMetadata(POLYGON_RPC, polygonDataFeeds["ETH / USD"]);
    expect(meta.decimals).toBe(8);
    expect(meta.description).toBe("ETH / USD");

    const data = await getLatestRoundDataWithMeta(POLYGON_RPC, polygonDataFeeds["ETH / USD"], meta);
    expect(Number(data.answer)).toBeGreaterThan(0);
  });

  test("getPhaseId returns a bigint", async () => {
    const phase = await getPhaseId(POLYGON_RPC, polygonDataFeeds["ETH / USD"]);
    expect(phase).toBeTypeOf("bigint");
    expect(phase).toBeGreaterThan(0n);
  });

  test("getAggregator returns a valid address", async () => {
    const agg = await getAggregator(POLYGON_RPC, polygonDataFeeds["ETH / USD"]);
    expect(agg).toMatch(/^0x[a-fA-F0-9]{40}$/);
  });

  test("getMultipleFeedPrices fetches multiple feeds", async () => {
    const results = await getMultipleFeedPrices(POLYGON_RPC, {
      "ETH / USD": polygonDataFeeds["ETH / USD"],
      "BTC / USD": polygonDataFeeds["BTC / USD"],
    });

    expect(results["ETH / USD"].description).toBe("ETH / USD");
    expect(results["BTC / USD"].description).toBe("BTC / USD");
    expect(Number(results["ETH / USD"].answer)).toBeGreaterThan(0);
    expect(Number(results["BTC / USD"].answer)).toBeGreaterThan(0);
  });
});

// ─── Ethereum ────────────────────────────────────────────────────────────────

describe("Ethereum - live RPC", { timeout: 30000 }, () => {
  test("ETH / USD feed", async () => {
    const data = await getLatestRoundData(ETHEREUM_RPC, ethereumDataFeeds["ETH / USD"]);
    console.log("Ethereum ETH/USD:", data);
    expect(data.description).toBe("ETH / USD");
    expect(Number(data.answer)).toBeGreaterThan(0);
  });

  test("BTC / USD feed", async () => {
    const data = await getLatestRoundData(ETHEREUM_RPC, ethereumDataFeeds["BTC / USD"]);
    console.log("Ethereum BTC/USD:", data);
    expect(data.description).toBe("BTC / USD");
    expect(Number(data.answer)).toBeGreaterThan(0);
  });
});

// ─── Arbitrum ────────────────────────────────────────────────────────────────

describe("Arbitrum - live RPC", { timeout: 30000 }, () => {
  test("ETH / USD feed", async () => {
    const data = await getLatestRoundData(ARBITRUM_RPC, arbitrumDataFeeds["ETH / USD"]);
    console.log("Arbitrum ETH/USD:", data);
    expect(data.description).toBe("ETH / USD");
    expect(Number(data.answer)).toBeGreaterThan(0);
  });
});

// ─── Base ────────────────────────────────────────────────────────────────────

describe("Base - live RPC", { timeout: 30000 }, () => {
  test("ETH / USD feed", async () => {
    const data = await getLatestRoundData(BASE_RPC, baseDataFeeds["ETH / USD"]);
    console.log("Base ETH/USD:", data);
    expect(data.description).toBe("ETH / USD");
    expect(Number(data.answer)).toBeGreaterThan(0);
  });
});
