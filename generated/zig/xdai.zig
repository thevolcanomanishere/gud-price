//! Chainlink price feed contract addresses.

pub const YFI_USD = "0x14030d5a0c9e63d9606c6f2c8771fc95b34b07e0";
pub const ETH_USD = "0xa767f745331d267c7751297d982b050c93985627";
pub const BTC_USD = "0x6c1d7e76ef7304a40e8456ce883bc56d3dea3f7d";
pub const SUSHI_USD = "0xc0a6bf8d5d408b091d022c3c0653d4056d4b9c01";
pub const DOT_USD = "0x3c30c5c415b2410326297f0f65f5cbb32f3aefcc";
pub const AAVE_USD = "0x2b481dc923aa050e009113dca8dcb0dab4b68cdf";
pub const LINK_USD = "0xed322a5ac55bae091190dff9066760b86751947b";
pub const SNX_USD = "0x3b84d6e6976d5826500572600eb44f9f1753827b";
pub const DAI_USD = "0x678df3415fc31947da4324ec63212874be5a82f8";
pub const USDC_USD = "0x26c31ac71010af62e6b486d1132e266d6298857d";
pub const UNI_USD = "0xd98735d78266c62277bb4dbf3e3bcdd3694782f4";
pub const COMP_USD = "0xba95bc8418ebcdf8a690924e1d4ad5292139f2ea";
pub const _1INCH_USD = "0xfdf9eb5fafc11efa65f6fd144898da39a7920ae8";
pub const MKR_USD = "0x51e4024255d0cbd1f4c79aee6bdb6565df2c5d1b";
pub const REN_USD = "0x27d4d36968a2bd1cc3406d99cb1df50561dbf2a4";
pub const CREAM_USD = "0x3b681e9bf56efe4b2a14196826230a5843fff758";
pub const XAU_USD = "0x4a5ab0f60d12a4420d36d3ed9a1f77d8c47eb94c";
pub const FTT_USD = "0x0cae8f5c10931f0ce87ed9bbb71391c6e93c2c26";
pub const ZIL_USD = "0x2997eba3d9c2447c36107bb0f082b8c33566b49c";
pub const JPY_USD = "0x2afb993c670c01e9da1550c58e8039c1d8b8a317";
pub const AVAX_USD = "0x911e08a32a6b7671a80387f93147ab29063de9a2";
pub const SOL_USD = "0xb7b7d008c49295a0ff6eed6df4ad3052fd39d5e6";
pub const BNB_USD = "0x6d42cc26756c34f26becdd9b30a279ce9ea8296e";
pub const GNO_USD = "0x22441d81416430a54336ab28765abd31a792ad37";

pub const Feed = struct {
    name: []const u8,
    address: []const u8,
};

pub const feeds = [_]Feed{
    .{ .name = "YFI / USD", .address = "0x14030d5a0c9e63d9606c6f2c8771fc95b34b07e0" },
    .{ .name = "ETH / USD", .address = "0xa767f745331d267c7751297d982b050c93985627" },
    .{ .name = "BTC / USD", .address = "0x6c1d7e76ef7304a40e8456ce883bc56d3dea3f7d" },
    .{ .name = "SUSHI / USD", .address = "0xc0a6bf8d5d408b091d022c3c0653d4056d4b9c01" },
    .{ .name = "DOT / USD", .address = "0x3c30c5c415b2410326297f0f65f5cbb32f3aefcc" },
    .{ .name = "AAVE / USD", .address = "0x2b481dc923aa050e009113dca8dcb0dab4b68cdf" },
    .{ .name = "LINK / USD", .address = "0xed322a5ac55bae091190dff9066760b86751947b" },
    .{ .name = "SNX / USD", .address = "0x3b84d6e6976d5826500572600eb44f9f1753827b" },
    .{ .name = "DAI / USD", .address = "0x678df3415fc31947da4324ec63212874be5a82f8" },
    .{ .name = "USDC / USD", .address = "0x26c31ac71010af62e6b486d1132e266d6298857d" },
    .{ .name = "UNI / USD", .address = "0xd98735d78266c62277bb4dbf3e3bcdd3694782f4" },
    .{ .name = "COMP / USD", .address = "0xba95bc8418ebcdf8a690924e1d4ad5292139f2ea" },
    .{ .name = "1INCH / USD", .address = "0xfdf9eb5fafc11efa65f6fd144898da39a7920ae8" },
    .{ .name = "MKR / USD", .address = "0x51e4024255d0cbd1f4c79aee6bdb6565df2c5d1b" },
    .{ .name = "REN / USD", .address = "0x27d4d36968a2bd1cc3406d99cb1df50561dbf2a4" },
    .{ .name = "CREAM / USD", .address = "0x3b681e9bf56efe4b2a14196826230a5843fff758" },
    .{ .name = "XAU / USD", .address = "0x4a5ab0f60d12a4420d36d3ed9a1f77d8c47eb94c" },
    .{ .name = "FTT / USD", .address = "0x0cae8f5c10931f0ce87ed9bbb71391c6e93c2c26" },
    .{ .name = "ZIL / USD", .address = "0x2997eba3d9c2447c36107bb0f082b8c33566b49c" },
    .{ .name = "JPY / USD", .address = "0x2afb993c670c01e9da1550c58e8039c1d8b8a317" },
    .{ .name = "AVAX / USD", .address = "0x911e08a32a6b7671a80387f93147ab29063de9a2" },
    .{ .name = "SOL / USD", .address = "0xb7b7d008c49295a0ff6eed6df4ad3052fd39d5e6" },
    .{ .name = "BNB / USD", .address = "0x6d42cc26756c34f26becdd9b30a279ce9ea8296e" },
    .{ .name = "GNO / USD", .address = "0x22441d81416430a54336ab28765abd31a792ad37" },
};
