//! Default public RPC endpoints for all supported chains.

/// Get the primary public RPC endpoint for a chain.
pub fn rpc(chain: &str) -> &'static str {
    match chain {
        "ethereum" => "https://gateway.tenderly.co/public/mainnet",
        "polygon" => "https://polygon.gateway.tenderly.co",
        "arbitrum" => "https://arbitrum.drpc.org",
        "base" => "https://base.drpc.org",
        _ => "",
    }
}

/// Get all public RPC endpoints for a chain.
pub fn rpcs(chain: &str) -> &'static [&'static str] {
    match chain {
        "ethereum" => &["https://gateway.tenderly.co/public/mainnet", "https://eth-mainnet.rpcfast.com?api_key=xbhWBI1Wkguk8SNMu1bvvLurPGLXmgwYeC4S6g2H7WdwFigZSmPWVZRxrskEQwIf", "https://cloudflare-eth.com", "https://ethereum-rpc.publicnode.com", "https://virtual.mainnet.rpc.tenderly.co/5804dcf7-70e6-4988-b2b0-3672193e0c91", "https://mainnet.gateway.tenderly.co"],
        "polygon" => &["https://polygon.gateway.tenderly.co", "https://polygon-bor-rpc.publicnode.com", "https://polygon.drpc.org", "https://gateway.tenderly.co/public/polygon", "https://polygon-public.nodies.app", "https://polygon-mainnet.rpcfast.com?api_key=xbhWBI1Wkguk8SNMu1bvvLurPGLXmgwYeC4S6g2H7WdwFigZSmPWVZRxrskEQwIf"],
        "arbitrum" => &["https://arbitrum.drpc.org", "https://arbitrum-one.public.blastapi.io", "https://arbitrum-one-public.nodies.app", "https://arbitrum.public.blockpi.network/v1/rpc/public", "https://arbitrum.meowrpc.com", "https://arbitrum-one-rpc.publicnode.com"],
        "base" => &["https://base.drpc.org", "https://base-mainnet.public.blastapi.io", "https://base.llamarpc.com", "https://base-public.nodies.app", "https://base.meowrpc.com", "https://base-rpc.publicnode.com"],
        _ => &[],
    }
}
