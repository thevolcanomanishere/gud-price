//! Chainlink price feed contract addresses.

pub const APT_USD = "0x88a98431C25329AA422B21D147c1518b34dD36F4";
pub const AXL_USD = "0x676C4C6C31D97A5581D3204C04A8125B350E2F9D";
pub const CBETH_ETH = "0x806b4Ac04501c29769051e42783cF04dCE41440b";
pub const CBETH_USD = "0xd7818272B9e248357d13057AAb0B417aF31E817d";
pub const cbETH_ETH_Exchange_Rate = "0x868a501e68F3D1E89CfC0D22F6b22E8dabce5F04";
pub const COMP_USD = "0x9DDa783DE64A9d1A60c49ca761EbE528C35BA428";
pub const DAI_USD = "0x591e79239a7d679378eC8c847e5038150364C78F";
pub const ETH_USD = "0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70";
pub const LINK_ETH = "0xc5E65227fe3385B88468F9A01600017cDC9F3A12";
pub const LINK_USD = "0x17CAb8FE31E32f08326e5E27412894e49B0f9D65";
pub const OP_USD = "0x3E3A6bD129A63564FE7abde85FA67c3950569060";
pub const RETH_ETH = "0xf397bF97280B488cA19ee3093E81C0a77F02e9a5";
pub const RSR_USD = "0xAa98aE504658766Dfe11F31c5D95a0bdcABDe0b1";
pub const sfrxETH_frxETH_Exchange_Rate = "0x1Eba1d6941088c8FCE2CbcaC80754C77871aD093";
pub const SNX_USD = "0xe3971Ed6F1A5903321479Ef3148B5950c0612075";
pub const SOL_USD = "0x975043adBb80fc32276CbF9Bbcfd4A601a12462D";
pub const STETH_ETH = "0xf586d0728a47229e747d824a939000Cf21dEF5A0";
pub const STG_USD = "0x63Af8341b62E683B87bB540896bF283D96B4D385";
pub const USDC_USD = "0x7e860098F58bBFC8648a4311b374B1D669a2bc6B";
pub const USDT_USD = "0xf19d560eB8d2ADf07BD6D13ed03e1D11215721F9";
pub const WBTC_USD = "0xCCADC697c55bbB68dc5bCdf8d3CBe83CdD4E071E";
pub const wstETH_ETH_Exchange_Rate = "0xa669E5272E60f78299F4824495cE01a3923f4380";
pub const wstETH_stETH_Exchange_Rate = "0xB88BAc61a4Ca37C43a3725912B1f472c9A5bc061";
pub const YFI_USD = "0xD40e758b5eC80820B68DFC302fc5Ce1239083548";

pub const Feed = struct {
    name: []const u8,
    address: []const u8,
};

pub const feeds = [_]Feed{
    .{ .name = "APT / USD", .address = "0x88a98431C25329AA422B21D147c1518b34dD36F4" },
    .{ .name = "AXL / USD", .address = "0x676C4C6C31D97A5581D3204C04A8125B350E2F9D" },
    .{ .name = "CBETH / ETH", .address = "0x806b4Ac04501c29769051e42783cF04dCE41440b" },
    .{ .name = "CBETH / USD", .address = "0xd7818272B9e248357d13057AAb0B417aF31E817d" },
    .{ .name = "cbETH-ETH Exchange Rate", .address = "0x868a501e68F3D1E89CfC0D22F6b22E8dabce5F04" },
    .{ .name = "COMP / USD", .address = "0x9DDa783DE64A9d1A60c49ca761EbE528C35BA428" },
    .{ .name = "DAI / USD", .address = "0x591e79239a7d679378eC8c847e5038150364C78F" },
    .{ .name = "ETH / USD", .address = "0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70" },
    .{ .name = "LINK / ETH", .address = "0xc5E65227fe3385B88468F9A01600017cDC9F3A12" },
    .{ .name = "LINK / USD", .address = "0x17CAb8FE31E32f08326e5E27412894e49B0f9D65" },
    .{ .name = "OP / USD", .address = "0x3E3A6bD129A63564FE7abde85FA67c3950569060" },
    .{ .name = "RETH / ETH", .address = "0xf397bF97280B488cA19ee3093E81C0a77F02e9a5" },
    .{ .name = "RSR / USD", .address = "0xAa98aE504658766Dfe11F31c5D95a0bdcABDe0b1" },
    .{ .name = "sfrxETH-frxETH Exchange Rate", .address = "0x1Eba1d6941088c8FCE2CbcaC80754C77871aD093" },
    .{ .name = "SNX / USD", .address = "0xe3971Ed6F1A5903321479Ef3148B5950c0612075" },
    .{ .name = "SOL / USD", .address = "0x975043adBb80fc32276CbF9Bbcfd4A601a12462D" },
    .{ .name = "STETH / ETH", .address = "0xf586d0728a47229e747d824a939000Cf21dEF5A0" },
    .{ .name = "STG / USD", .address = "0x63Af8341b62E683B87bB540896bF283D96B4D385" },
    .{ .name = "USDC / USD", .address = "0x7e860098F58bBFC8648a4311b374B1D669a2bc6B" },
    .{ .name = "USDT / USD", .address = "0xf19d560eB8d2ADf07BD6D13ed03e1D11215721F9" },
    .{ .name = "WBTC / USD", .address = "0xCCADC697c55bbB68dc5bCdf8d3CBe83CdD4E071E" },
    .{ .name = "wstETH-ETH Exchange Rate", .address = "0xa669E5272E60f78299F4824495cE01a3923f4380" },
    .{ .name = "wstETH-stETH Exchange Rate", .address = "0xB88BAc61a4Ca37C43a3725912B1f472c9A5bc061" },
    .{ .name = "YFI / USD", .address = "0xD40e758b5eC80820B68DFC302fc5Ce1239083548" },
};
