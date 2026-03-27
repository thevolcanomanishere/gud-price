//! Chainlink price feed contract addresses.

pub const AAVE_USD = "0x538E0fC727ce4604e25354D082890cdb5553d33B";
pub const AVAX_USD = "0xB4b121ebE4DdCdFD3378b9519A101678829fE8c6";
pub const BNB_USD = "0x1AC823FdC79c30b1aB1787FF5e5766D6f29235E1";
pub const BTC_USD = "0xCaca6BFdeDA537236Ee406437D2F8a400026C589";
pub const CRV_USD = "0x8658273E2f7bc06d3F8462703b8a733204312fF2";
pub const DAI_USD = "0x203322e1d15EB3Dff541a5aF0288D951c4a8d3eA";
pub const DOGE_USD = "0x2667de5E58Ae152ce9c5EA6D1a8E051444294B82";
pub const ETH_USD = "0x6bF14CB0A831078629D993FDeBcB182b21A8774C";
pub const LINK_ETH = "0x78409c5b2dE2aC8ac76f45458FBaDD707e87B98a";
pub const LINK_USD = "0x227a4E5E9239CAc88022DF86B1Ad9B24A7616e60";
pub const RETH_ETH = "0x3fBB86e564fC1303625BA88EaE55740f3A649d36";
pub const SOL_USD = "0xDf3F55B6bd57084DD4a72a41853C0a2487CB757F";
pub const STETH_USD = "0x439a2b573C8Ecd215990Fc25b4F547E89CF67b79";
pub const STG_USD = "0x9019Be7Aa8f66551E94d6508EA48856386945E80";
pub const USDC_USD = "0x43d12Fb3AfCAd5347fA764EeAB105478337b7200";
pub const USDT_USD = "0xf376A91Ae078927eb3686D6010a6f1482424954E";
pub const WSTETH_ETH = "0xe428fbdbd61CC1be6C273dC0E27a1F43124a86F3";
pub const wstETH_stETH_Exchange_Rate = "0xE61Da4C909F7d86797a0D06Db63c34f76c9bCBDC";

pub const Feed = struct {
    name: []const u8,
    address: []const u8,
};

pub const feeds = [_]Feed{
    .{ .name = "AAVE / USD", .address = "0x538E0fC727ce4604e25354D082890cdb5553d33B" },
    .{ .name = "AVAX / USD", .address = "0xB4b121ebE4DdCdFD3378b9519A101678829fE8c6" },
    .{ .name = "BNB / USD", .address = "0x1AC823FdC79c30b1aB1787FF5e5766D6f29235E1" },
    .{ .name = "BTC / USD", .address = "0xCaca6BFdeDA537236Ee406437D2F8a400026C589" },
    .{ .name = "CRV / USD", .address = "0x8658273E2f7bc06d3F8462703b8a733204312fF2" },
    .{ .name = "DAI / USD", .address = "0x203322e1d15EB3Dff541a5aF0288D951c4a8d3eA" },
    .{ .name = "DOGE / USD", .address = "0x2667de5E58Ae152ce9c5EA6D1a8E051444294B82" },
    .{ .name = "ETH / USD", .address = "0x6bF14CB0A831078629D993FDeBcB182b21A8774C" },
    .{ .name = "LINK / ETH", .address = "0x78409c5b2dE2aC8ac76f45458FBaDD707e87B98a" },
    .{ .name = "LINK / USD", .address = "0x227a4E5E9239CAc88022DF86B1Ad9B24A7616e60" },
    .{ .name = "RETH / ETH", .address = "0x3fBB86e564fC1303625BA88EaE55740f3A649d36" },
    .{ .name = "SOL / USD", .address = "0xDf3F55B6bd57084DD4a72a41853C0a2487CB757F" },
    .{ .name = "STETH / USD", .address = "0x439a2b573C8Ecd215990Fc25b4F547E89CF67b79" },
    .{ .name = "STG / USD", .address = "0x9019Be7Aa8f66551E94d6508EA48856386945E80" },
    .{ .name = "USDC / USD", .address = "0x43d12Fb3AfCAd5347fA764EeAB105478337b7200" },
    .{ .name = "USDT / USD", .address = "0xf376A91Ae078927eb3686D6010a6f1482424954E" },
    .{ .name = "WSTETH / ETH", .address = "0xe428fbdbd61CC1be6C273dC0E27a1F43124a86F3" },
    .{ .name = "wstETH-stETH Exchange Rate", .address = "0xE61Da4C909F7d86797a0D06Db63c34f76c9bCBDC" },
};
