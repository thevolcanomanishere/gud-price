const std = @import("std");

pub fn build(b: *std.Build) void {
    const target = b.standardTargetOptions(.{});
    const optimize = b.standardOptimizeOption(.{});

    _ = b.addModule(.{
        .name = "gud-price",
        .root_source_file = b.path("ethereum.zig"),
        .target = target,
        .optimize = optimize,
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
}
