const std = @import("std");

pub fn build(b: *std.Build) void {
    const target = b.standardTargetOptions(.{});
    const optimize = b.standardOptimizeOption(.{});

    _ = b.addModule("gud-price", .{
        .root_source_file = b.path("ethereum.zig"),
    });

    // Tests for rpc.zig (pure-logic unit tests, no network required)
    const rpc_tests = b.addTest(.{
        .root_source_file = b.path("rpc.zig"),
        .target = target,
        .optimize = optimize,
    });

    const run_rpc_tests = b.addRunArtifact(rpc_tests);

    const test_step = b.step("test", "Run rpc.zig unit tests");
    test_step.dependOn(&run_rpc_tests.step);

    // Live RPC integration test — hits real endpoints, run with `zig build live`
    const live_exe = b.addExecutable(.{
        .name = "live-test",
        .root_source_file = b.path("live_test.zig"),
        .target = target,
        .optimize = optimize,
    });

    const run_live = b.addRunArtifact(live_exe);
    const live_step = b.step("live", "Run live RPC integration tests");
    live_step.dependOn(&run_live.step);
}
