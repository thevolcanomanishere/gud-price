import { defineConfig } from "tsup";

export default defineConfig({
  entry: [
    "src/index.ts",
    "src/rpc.ts",
    "src/rpcs.ts",
    "src/dataFeeds/arbitrum.ts",
    "src/dataFeeds/base.ts",
    "src/dataFeeds/ethereum.ts",
    "src/dataFeeds/polygon.ts",
  ],
  splitting: true,
  sourcemap: false,
  treeshake: true,
  clean: true,
});
