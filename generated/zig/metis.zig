//! Chainlink price feed contract addresses.

pub const AAVE_USD = "0x54389e89A5Ec1d4312d5B5C48055d6E56a177BF9";
pub const BTC_USD = "0x51Ed8Fecf96813826F727CaBDF01b3cF6a61373e";
pub const DAI_USD = "0xe0351cAAE70B5AdBD0107cD5331AD1D79c4c1CA1";
pub const ETH_USD = "0x3BBe70e2F96c87aEce7F67A2b0178052f62E37fE";
pub const LINK_USD = "0x4A4F382A2FF9685de9f0418F1375cE16D0727637";
pub const METIS_USD = "0xD4a5Bb03B5D66d9bf81507379302Ac2C2DFDFa6D";
pub const USDC_USD = "0x663855969c85F3BE415807250414Ca9129533a5f";
pub const USDT_USD = "0x51864b8948Aa5e35aace2BaDaF901D63418A3b9D";

pub const Feed = struct {
    name: []const u8,
    address: []const u8,
};

pub const feeds = [_]Feed{
    .{ .name = "AAVE / USD", .address = "0x54389e89A5Ec1d4312d5B5C48055d6E56a177BF9" },
    .{ .name = "BTC / USD", .address = "0x51Ed8Fecf96813826F727CaBDF01b3cF6a61373e" },
    .{ .name = "DAI / USD", .address = "0xe0351cAAE70B5AdBD0107cD5331AD1D79c4c1CA1" },
    .{ .name = "ETH / USD", .address = "0x3BBe70e2F96c87aEce7F67A2b0178052f62E37fE" },
    .{ .name = "LINK / USD", .address = "0x4A4F382A2FF9685de9f0418F1375cE16D0727637" },
    .{ .name = "METIS / USD", .address = "0xD4a5Bb03B5D66d9bf81507379302Ac2C2DFDFa6D" },
    .{ .name = "USDC / USD", .address = "0x663855969c85F3BE415807250414Ca9129533a5f" },
    .{ .name = "USDT / USD", .address = "0x51864b8948Aa5e35aace2BaDaF901D63418A3b9D" },
};
