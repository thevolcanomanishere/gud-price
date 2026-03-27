//! Chainlink price feed contract addresses.

pub const AAVE_USD = "0x37f35ef6735c594e6E803bC81577bAC759d8179C";
pub const BNB_USD = "0xD6B013A65C22C372F995864CcdAE202D0194f9bf";
pub const BTC_USD = "0x1B5C6cF9Df1CBF30387C24CC7DB1787CCf65C797";
pub const DAI_USD = "0x7ba0e3EbCe25DD3b5A0f36dd7aB34019B863b08D";
pub const DOT_USD = "0x54B584eb643375C41c55ddD8Da4b90124b18d05c";
pub const ETH_USD = "0xc3cF399566220dc5Ed6C8CFbf8247214Af103C72";
pub const FRAX_USD = "0xD080d4760318710e795B0a59f181f6C1512ffB15";
pub const FTM_USD = "0x5e70fC5f38cB930F9BE8BEAEaF80CF927Af3B17E";
pub const KSM_USD = "0x6e0513145FCE707Cd743528DB7C1cAB537DE9d1B";
pub const LINK_USD = "0xdD27789b504fEd690F406A82F16B45a0901172C0";
pub const MIM_USD = "0xdD6296BD7515271F7E4b10C3A87A2f9863fECa97";
pub const MOVR_USD = "0x3f8BFbDc1e79777511c00Ad8591cef888C2113C1";
pub const USDC_USD = "0x12870664a77Dd55bBdcDe32f91EB3244F511eF2e";
pub const USDT_USD = "0xF80DAd54AF79257D41c30014160349896ca5370a";
pub const WBTC_USD = "0xeEbBE35B5F397D5Bb26FD10d375b01D0F4a791a3";

pub const Feed = struct {
    name: []const u8,
    address: []const u8,
};

pub const feeds = [_]Feed{
    .{ .name = "AAVE / USD", .address = "0x37f35ef6735c594e6E803bC81577bAC759d8179C" },
    .{ .name = "BNB / USD", .address = "0xD6B013A65C22C372F995864CcdAE202D0194f9bf" },
    .{ .name = "BTC / USD", .address = "0x1B5C6cF9Df1CBF30387C24CC7DB1787CCf65C797" },
    .{ .name = "DAI / USD", .address = "0x7ba0e3EbCe25DD3b5A0f36dd7aB34019B863b08D" },
    .{ .name = "DOT / USD", .address = "0x54B584eb643375C41c55ddD8Da4b90124b18d05c" },
    .{ .name = "ETH / USD", .address = "0xc3cF399566220dc5Ed6C8CFbf8247214Af103C72" },
    .{ .name = "FRAX / USD", .address = "0xD080d4760318710e795B0a59f181f6C1512ffB15" },
    .{ .name = "FTM / USD", .address = "0x5e70fC5f38cB930F9BE8BEAEaF80CF927Af3B17E" },
    .{ .name = "KSM / USD", .address = "0x6e0513145FCE707Cd743528DB7C1cAB537DE9d1B" },
    .{ .name = "LINK / USD", .address = "0xdD27789b504fEd690F406A82F16B45a0901172C0" },
    .{ .name = "MIM / USD", .address = "0xdD6296BD7515271F7E4b10C3A87A2f9863fECa97" },
    .{ .name = "MOVR / USD", .address = "0x3f8BFbDc1e79777511c00Ad8591cef888C2113C1" },
    .{ .name = "USDC / USD", .address = "0x12870664a77Dd55bBdcDe32f91EB3244F511eF2e" },
    .{ .name = "USDT / USD", .address = "0xF80DAd54AF79257D41c30014160349896ca5370a" },
    .{ .name = "WBTC / USD", .address = "0xeEbBE35B5F397D5Bb26FD10d375b01D0F4a791a3" },
};
