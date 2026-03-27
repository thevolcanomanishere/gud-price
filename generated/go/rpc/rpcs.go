package rpc

// DefaultRPCs maps chain names to their public RPC endpoints.
// The first endpoint in each slice is the primary/official one.
var DefaultRPCs = map[string][]string{
	"ethereum": {
		"https://gateway.tenderly.co/public/mainnet",
		"https://eth-mainnet.rpcfast.com?api_key=xbhWBI1Wkguk8SNMu1bvvLurPGLXmgwYeC4S6g2H7WdwFigZSmPWVZRxrskEQwIf",
		"https://cloudflare-eth.com",
		"https://ethereum-rpc.publicnode.com",
		"https://virtual.mainnet.rpc.tenderly.co/5804dcf7-70e6-4988-b2b0-3672193e0c91",
		"https://mainnet.gateway.tenderly.co",
	},
	"polygon": {
		"https://polygon.gateway.tenderly.co",
		"https://polygon-bor-rpc.publicnode.com",
		"https://polygon.drpc.org",
		"https://gateway.tenderly.co/public/polygon",
		"https://polygon-public.nodies.app",
		"https://polygon-mainnet.rpcfast.com?api_key=xbhWBI1Wkguk8SNMu1bvvLurPGLXmgwYeC4S6g2H7WdwFigZSmPWVZRxrskEQwIf",
	},
	"arbitrum": {
		"https://arbitrum.drpc.org",
		"https://arbitrum-one.public.blastapi.io",
		"https://arbitrum-one-public.nodies.app",
		"https://arbitrum.public.blockpi.network/v1/rpc/public",
		"https://arbitrum.meowrpc.com",
		"https://arbitrum-one-rpc.publicnode.com",
	},
	"base": {
		"https://base.drpc.org",
		"https://base-mainnet.public.blastapi.io",
		"https://base.llamarpc.com",
		"https://base-public.nodies.app",
		"https://base.meowrpc.com",
		"https://base-rpc.publicnode.com",
	},
}

// RPC returns the primary public RPC endpoint for the given chain.
func RPC(chain string) string {
	urls, ok := DefaultRPCs[chain]
	if !ok || len(urls) == 0 {
		return ""
	}
	return urls[0]
}
