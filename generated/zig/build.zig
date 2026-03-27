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
}
