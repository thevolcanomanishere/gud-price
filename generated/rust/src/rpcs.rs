//! Default public RPC endpoints for all supported chains.

/// Get the primary public RPC endpoint for a chain.
pub fn rpc(chain: &str) -> &'static str {
    match chain {
        "ethereum" => "https://cloudflare-eth.com",
        "polygon" => "https://polygon-bor-rpc.publicnode.com",
        "arbitrum" => "https://arbitrum-one-rpc.publicnode.com",
        "base" => "https://gateway.tenderly.co/public/base",
        "optimism" => "https://optimism-rpc.publicnode.com",
        "avalanche" => "https://api.avax.network/ext/bc/C/rpc",
        "bsc" => "https://bsc-rpc.publicnode.com",
        "bnb" => "https://bsc-rpc.publicnode.com",
        "fantom" => "https://rpcapi.fantom.network",
        "gnosis" => "https://rpc.gnosischain.com",
        "xdai" => "https://gnosis-rpc.publicnode.com",
        "scroll" => "https://scroll.drpc.org",
        "moonbeam" => "https://moonbeam-rpc.publicnode.com",
        "moonriver" => "https://moonriver-rpc.publicnode.com",
        "harmony" => "https://1rpc.io/one",
        "celo" => "https://rpc.ankr.com/celo",
        "linea" => "https://1rpc.io/linea",
        "metis" => "https://metis-andromeda.gateway.tenderly.co",
        _ => "",
    }
}

/// Get all public RPC endpoints for a chain.
pub fn rpcs(chain: &str) -> &'static [&'static str] {
    match chain {
        "ethereum" => &["https://cloudflare-eth.com", "https://ethereum-rpc.publicnode.com", "https://ethereum-public.nodies.app", "https://rpc.flashbots.net/fast", "https://eth.llamarpc.com", "https://mainnet.gateway.tenderly.co"],
        "polygon" => &["https://polygon-bor-rpc.publicnode.com", "https://polygon.drpc.org", "https://polygon.lava.build", "https://polygon-public.nodies.app", "https://polygon-mainnet.rpcfast.com?api_key=xbhWBI1Wkguk8SNMu1bvvLurPGLXmgwYeC4S6g2H7WdwFigZSmPWVZRxrskEQwIf", "https://1rpc.io/matic"],
        "arbitrum" => &["https://arbitrum-one-rpc.publicnode.com", "https://arbitrum.gateway.tenderly.co", "https://arbitrum.drpc.org", "https://arbitrum.meowrpc.com", "https://arbitrum-one.public.blastapi.io", "https://1rpc.io/arb"],
        "base" => &["https://gateway.tenderly.co/public/base", "https://base.gateway.tenderly.co", "https://base-mainnet.public.blastapi.io", "https://base-public.nodies.app", "https://base-rpc.publicnode.com", "https://base.drpc.org"],
        "optimism" => &["https://optimism-rpc.publicnode.com", "https://mainnet.optimism.io", "https://optimism.drpc.org", "https://1rpc.io/op", "https://gateway.tenderly.co/public/optimism", "https://optimism.public.blockpi.network/v1/rpc/public"],
        "avalanche" => &["https://api.avax.network/ext/bc/C/rpc", "https://avalanche-c-chain-rpc.publicnode.com", "https://avalanche-mainnet.gateway.tenderly.co", "https://avalanche-public.nodies.app/ext/bc/C/rpc", "https://1rpc.io/avax/c", "https://avalanche.drpc.org"],
        "bsc" => &["https://bsc-rpc.publicnode.com", "https://binance-smart-chain-public.nodies.app", "https://0.48.club", "https://bsc.drpc.org", "https://bsc.meowrpc.com", "https://bsc.blockrazor.xyz"],
        "bnb" => &["https://bsc-rpc.publicnode.com", "https://0.48.club", "https://public-bsc-mainnet.fastnode.io", "https://bsc.blockrazor.xyz", "https://bsc-mainnet.rpcfast.com?api_key=xbhWBI1Wkguk8SNMu1bvvLurPGLXmgwYeC4S6g2H7WdwFigZSmPWVZRxrskEQwIf", "https://binance-smart-chain-public.nodies.app"],
        "fantom" => &["https://rpcapi.fantom.network", "https://fantom-json-rpc.stakely.io", "https://fantom.drpc.org", "https://1rpc.io/ftm", "https://fantom-public.nodies.app", "https://fantom.api.onfinality.io/public"],
        "gnosis" => &["https://rpc.gnosischain.com", "https://gnosis-rpc.publicnode.com", "https://rpc.gnosis.gateway.fm", "https://rpc.ap-southeast-1.gateway.fm/v4/gnosis/non-archival/mainnet", "https://gnosis-public.nodies.app", "https://1rpc.io/gnosis"],
        "xdai" => &["https://gnosis-rpc.publicnode.com", "https://public-gno-mainnet.fastnode.io", "https://gnosis-public.nodies.app", "https://gnosis.drpc.org", "https://1rpc.io/gnosis", "https://rpc.gnosischain.com"],
        "scroll" => &["https://scroll.drpc.org", "https://scroll-rpc.publicnode.com", "https://rpc.scroll.io", "https://scroll-public.nodies.app", "https://scroll.api.onfinality.io/public", "https://scroll.api.pocket.network"],
        "moonbeam" => &["https://moonbeam-rpc.publicnode.com", "https://1rpc.io/glmr", "https://rpc.api.moonbeam.network", "https://moonbeam.drpc.org", "https://moonbeam.api.onfinality.io/public", "https://moonbeam.unitedbloc.com"],
        "moonriver" => &["https://moonriver-rpc.publicnode.com", "https://moonriver.drpc.org", "https://rpc.api.moonriver.moonbeam.network", "https://moonriver.api.pocket.network", "https://moonriver.api.onfinality.io/public", "https://moonriver.unitedbloc.com"],
        "harmony" => &["https://1rpc.io/one", "https://harmony-0.drpc.org", "https://api.s0.t.hmny.io", "https://api.harmony.one", "https://harmony.api.pocket.network", "https://a.api.s0.t.hmny.io"],
        "celo" => &["https://rpc.ankr.com/celo", "https://forno.celo.org", "https://celo-mainnet.gateway.tatum.io", "https://celo-json-rpc.stakely.io", "https://celo.api.onfinality.io/public", "https://celo.drpc.org"],
        "linea" => &["https://1rpc.io/linea", "https://linea.drpc.org", "https://linea-rpc.publicnode.com", "https://rpc.linea.build", "https://rpc.sentio.xyz/linea", "https://linea.api.pocket.network"],
        "metis" => &["https://metis-andromeda.gateway.tenderly.co", "https://metis-public.nodies.app", "https://metis.api.onfinality.io/public", "https://metis.drpc.org", "https://metis-rpc.publicnode.com", "https://andromeda.metis.io/?owner=1088"],
        _ => &[],
    }
}
