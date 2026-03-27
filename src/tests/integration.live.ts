import { describe, expect, test } from "vitest";
import {
  readLatestPrice,
  readLatestPriceRaw,
  readLatestPriceWithMeta,
  readFeedMetadata,
  readPhaseId,
  readAggregator,
  readPrices,
} from "../rpc.js";
import { polygonDataFeeds } from "../dataFeeds/polygon.js";
import { ethereumDataFeeds } from "../dataFeeds/ethereum.js";
import { arbitrumDataFeeds } from "../dataFeeds/arbitrum.js";
import { baseDataFeeds } from "../dataFeeds/base.js";

// ─── Polygon ─────────────────────────────────────────────────────────────────

describe("Polygon - live RPC", { timeout: 15000 }, () => {
  test("ETH / USD feed returns valid data", async () => {
    const data = await readLatestPrice(polygonDataFeeds["ETH / USD"]);
    console.log("Polygon ETH/USD:", data);

    expect(data.description).toBe("ETH / USD");
    expect(data.roundId).toBeTypeOf("bigint");
    expect(Number(data.answer)).toBeGreaterThan(0);
    expect(data.startedAt).toBeInstanceOf(Date);
  });

  test("BTC / USD feed returns valid data", async () => {
    const data = await readLatestPrice(polygonDataFeeds["BTC / USD"]);
    console.log("Polygon BTC/USD:", data);

    expect(data.description).toBe("BTC / USD");
    expect(Number(data.answer)).toBeGreaterThan(0);
  });

  test("raw data returns bigints", async () => {
    const data = await readLatestPriceRaw(polygonDataFeeds["ETH / USD"]);

    expect(data.roundId).toBeTypeOf("bigint");
    expect(data.answer).toBeTypeOf("bigint");
    expect(data.answer).toBeGreaterThan(0n);
  });

  test("metadata + separate round fetch", async () => {
    const meta = await readFeedMetadata(polygonDataFeeds["ETH / USD"]);
    expect(meta.decimals).toBe(8);
    expect(meta.description).toBe("ETH / USD");

    const data = await readLatestPriceWithMeta(
      polygonDataFeeds["ETH / USD"],
      meta,
    );
    expect(Number(data.answer)).toBeGreaterThan(0);
  });

  test("readPhaseId returns a bigint", async () => {
    const phase = await readPhaseId(polygonDataFeeds["ETH / USD"]);
    expect(phase).toBeTypeOf("bigint");
    expect(phase).toBeGreaterThan(0n);
  });

  test("readAggregator returns a valid address", async () => {
    const agg = await readAggregator(polygonDataFeeds["ETH / USD"]);
    expect(agg).toMatch(/^0x[a-fA-F0-9]{40}$/);
  });

  test("readPrices fetches multiple feeds", async () => {
    const results = await readPrices({
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

describe("Ethereum - live RPC", { timeout: 15000 }, () => {
  test("ETH / USD feed", async () => {
    const data = await readLatestPrice(ethereumDataFeeds["ETH / USD"]);
    console.log("Ethereum ETH/USD:", data);
    expect(data.description).toBe("ETH / USD");
    expect(Number(data.answer)).toBeGreaterThan(0);
  });

  test("BTC / USD feed", async () => {
    const data = await readLatestPrice(ethereumDataFeeds["BTC / USD"]);
    console.log("Ethereum BTC/USD:", data);
    expect(data.description).toBe("BTC / USD");
    expect(Number(data.answer)).toBeGreaterThan(0);
  });
});

// ─── Arbitrum ────────────────────────────────────────────────────────────────

describe("Arbitrum - live RPC", { timeout: 15000 }, () => {
  test("ETH / USD feed", async () => {
    const data = await readLatestPrice(arbitrumDataFeeds["ETH / USD"]);
    console.log("Arbitrum ETH/USD:", data);
    expect(data.description).toBe("ETH / USD");
    expect(Number(data.answer)).toBeGreaterThan(0);
  });
});

// ─── Base ────────────────────────────────────────────────────────────────────

describe("Base - live RPC", { timeout: 15000 }, () => {
  test("ETH / USD feed", async () => {
    const data = await readLatestPrice(baseDataFeeds["ETH / USD"]);
    console.log("Base ETH/USD:", data);
    expect(data.description).toBe("ETH / USD");
    expect(Number(data.answer)).toBeGreaterThan(0);
  });
});
