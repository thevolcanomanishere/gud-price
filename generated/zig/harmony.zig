//! Chainlink price feed contract addresses.

pub const AUD_USD = "0x1af363c2fcb47dd57133ee400e3c32eed4d37f8f";
pub const BTC_USD = "0x3c41439eb1bf3ba3b2c3f8c921088b267f8d11f4";
pub const USDT_USD = "0x5caaebe5c69a8287bffb9d00b5231bf7254145bf";
pub const JPY_USD = "0xcdbb167e6c2fbc5c84b8eb4acf0995ec3d7cefa1";
pub const CRV_USD = "0x054347c697e12782f906565e55996836e12da6ac";
pub const ETH_USD = "0xbaf7c8149d586055ed02c286367a41e0ada96b7c";
pub const AXS_USD = "0x3a65ee7351b603f950cb44ea6c265d6b5289512d";
pub const DAI_USD = "0xf8326d22b2caff4880115e92161c324abc5e0395";
pub const GBP_USD = "0x7dfab439b3aee18f6b687c40e5a9e62724e9099a";
pub const ONE_USD = "0xdcd81fbbd6c4572a69a534d8b8152c562da8abef";
pub const FRAX_USD = "0x5c0a80cba14a7afc825716b3f411cea7d9eb0f03";
pub const ILV_USD = "0x4698f8bfb418bad926a4c8012f648870424fc52d";
pub const EUR_USD = "0x8bc1cecd937cdd00e5feaf23b818aa8e30b8442a";
pub const AAVE_USD = "0x6ee1efcce688d5b79cb8a400870af471c5282992";
pub const SAND_USD = "0x6b890b13d48f46a8d4b85deabbd7155ee19d89b9";
pub const CAD_USD = "0xc056a53c210c72ba98d1062ef95b7a23c96ec552";
pub const LINK_USD = "0xd54f119d10901b4509610ea259a63169647800c4";
pub const CHF_USD = "0x1039a288189680c9986841efa0688955b07af729";
pub const CVX_USD = "0x4399420c25c52259edbeb974fc164e25964560c8";
pub const USDC_USD = "0xa45a41be2d8419b60a6ce2bc393a0b086b8b3bda";
pub const LINK_ONE = "0x69348435ee4b3904df1ae528fa0aaf34da1e9184";
pub const WBTC_USD = "0x639545836d8b177054cefafe6942efe798ce6575";

pub const Feed = struct {
    name: []const u8,
    address: []const u8,
};

pub const feeds = [_]Feed{
    .{ .name = "AUD / USD", .address = "0x1af363c2fcb47dd57133ee400e3c32eed4d37f8f" },
    .{ .name = "BTC / USD", .address = "0x3c41439eb1bf3ba3b2c3f8c921088b267f8d11f4" },
    .{ .name = "USDT / USD", .address = "0x5caaebe5c69a8287bffb9d00b5231bf7254145bf" },
    .{ .name = "JPY / USD", .address = "0xcdbb167e6c2fbc5c84b8eb4acf0995ec3d7cefa1" },
    .{ .name = "CRV / USD", .address = "0x054347c697e12782f906565e55996836e12da6ac" },
    .{ .name = "ETH / USD", .address = "0xbaf7c8149d586055ed02c286367a41e0ada96b7c" },
    .{ .name = "AXS / USD", .address = "0x3a65ee7351b603f950cb44ea6c265d6b5289512d" },
    .{ .name = "DAI / USD", .address = "0xf8326d22b2caff4880115e92161c324abc5e0395" },
    .{ .name = "GBP / USD", .address = "0x7dfab439b3aee18f6b687c40e5a9e62724e9099a" },
    .{ .name = "ONE / USD", .address = "0xdcd81fbbd6c4572a69a534d8b8152c562da8abef" },
    .{ .name = "FRAX / USD", .address = "0x5c0a80cba14a7afc825716b3f411cea7d9eb0f03" },
    .{ .name = "ILV / USD", .address = "0x4698f8bfb418bad926a4c8012f648870424fc52d" },
    .{ .name = "EUR / USD", .address = "0x8bc1cecd937cdd00e5feaf23b818aa8e30b8442a" },
    .{ .name = "AAVE / USD", .address = "0x6ee1efcce688d5b79cb8a400870af471c5282992" },
    .{ .name = "SAND / USD", .address = "0x6b890b13d48f46a8d4b85deabbd7155ee19d89b9" },
    .{ .name = "CAD / USD", .address = "0xc056a53c210c72ba98d1062ef95b7a23c96ec552" },
    .{ .name = "LINK / USD", .address = "0xd54f119d10901b4509610ea259a63169647800c4" },
    .{ .name = "CHF / USD", .address = "0x1039a288189680c9986841efa0688955b07af729" },
    .{ .name = "CVX / USD", .address = "0x4399420c25c52259edbeb974fc164e25964560c8" },
    .{ .name = "USDC / USD", .address = "0xa45a41be2d8419b60a6ce2bc393a0b086b8b3bda" },
    .{ .name = "LINK / ONE", .address = "0x69348435ee4b3904df1ae528fa0aaf34da1e9184" },
    .{ .name = "WBTC / USD", .address = "0x639545836d8b177054cefafe6942efe798ce6575" },
};
