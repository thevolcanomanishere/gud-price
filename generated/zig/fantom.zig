//! Chainlink price feed contract addresses.

pub const AAVE_USD = "0xE6ecF7d2361B6459cBb3b4fb065E0eF4B175Fe74";
pub const ALPACA_USD = "0x95d3FFf86A754AB81A7c59FcaB1468A2076f8C9b";
pub const BNB_USD = "0x6dE70f4791C4151E00aD02e969bD900DC961f92a";
pub const BTC_USD = "0x8e94C22142F4A64b99022ccDd994f4e9EC86E4B4";
pub const Calculated_sFTMX_USD = "0xb94533460Db5A1d8baf56240896eBB3491E608f7";
pub const CHF_USD = "0x4be9c8fb4105380116c03fC2Eeb9eA1e1a109D95";
pub const CREAM_USD = "0xD2fFcCfA0934caFdA647c5Ff8e7918A10103c01c";
pub const CRV_USD = "0xa141D7E3B44594cc65142AE5F2C7844Abea66D2B";
pub const DAI_USD = "0x91d5DEFAFfE2854C7D02F50c80FA1fdc8A721e52";
pub const ETH_USD = "0x11DdD3d147E5b83D01cee7070027092397d63658";
pub const EUR_USD = "0x3E68e68ea2c3698400465e3104843597690ae0f7";
pub const FRAX_USD = "0xBaC409D670d996Ef852056f6d45eCA41A8D57FbD";
pub const FTM_USD = "0xf4766552D15AE4d256Ad41B6cf2933482B0680dc";
pub const GMX_USD = "0x8a84D922eF06c1f13a30ddD1304BEf556ffa7552";
pub const LINK_FTM = "0x3FFe75E8EDA86F48e454e6bfb5F74d95C20744f4";
pub const LINK_USD = "0x221C773d8647BC3034e91a0c47062e26D20d97B4";
pub const MIM_USD = "0x28de48D3291F31F839274B8d82691c77DF1c5ceD";
pub const OHM_Index = "0xCeC98f20cCb5c19BB42553D70eBC2515E3B33947";
pub const SNX_USD = "0x2Eb00cC9dB7A7E0a013A49b3F6Ac66008d1456F7";
pub const SPELL_USD = "0x02E48946849e0BFDD7bEa5daa80AF77195C7E24c";
pub const SUSHI_USD = "0xCcc059a1a17577676c8673952Dc02070D29e5a66";
pub const USDC_USD = "0x2553f4eeb82d5A26427b8d1106C51499CBa5D99c";
pub const USDT_USD = "0xF64b636c5dFe1d3555A847341cDC449f612307d0";
pub const WBTC_USD = "0x9Da678cE7f28aAeC8A578A1e414219049509a552";
pub const YFI_USD = "0x9B25eC3d6acfF665DfbbFD68B3C1D896E067F0ae";

pub const Feed = struct {
    name: []const u8,
    address: []const u8,
};

pub const feeds = [_]Feed{
    .{ .name = "AAVE / USD", .address = "0xE6ecF7d2361B6459cBb3b4fb065E0eF4B175Fe74" },
    .{ .name = "ALPACA / USD", .address = "0x95d3FFf86A754AB81A7c59FcaB1468A2076f8C9b" },
    .{ .name = "BNB / USD", .address = "0x6dE70f4791C4151E00aD02e969bD900DC961f92a" },
    .{ .name = "BTC / USD", .address = "0x8e94C22142F4A64b99022ccDd994f4e9EC86E4B4" },
    .{ .name = "Calculated sFTMX / USD", .address = "0xb94533460Db5A1d8baf56240896eBB3491E608f7" },
    .{ .name = "CHF / USD", .address = "0x4be9c8fb4105380116c03fC2Eeb9eA1e1a109D95" },
    .{ .name = "CREAM / USD", .address = "0xD2fFcCfA0934caFdA647c5Ff8e7918A10103c01c" },
    .{ .name = "CRV / USD", .address = "0xa141D7E3B44594cc65142AE5F2C7844Abea66D2B" },
    .{ .name = "DAI / USD", .address = "0x91d5DEFAFfE2854C7D02F50c80FA1fdc8A721e52" },
    .{ .name = "ETH / USD", .address = "0x11DdD3d147E5b83D01cee7070027092397d63658" },
    .{ .name = "EUR / USD", .address = "0x3E68e68ea2c3698400465e3104843597690ae0f7" },
    .{ .name = "FRAX / USD", .address = "0xBaC409D670d996Ef852056f6d45eCA41A8D57FbD" },
    .{ .name = "FTM / USD", .address = "0xf4766552D15AE4d256Ad41B6cf2933482B0680dc" },
    .{ .name = "GMX / USD", .address = "0x8a84D922eF06c1f13a30ddD1304BEf556ffa7552" },
    .{ .name = "LINK / FTM", .address = "0x3FFe75E8EDA86F48e454e6bfb5F74d95C20744f4" },
    .{ .name = "LINK / USD", .address = "0x221C773d8647BC3034e91a0c47062e26D20d97B4" },
    .{ .name = "MIM / USD", .address = "0x28de48D3291F31F839274B8d82691c77DF1c5ceD" },
    .{ .name = "OHM Index", .address = "0xCeC98f20cCb5c19BB42553D70eBC2515E3B33947" },
    .{ .name = "SNX / USD", .address = "0x2Eb00cC9dB7A7E0a013A49b3F6Ac66008d1456F7" },
    .{ .name = "SPELL / USD", .address = "0x02E48946849e0BFDD7bEa5daa80AF77195C7E24c" },
    .{ .name = "SUSHI / USD", .address = "0xCcc059a1a17577676c8673952Dc02070D29e5a66" },
    .{ .name = "USDC / USD", .address = "0x2553f4eeb82d5A26427b8d1106C51499CBa5D99c" },
    .{ .name = "USDT / USD", .address = "0xF64b636c5dFe1d3555A847341cDC449f612307d0" },
    .{ .name = "WBTC / USD", .address = "0x9Da678cE7f28aAeC8A578A1e414219049509a552" },
    .{ .name = "YFI / USD", .address = "0x9B25eC3d6acfF665DfbbFD68B3C1D896E067F0ae" },
};
