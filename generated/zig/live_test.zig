//! Live RPC integration tests — hits real endpoints. Run with `zig build live`.
//! Output format matches the CI price-extraction regex: "Chain Feed/Pair: price"

const std = @import("std");
const rpc = @import("rpc.zig");

const ETH_RPC = "https://ethereum-rpc.publicnode.com";
const POLYGON_RPC = "https://polygon-bor-rpc.publicnode.com";
const ARBITRUM_RPC = "https://arbitrum-one-rpc.publicnode.com";
const BASE_RPC = "https://base-rpc.publicnode.com";

pub fn main() !void {
    var gpa = std.heap.GeneralPurposeAllocator(.{}){};
    defer _ = gpa.deinit();
    const alloc = gpa.allocator();

    // Ethereum — single feed
    {
        const price = try rpc.readLatestPrice(alloc, "0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419", ETH_RPC);
        defer price.deinit(alloc);
        std.debug.print("Ethereum ETH/USD: {s}\n", .{price.answer});
    }

    // Ethereum — multicall batch (ETH + BTC in 1 RPC call)
    {
        const feeds = [_]rpc.Feed{
            .{ .name = "ETH / USD", .address = "0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419" },
            .{ .name = "BTC / USD", .address = "0xF4030086522a5bEEa4988F8cA5B36dbC97BeE88c" },
        };
        const prices = try rpc.readPrices(alloc, &feeds, ETH_RPC);
        defer {
            for (prices) |p| p.round.deinit(alloc);
            alloc.free(prices);
        }
        for (prices) |p| {
            std.debug.print("Ethereum {s}: {s}\n", .{ p.name, p.round.answer });
        }
    }

    // Polygon
    {
        const price = try rpc.readLatestPrice(alloc, "0xc907E116054Ad103354f2D350FD2514433D57F6f", POLYGON_RPC);
        defer price.deinit(alloc);
        std.debug.print("Polygon BTC/USD: {s}\n", .{price.answer});
    }

    // Arbitrum
    {
        const price = try rpc.readLatestPrice(alloc, "0x639Fe6ab55C921f74e7fac1ee960C0B6293ba612", ARBITRUM_RPC);
        defer price.deinit(alloc);
        std.debug.print("Arbitrum ETH/USD: {s}\n", .{price.answer});
    }

    // Base
    {
        const price = try rpc.readLatestPrice(alloc, "0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70", BASE_RPC);
        defer price.deinit(alloc);
        std.debug.print("Base ETH/USD: {s}\n", .{price.answer});
    }
}
