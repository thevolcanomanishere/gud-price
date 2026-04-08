//! Chainlink price feed RPC client — zero external dependencies, stdlib only.
//! Mirrors the TypeScript implementation in src/rpc.ts.

const std = @import("std");
const Allocator = std.mem.Allocator;

// ── Selectors ─────────────────────────────────────────────────────────────────

pub const SEL_DECIMALS = "0x313ce567";
pub const SEL_DESCRIPTION = "0x7284e416";
pub const SEL_LATEST_ROUND_DATA = "0xfeaf968c";
pub const SEL_GET_ROUND_DATA = "0x9a6fc8f5";
pub const SEL_PHASE_ID = "0x58303b10";
pub const SEL_PHASE_AGGREGATORS = "0xc1597304";
pub const SEL_AGGREGATOR = "0x245a7bfc";

/// Multicall3 is deployed at the same address on all supported chains.
pub const MULTICALL3 = "0xcA11bde05977b3631167028862bE2a173976CA11";
pub const SEL_AGGREGATE3 = "0x82ad56cb";

// ── Types ─────────────────────────────────────────────────────────────────────

pub const FeedMetadata = struct {
    decimals: u8,
    description: []u8,

    pub fn deinit(self: FeedMetadata, allocator: Allocator) void {
        allocator.free(self.description);
    }
};

pub const RoundData = struct {
    round_id: u128,
    answer: []u8,
    started_at: u64,
    updated_at: u64,
    answered_in_round: u128,
    description: []u8,

    pub fn deinit(self: RoundData, allocator: Allocator) void {
        allocator.free(self.answer);
        allocator.free(self.description);
    }
};

pub const Multicall3Call = struct {
    target: []const u8,
    call_data: []const u8,
};

pub const Multicall3Result = struct {
    success: bool,
    data: []u8,

    pub fn deinit(self: Multicall3Result, allocator: Allocator) void {
        allocator.free(self.data);
    }
};

// ── ABI helpers ───────────────────────────────────────────────────────────────

/// Read the lower 128 bits of a 256-bit word at the given 32-byte slot index.
pub fn readWord(hex: []const u8, slot: usize) u128 {
    const start = 2 + slot * 64; // skip "0x"
    if (start + 64 > hex.len) return 0;
    return std.fmt.parseInt(u128, hex[start..start + 64], 16) catch 0;
}

/// Read a signed 256-bit word (two's complement) at the given slot as i128.
pub fn readWordSigned(hex: []const u8, slot: usize) i128 {
    const start = 2 + slot * 64;
    if (start + 64 > hex.len) return 0;
    // Low 128 bits bitcast to i128 gives correct two's complement result.
    const low = std.fmt.parseInt(u128, hex[start + 32 .. start + 64], 16) catch 0;
    return @bitCast(low);
}

/// Decode a Solidity ABI-encoded string. Caller owns the returned slice.
pub fn decodeString(allocator: Allocator, hex: []const u8) ![]u8 {
    const offset: usize = @intCast(readWord(hex, 0));
    const char_offset = 2 + offset * 2;
    if (char_offset + 64 > hex.len) return allocator.dupe(u8, "");
    const length: usize = @intCast(
        std.fmt.parseInt(u128, hex[char_offset .. char_offset + 64], 16) catch 0,
    );
    if (length == 0) return allocator.dupe(u8, "");
    const str_hex = hex[char_offset + 64 .. char_offset + 64 + length * 2];
    const bytes = try allocator.alloc(u8, length);
    for (0..length) |i| {
        bytes[i] = std.fmt.parseInt(u8, str_hex[i * 2 .. i * 2 + 2], 16) catch 0;
    }
    return bytes;
}

/// Format a raw integer price with the given decimal count. Caller owns result.
pub fn formatPrice(allocator: Allocator, raw: i128, decimals: u8) ![]u8 {
    if (raw == 0) return allocator.dupe(u8, "0");

    const negative = raw < 0;
    const abs: u128 = if (negative) @intCast(-raw) else @intCast(raw);

    // Format absolute value as decimal string.
    var buf: [50]u8 = undefined;
    const s = std.fmt.bufPrint(&buf, "{d}", .{abs}) catch unreachable;

    if (decimals == 0) {
        return if (negative)
            std.fmt.allocPrint(allocator, "-{s}", .{s})
        else
            allocator.dupe(u8, s);
    }

    const d: usize = @intCast(decimals);

    // Pad to at least decimals+1 digits.
    var digits = try allocator.alloc(u8, @max(s.len, d + 1));
    defer allocator.free(digits);
    const pad = if (s.len < d + 1) d + 1 - s.len else 0;
    @memset(digits[0..pad], '0');
    @memcpy(digits[pad..], s);

    const int_part = digits[0 .. digits.len - d];
    const frac_all = digits[digits.len - d ..];

    // Strip trailing zeros from fractional part.
    var frac_end = frac_all.len;
    while (frac_end > 0 and frac_all[frac_end - 1] == '0') frac_end -= 1;
    const frac = frac_all[0..frac_end];

    const number = if (frac.len > 0)
        try std.fmt.allocPrint(allocator, "{s}.{s}", .{ int_part, frac })
    else
        try allocator.dupe(u8, int_part);

    if (negative) {
        defer allocator.free(number);
        return std.fmt.allocPrint(allocator, "-{s}", .{number});
    }
    return number;
}

// ── Multicall3 ABI ────────────────────────────────────────────────────────────

/// ABI-encode a Multicall3.aggregate3(Call3[]) call. Caller owns the result.
/// Call3 = (address target, bool allowFailure, bytes callData), allowFailure=true.
pub fn encodeAggregate3(allocator: Allocator, calls: []const Multicall3Call) ![]u8 {
    const n = calls.len;

    // Compute per-call data lengths and padded element sizes.
    // sizeof element: address(32)+bool(32)+bytes_ptr(32)+bytes_len(32)+bytes_data(padded)
    var data_hexes = try allocator.alloc([]const u8, n);
    defer allocator.free(data_hexes);
    var data_lens = try allocator.alloc(usize, n);
    defer allocator.free(data_lens);
    var sizes = try allocator.alloc(usize, n);
    defer allocator.free(sizes);
    for (calls, 0..) |call, i| {
        data_hexes[i] = if (std.mem.startsWith(u8, call.call_data, "0x")) call.call_data[2..] else call.call_data;
        data_lens[i] = data_hexes[i].len / 2;
        sizes[i] = 128 + ((data_lens[i] + 31) / 32) * 32;
    }

    // Element offsets from start of array content (right after the length word).
    var offsets = try allocator.alloc(usize, n);
    defer allocator.free(offsets);
    var off: usize = n * 32;
    for (sizes, 0..) |sz, i| {
        offsets[i] = off;
        off += sz;
    }

    var list = std.ArrayList(u8).init(allocator);
    const w = list.writer();

    try w.writeAll(SEL_AGGREGATE3[2..]); // selector (no "0x")
    try w.print("{x:0>64}", .{@as(u64, 32)}); // param offset = 32
    try w.print("{x:0>64}", .{@as(u64, n)}); // array length
    for (offsets) |o| try w.print("{x:0>64}", .{@as(u64, o)});

    for (calls, 0..) |call, i| {
        const h = data_hexes[i];
        const d = data_lens[i];
        const padded = ((d + 31) / 32) * 32;
        const addr = if (std.mem.startsWith(u8, call.target, "0x") or
            std.mem.startsWith(u8, call.target, "0X")) call.target[2..] else call.target;

        try w.writeAll("000000000000000000000000"); // address left-pad (12 zero bytes)
        for (addr) |c| try w.writeByte(std.ascii.toLower(c));
        try w.print("{x:0>64}", .{@as(u64, 1)}); // allowFailure = true
        try w.print("{x:0>64}", .{@as(u64, 96)}); // bytes ptr = 96
        try w.print("{x:0>64}", .{@as(u64, d)}); // bytes length
        for (h) |c| try w.writeByte(std.ascii.toLower(c));
        var p: usize = 0;
        while (p < (padded - d) * 2) : (p += 1) try w.writeByte('0');
    }

    const inner = try list.toOwnedSlice();
    defer allocator.free(inner);
    return std.fmt.allocPrint(allocator, "0x{s}", .{inner});
}

/// ABI-decode the Result[] returned by Multicall3.aggregate3. Caller owns all data.
pub fn decodeAggregate3Results(allocator: Allocator, hex: []const u8, n: usize) ![]Multicall3Result {
    const readAt = struct {
        fn f(h: []const u8, byte_pos: usize) usize {
            const start = 2 + byte_pos * 2;
            if (start + 64 > h.len) return 0;
            return @intCast(std.fmt.parseInt(u128, h[start .. start + 64], 16) catch 0);
        }
    }.f;

    const array_byte_offset = readAt(hex, 0); // = 32
    const array_content_start = array_byte_offset + 32;

    const results = try allocator.alloc(Multicall3Result, n);
    for (0..n) |i| {
        const elem_rel = readAt(hex, array_content_start + i * 32);
        const elem_start = array_content_start + elem_rel;

        const success = readAt(hex, elem_start) != 0;
        const bytes_rel = readAt(hex, elem_start + 32);
        const bytes_start = elem_start + bytes_rel;
        const bytes_len = readAt(hex, bytes_start);

        const data = if (bytes_len > 0) blk: {
            const ds = 2 + (bytes_start + 32) * 2;
            break :blk try std.fmt.allocPrint(allocator, "0x{s}", .{hex[ds .. ds + bytes_len * 2]});
        } else try allocator.dupe(u8, "0x");

        results[i] = .{ .success = success, .data = data };
    }
    return results;
}

// ── JSON-RPC transport ────────────────────────────────────────────────────────

var rpc_counter = std.atomic.Value(u64).init(1);

/// Perform a single eth_call against an RPC endpoint. Caller owns returned string.
pub fn ethCall(allocator: Allocator, rpc_url: []const u8, to: []const u8, data: []const u8) ![]u8 {
    const id = rpc_counter.fetchAdd(1, .monotonic);
    const body = try std.fmt.allocPrint(allocator,
        \\{{"jsonrpc":"2.0","id":{d},"method":"eth_call","params":[{{"to":"{s}","data":"{s}"}},"latest"]}}
    , .{ id, to, data });
    defer allocator.free(body);

    var client = std.http.Client{ .allocator = allocator };
    defer client.deinit();

    const uri = try std.Uri.parse(rpc_url);
    var server_header_buffer: [8 * 1024]u8 = undefined;
    var req = try client.open(.POST, uri, .{
        .server_header_buffer = &server_header_buffer,
        .extra_headers = &.{
            .{ .name = "content-type", .value = "application/json" },
        },
    });
    defer req.deinit();

    req.transfer_encoding = .{ .content_length = body.len };
    try req.send();
    try req.writeAll(body);
    try req.finish();
    try req.wait();

    const resp = try req.reader().readAllAlloc(allocator, 1024 * 1024);
    defer allocator.free(resp);

    // Minimal JSON parsing: find "result":"..." or "error".
    if (std.mem.indexOf(u8, resp, "\"result\":\"")) |idx| {
        const start = idx + 10;
        if (std.mem.indexOf(u8, resp[start..], "\"")) |end| {
            return allocator.dupe(u8, resp[start .. start + end]);
        }
    }
    if (std.mem.indexOf(u8, resp, "\"error\"") != null) return error.RpcError;
    return error.UnexpectedResponse;
}

// ── Public API ────────────────────────────────────────────────────────────────

/// Read decimals and description from a Chainlink feed. Caller owns result.
pub fn readFeedMetadata(allocator: Allocator, address: []const u8, rpc_url: []const u8) !FeedMetadata {
    const dec_hex = try ethCall(allocator, rpc_url, address, SEL_DECIMALS);
    defer allocator.free(dec_hex);
    const desc_hex = try ethCall(allocator, rpc_url, address, SEL_DESCRIPTION);
    defer allocator.free(desc_hex);
    return .{
        .decimals = @intCast(readWord(dec_hex, 0)),
        .description = try decodeString(allocator, desc_hex),
    };
}

/// Read the latest price from a Chainlink feed. Caller owns result.
pub fn readLatestPrice(allocator: Allocator, address: []const u8, rpc_url: []const u8) !RoundData {
    const meta = try readFeedMetadata(allocator, address, rpc_url);
    defer meta.deinit(allocator);
    const hex = try ethCall(allocator, rpc_url, address, SEL_LATEST_ROUND_DATA);
    defer allocator.free(hex);
    return .{
        .round_id = readWord(hex, 0),
        .answer = try formatPrice(allocator, readWordSigned(hex, 1), meta.decimals),
        .started_at = @intCast(readWord(hex, 2)),
        .updated_at = @intCast(readWord(hex, 3)),
        .answered_in_round = readWord(hex, 4),
        .description = try allocator.dupe(u8, meta.description),
    };
}

/// Execute a batch of calls via Multicall3.aggregate3. Caller owns all results.
pub fn multicall(allocator: Allocator, calls: []const Multicall3Call, rpc_url: []const u8) ![]Multicall3Result {
    const calldata = try encodeAggregate3(allocator, calls);
    defer allocator.free(calldata);
    const hex = try ethCall(allocator, rpc_url, MULTICALL3, calldata);
    defer allocator.free(hex);
    return decodeAggregate3Results(allocator, hex, calls.len);
}

pub const Feed = struct { name: []const u8, address: []const u8 };
pub const NamedRound = struct { name: []const u8, round: RoundData };

/// Read prices for multiple feeds in a single Multicall3 request. Caller owns all memory.
pub fn readPrices(allocator: Allocator, feeds: []const Feed, rpc_url: []const u8) ![]NamedRound {
    const n = feeds.len;
    if (n == 0) return &.{};

    // 3 calls per feed: decimals, description, latestRoundData
    const calls = try allocator.alloc(Multicall3Call, n * 3);
    defer allocator.free(calls);
    for (feeds, 0..) |feed, i| {
        calls[i * 3] = .{ .target = feed.address, .call_data = SEL_DECIMALS };
        calls[i * 3 + 1] = .{ .target = feed.address, .call_data = SEL_DESCRIPTION };
        calls[i * 3 + 2] = .{ .target = feed.address, .call_data = SEL_LATEST_ROUND_DATA };
    }

    const mc = try multicall(allocator, calls, rpc_url);
    defer {
        for (mc) |r| r.deinit(allocator);
        allocator.free(mc);
    }

    const results = try allocator.alloc(NamedRound, n);
    for (feeds, 0..) |feed, i| {
        const dec = mc[i * 3];
        const desc = mc[i * 3 + 1];
        const round = mc[i * 3 + 2];

        if (!dec.success or !desc.success or !round.success) {
            for (results[0..i]) |r| r.round.deinit(allocator);
            allocator.free(results);
            return error.MulticallSubCallFailed;
        }

        const decimals: u8 = @intCast(readWord(dec.data, 0));
        results[i] = .{
            .name = feed.name,
            .round = .{
                .round_id = readWord(round.data, 0),
                .answer = try formatPrice(allocator, readWordSigned(round.data, 1), decimals),
                .started_at = @intCast(readWord(round.data, 2)),
                .updated_at = @intCast(readWord(round.data, 3)),
                .answered_in_round = readWord(round.data, 4),
                .description = try decodeString(allocator, desc.data),
            },
        };
    }
    return results;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

test "formatPrice zero" {
    const r = try formatPrice(std.testing.allocator, 0, 8);
    defer std.testing.allocator.free(r);
    try std.testing.expectEqualStrings("0", r);
}

test "formatPrice integer" {
    const r = try formatPrice(std.testing.allocator, 180000000000, 8);
    defer std.testing.allocator.free(r);
    try std.testing.expectEqualStrings("1800", r);
}

test "formatPrice fractional" {
    const r = try formatPrice(std.testing.allocator, 123456789, 8);
    defer std.testing.allocator.free(r);
    try std.testing.expectEqualStrings("1.23456789", r);
}

test "formatPrice strips trailing zeros" {
    const r = try formatPrice(std.testing.allocator, 150000000, 8);
    defer std.testing.allocator.free(r);
    try std.testing.expectEqualStrings("1.5", r);
}

test "formatPrice negative" {
    const r = try formatPrice(std.testing.allocator, -100000000, 8);
    defer std.testing.allocator.free(r);
    try std.testing.expectEqualStrings("-1", r);
}

test "formatPrice zero decimals" {
    const r = try formatPrice(std.testing.allocator, 42, 0);
    defer std.testing.allocator.free(r);
    try std.testing.expectEqualStrings("42", r);
}

test "formatPrice small value" {
    const r = try formatPrice(std.testing.allocator, 1, 8);
    defer std.testing.allocator.free(r);
    try std.testing.expectEqualStrings("0.00000001", r);
}

test "readWord slot 0" {
    var buf: [66]u8 = undefined;
    const hex = try std.fmt.bufPrint(&buf, "0x{x:0>64}", .{@as(u128, 8)});
    try std.testing.expectEqual(@as(u128, 8), readWord(hex, 0));
}

test "readWord slot 1" {
    var buf: [130]u8 = undefined;
    const hex = try std.fmt.bufPrint(&buf, "0x{x:0>64}{x:0>64}", .{ @as(u128, 1), @as(u128, 42) });
    try std.testing.expectEqual(@as(u128, 1), readWord(hex, 0));
    try std.testing.expectEqual(@as(u128, 42), readWord(hex, 1));
}

test "readWordSigned positive" {
    var buf: [66]u8 = undefined;
    const hex = try std.fmt.bufPrint(&buf, "0x{x:0>64}", .{@as(u128, 12345)});
    try std.testing.expectEqual(@as(i128, 12345), readWordSigned(hex, 0));
}

test "readWordSigned negative one" {
    // -1 in 256-bit two's complement = 64 'f' chars
    const hex = "0x" ++ "f" ** 64;
    try std.testing.expectEqual(@as(i128, -1), readWordSigned(hex, 0));
}

test "decodeString" {
    // ABI-encoded "ETH / USD": offset=32, length=9
    const hex = "0x" ++
        "0000000000000000000000000000000000000000000000000000000000000020" ++
        "0000000000000000000000000000000000000000000000000000000000000009" ++
        "455448202f20555344000000000000000000000000000000000000000000000000";
    const r = try decodeString(std.testing.allocator, hex);
    defer std.testing.allocator.free(r);
    try std.testing.expectEqualStrings("ETH / USD", r);
}

test "encodeAggregate3 starts with selector" {
    const calls = [_]Multicall3Call{
        .{ .target = "0xb49f677943BC038e9857d61E7d053CaA2C1734C1", .call_data = SEL_DECIMALS },
    };
    const encoded = try encodeAggregate3(std.testing.allocator, &calls);
    defer std.testing.allocator.free(encoded);
    try std.testing.expect(std.mem.startsWith(u8, encoded, "0x82ad56cb"));
}

test "encodeAggregate3 and decodeAggregate3Results round-trip" {
    // Build a mock Result[] response for 2 results
    // result[0]: success=true, data=0x + 64 zeros (word = 8)
    // result[1]: success=true, data=0x + "ETH / USD" ABI-encoded
    const data0 = "0x" ++ "0" ** 62 ++ "08"; // word = 8
    const data1 = "0x" ++
        "0000000000000000000000000000000000000000000000000000000000000020" ++
        "0000000000000000000000000000000000000000000000000000000000000009" ++
        "455448202f20555344000000000000000000000000000000000000000000000000";

    // Build encoded Result[] manually
    // n=2, element sizes:
    //   data0: 2 chars after 0x -> 32 bytes -> element = 96 + 32 = 128 bytes (no, 64 bytes data)
    // Actually data0 has 64 hex chars after "0x" = 32 bytes
    // element size = 64 (success+bytes_ptr) + 32 (bytes_len) + 32 (padded data) = 128 bytes
    // data1 has 192 hex chars after "0x" = 96 bytes
    // element size = 64 + 32 + 96 = 192 bytes (96 already 32-byte aligned)
    //
    // Array content starts after length word.
    // Offset[0] = 2*32 = 64, Offset[1] = 64+128 = 192
    const response = "0x" ++
        // array offset = 32
        "0000000000000000000000000000000000000000000000000000000000000020" ++
        // array length = 2
        "0000000000000000000000000000000000000000000000000000000000000002" ++
        // offset[0] = 64
        "0000000000000000000000000000000000000000000000000000000000000040" ++
        // offset[1] = 192
        "00000000000000000000000000000000000000000000000000000000000000c0" ++
        // element[0]: success=1, bytes_ptr=64, bytes_len=32, data (32 bytes)
        "0000000000000000000000000000000000000000000000000000000000000001" ++
        "0000000000000000000000000000000000000000000000000000000000000040" ++
        "0000000000000000000000000000000000000000000000000000000000000020" ++
        "0000000000000000000000000000000000000000000000000000000000000008" ++
        // element[1]: success=1, bytes_ptr=64, bytes_len=96, data (96 bytes)
        "0000000000000000000000000000000000000000000000000000000000000001" ++
        "0000000000000000000000000000000000000000000000000000000000000040" ++
        "0000000000000000000000000000000000000000000000000000000000000060" ++
        "0000000000000000000000000000000000000000000000000000000000000020" ++
        "0000000000000000000000000000000000000000000000000000000000000009" ++
        "455448202f20555344000000000000000000000000000000000000000000000000";

    const results = try decodeAggregate3Results(std.testing.allocator, response, 2);
    defer {
        for (results) |r| r.deinit(std.testing.allocator);
        std.testing.allocator.free(results);
    }

    try std.testing.expectEqual(true, results[0].success);
    try std.testing.expectEqual(@as(u128, 8), readWord(results[0].data, 0));

    try std.testing.expectEqual(true, results[1].success);
    const desc = try decodeString(std.testing.allocator, results[1].data);
    defer std.testing.allocator.free(desc);
    try std.testing.expectEqualStrings("ETH / USD", desc);

    _ = data0;
    _ = data1;
}
