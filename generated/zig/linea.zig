//! Chainlink price feed contract addresses.

pub const AAVE_USD = "0x09B0a8AFD9185500d7C64FC68338b4C50db6df1d";
pub const ARB_USD = "0x28606F10277Cc2e99e57ae2C55D26860E13A1BBD";
pub const BTC_USD = "0x7A99092816C8BD5ec8ba229e3a6E6Da1E628E1F9";
pub const DAI_USD = "0x5133D67c38AFbdd02997c14Abd8d83676B4e309A";
pub const ETH_USD = "0x3c6Cd9Cc7c7a4c2Cf5a82734CD249D7D593354dA";
pub const EUR_USD = "0x637cf12017219Dd3A758818eD63185f7acF7D935";
pub const LINK_ETH = "0xc4194f19E3a0836F6B998394445C6535c50604Ce";
pub const LINK_USD = "0x8dF01C2eFed1404872b54a69f40a57FeC1545998";
pub const MATIC_USD = "0x9ce4473B42a639d010eD741df3CA829E6e480803";
pub const USDC_USD = "0xAADAa473C1bDF7317ec07c915680Af29DeBfdCb5";
pub const USDT_USD = "0xefCA2bbe0EdD0E22b2e0d2F8248E99F4bEf4A7dB";
pub const WSTETH_USD = "0x8eCE1AbA32716FdDe8D6482bfd88E9a0ee01f565";

pub const Feed = struct {
    name: []const u8,
    address: []const u8,
};

pub const feeds = [_]Feed{
    .{ .name = "AAVE / USD", .address = "0x09B0a8AFD9185500d7C64FC68338b4C50db6df1d" },
    .{ .name = "ARB / USD", .address = "0x28606F10277Cc2e99e57ae2C55D26860E13A1BBD" },
    .{ .name = "BTC / USD", .address = "0x7A99092816C8BD5ec8ba229e3a6E6Da1E628E1F9" },
    .{ .name = "DAI / USD", .address = "0x5133D67c38AFbdd02997c14Abd8d83676B4e309A" },
    .{ .name = "ETH / USD", .address = "0x3c6Cd9Cc7c7a4c2Cf5a82734CD249D7D593354dA" },
    .{ .name = "EUR / USD", .address = "0x637cf12017219Dd3A758818eD63185f7acF7D935" },
    .{ .name = "LINK / ETH", .address = "0xc4194f19E3a0836F6B998394445C6535c50604Ce" },
    .{ .name = "LINK / USD", .address = "0x8dF01C2eFed1404872b54a69f40a57FeC1545998" },
    .{ .name = "MATIC / USD", .address = "0x9ce4473B42a639d010eD741df3CA829E6e480803" },
    .{ .name = "USDC / USD", .address = "0xAADAa473C1bDF7317ec07c915680Af29DeBfdCb5" },
    .{ .name = "USDT / USD", .address = "0xefCA2bbe0EdD0E22b2e0d2F8248E99F4bEf4A7dB" },
    .{ .name = "WSTETH / USD", .address = "0x8eCE1AbA32716FdDe8D6482bfd88E9a0ee01f565" },
};
