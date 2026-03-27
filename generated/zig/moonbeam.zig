//! Chainlink price feed contract addresses.

pub const ATOM_USD = "0x4F152D143c97B5e8d2293bc5B2380600f274a5dd";
pub const BNB_USD = "0x0147f2Ad7F1e2Bc51F998CC128a8355d5AE8C32D";
pub const BRL_USD = "0x6e9bC5f60c597aa4063640a4F426c29c23bc7034";
pub const BTC_USD = "0x8c4425e141979c66423A83bE2ee59135864487Eb";
pub const CAKE_USD = "0x6dD5ccbDBbb77a4827209104615db2333304F008";
pub const DAI_USD = "0x6063e1037B1afDA2bE5A3340757261E4d6a402ac";
pub const DOT_USD = "0x1466b4bD0C4B6B8e1164991909961e0EE6a66d8c";
pub const ETH_USD = "0x9ce2388a1696e22F870341C3FC1E89710C7569B5";
pub const FRAX_USD = "0x05Ec3Fb5B7CB3bE9D7150FBA1Fb0749407e5Aa8a";
pub const GLMR_USD = "0x4497B606be93e773bbA5eaCFCb2ac5E2214220Eb";
pub const LINK_USD = "0xd61D7398B7734aBe7C4B143fE57dC666D2fe83aD";
pub const USDC_USD = "0xA122591F60115D63421f66F752EF9f6e0bc73abC";
pub const USDT_USD = "0xD925C5BF88Bd0ca09312625d429240F811b437c6";
pub const WBTC_USD = "0x8211B991d713ddAE32326Fd69E1E2510F4a653B0";

pub const Feed = struct {
    name: []const u8,
    address: []const u8,
};

pub const feeds = [_]Feed{
    .{ .name = "ATOM / USD", .address = "0x4F152D143c97B5e8d2293bc5B2380600f274a5dd" },
    .{ .name = "BNB / USD", .address = "0x0147f2Ad7F1e2Bc51F998CC128a8355d5AE8C32D" },
    .{ .name = "BRL / USD", .address = "0x6e9bC5f60c597aa4063640a4F426c29c23bc7034" },
    .{ .name = "BTC / USD", .address = "0x8c4425e141979c66423A83bE2ee59135864487Eb" },
    .{ .name = "CAKE / USD", .address = "0x6dD5ccbDBbb77a4827209104615db2333304F008" },
    .{ .name = "DAI / USD", .address = "0x6063e1037B1afDA2bE5A3340757261E4d6a402ac" },
    .{ .name = "DOT / USD", .address = "0x1466b4bD0C4B6B8e1164991909961e0EE6a66d8c" },
    .{ .name = "ETH / USD", .address = "0x9ce2388a1696e22F870341C3FC1E89710C7569B5" },
    .{ .name = "FRAX / USD", .address = "0x05Ec3Fb5B7CB3bE9D7150FBA1Fb0749407e5Aa8a" },
    .{ .name = "GLMR / USD", .address = "0x4497B606be93e773bbA5eaCFCb2ac5E2214220Eb" },
    .{ .name = "LINK / USD", .address = "0xd61D7398B7734aBe7C4B143fE57dC666D2fe83aD" },
    .{ .name = "USDC / USD", .address = "0xA122591F60115D63421f66F752EF9f6e0bc73abC" },
    .{ .name = "USDT / USD", .address = "0xD925C5BF88Bd0ca09312625d429240F811b437c6" },
    .{ .name = "WBTC / USD", .address = "0x8211B991d713ddAE32326Fd69E1E2510F4a653B0" },
};
