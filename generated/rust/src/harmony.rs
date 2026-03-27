//! Chainlink price feed contract addresses.

use phf::phf_map;

pub const AUD_USD: &str = "0x1af363c2fcb47dd57133ee400e3c32eed4d37f8f";
pub const BTC_USD: &str = "0x3c41439eb1bf3ba3b2c3f8c921088b267f8d11f4";
pub const USDT_USD: &str = "0x5caaebe5c69a8287bffb9d00b5231bf7254145bf";
pub const JPY_USD: &str = "0xcdbb167e6c2fbc5c84b8eb4acf0995ec3d7cefa1";
pub const CRV_USD: &str = "0x054347c697e12782f906565e55996836e12da6ac";
pub const ETH_USD: &str = "0xbaf7c8149d586055ed02c286367a41e0ada96b7c";
pub const AXS_USD: &str = "0x3a65ee7351b603f950cb44ea6c265d6b5289512d";
pub const DAI_USD: &str = "0xf8326d22b2caff4880115e92161c324abc5e0395";
pub const GBP_USD: &str = "0x7dfab439b3aee18f6b687c40e5a9e62724e9099a";
pub const ONE_USD: &str = "0xdcd81fbbd6c4572a69a534d8b8152c562da8abef";
pub const FRAX_USD: &str = "0x5c0a80cba14a7afc825716b3f411cea7d9eb0f03";
pub const ILV_USD: &str = "0x4698f8bfb418bad926a4c8012f648870424fc52d";
pub const EUR_USD: &str = "0x8bc1cecd937cdd00e5feaf23b818aa8e30b8442a";
pub const AAVE_USD: &str = "0x6ee1efcce688d5b79cb8a400870af471c5282992";
pub const SAND_USD: &str = "0x6b890b13d48f46a8d4b85deabbd7155ee19d89b9";
pub const CAD_USD: &str = "0xc056a53c210c72ba98d1062ef95b7a23c96ec552";
pub const LINK_USD: &str = "0xd54f119d10901b4509610ea259a63169647800c4";
pub const CHF_USD: &str = "0x1039a288189680c9986841efa0688955b07af729";
pub const CVX_USD: &str = "0x4399420c25c52259edbeb974fc164e25964560c8";
pub const USDC_USD: &str = "0xa45a41be2d8419b60a6ce2bc393a0b086b8b3bda";
pub const LINK_ONE: &str = "0x69348435ee4b3904df1ae528fa0aaf34da1e9184";
pub const WBTC_USD: &str = "0x639545836d8b177054cefafe6942efe798ce6575";

/// Map of feed pair names to contract addresses.
pub static HARMONY_FEEDS: phf::Map<&'static str, &'static str> = phf_map! {
    "AUD / USD" => "0x1af363c2fcb47dd57133ee400e3c32eed4d37f8f",
    "BTC / USD" => "0x3c41439eb1bf3ba3b2c3f8c921088b267f8d11f4",
    "USDT / USD" => "0x5caaebe5c69a8287bffb9d00b5231bf7254145bf",
    "JPY / USD" => "0xcdbb167e6c2fbc5c84b8eb4acf0995ec3d7cefa1",
    "CRV / USD" => "0x054347c697e12782f906565e55996836e12da6ac",
    "ETH / USD" => "0xbaf7c8149d586055ed02c286367a41e0ada96b7c",
    "AXS / USD" => "0x3a65ee7351b603f950cb44ea6c265d6b5289512d",
    "DAI / USD" => "0xf8326d22b2caff4880115e92161c324abc5e0395",
    "GBP / USD" => "0x7dfab439b3aee18f6b687c40e5a9e62724e9099a",
    "ONE / USD" => "0xdcd81fbbd6c4572a69a534d8b8152c562da8abef",
    "FRAX / USD" => "0x5c0a80cba14a7afc825716b3f411cea7d9eb0f03",
    "ILV / USD" => "0x4698f8bfb418bad926a4c8012f648870424fc52d",
    "EUR / USD" => "0x8bc1cecd937cdd00e5feaf23b818aa8e30b8442a",
    "AAVE / USD" => "0x6ee1efcce688d5b79cb8a400870af471c5282992",
    "SAND / USD" => "0x6b890b13d48f46a8d4b85deabbd7155ee19d89b9",
    "CAD / USD" => "0xc056a53c210c72ba98d1062ef95b7a23c96ec552",
    "LINK / USD" => "0xd54f119d10901b4509610ea259a63169647800c4",
    "CHF / USD" => "0x1039a288189680c9986841efa0688955b07af729",
    "CVX / USD" => "0x4399420c25c52259edbeb974fc164e25964560c8",
    "USDC / USD" => "0xa45a41be2d8419b60a6ce2bc393a0b086b8b3bda",
    "LINK / ONE" => "0x69348435ee4b3904df1ae528fa0aaf34da1e9184",
    "WBTC / USD" => "0x639545836d8b177054cefafe6942efe798ce6575",
};
