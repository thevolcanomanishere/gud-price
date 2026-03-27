//! Chainlink price feed contract addresses.

pub const BTC_USD = "0x128fE88eaa22bFFb868Bb3A584A54C96eE24014b";
pub const CELO_USD = "0x0568fD19986748cEfF3301e55c0eb1E729E0Ab7e";
pub const CUSD_USD = "0xe38A27BE4E7d866327e09736F3C570F256FFd048";
pub const ETH_USD = "0x1FcD30A73D67639c1cD89ff5746E7585731c083B";
pub const EUR_USD = "0x3D207061Dbe8E2473527611BFecB87Ff12b28dDa";
pub const LINK_USD = "0x6b6a4c71ec3858A024f3f0Ee44bb0AdcBEd3DcC2";
pub const USDC_USD = "0xc7A353BaE210aed958a1A2928b654938EC59DaB2";
pub const USDT_USD = "0x5e37AF40A7A344ec9b03CCD34a250F3dA9a20B02";

pub const Feed = struct {
    name: []const u8,
    address: []const u8,
};

pub const feeds = [_]Feed{
    .{ .name = "BTC / USD", .address = "0x128fE88eaa22bFFb868Bb3A584A54C96eE24014b" },
    .{ .name = "CELO / USD", .address = "0x0568fD19986748cEfF3301e55c0eb1E729E0Ab7e" },
    .{ .name = "CUSD / USD", .address = "0xe38A27BE4E7d866327e09736F3C570F256FFd048" },
    .{ .name = "ETH / USD", .address = "0x1FcD30A73D67639c1cD89ff5746E7585731c083B" },
    .{ .name = "EUR / USD", .address = "0x3D207061Dbe8E2473527611BFecB87Ff12b28dDa" },
    .{ .name = "LINK / USD", .address = "0x6b6a4c71ec3858A024f3f0Ee44bb0AdcBEd3DcC2" },
    .{ .name = "USDC / USD", .address = "0xc7A353BaE210aed958a1A2928b654938EC59DaB2" },
    .{ .name = "USDT / USD", .address = "0x5e37AF40A7A344ec9b03CCD34a250F3dA9a20B02" },
};
