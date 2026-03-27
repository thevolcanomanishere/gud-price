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
		"https://arbitrum-one-rpc.publicnode.com",
		"https://arbitrum.drpc.org",
		"https://arbitrum-one-public.nodies.app",
		"https://arbitrum.public.blockpi.network/v1/rpc/public",
		"https://arbitrum.meowrpc.com",
		"https://arbitrum-one.public.blastapi.io",
	},
	"base": {
		"https://base-rpc.publicnode.com",
		"https://base-public.nodies.app",
		"https://base.meowrpc.com",
		"https://base.llamarpc.com",
		"https://base.drpc.org",
		"https://base-mainnet.public.blastapi.io",
	},
	"optimism": {
		"https://go.getblock.io/e8a75f8dcf614861becfbcb185be6eb4",
		"https://optimism-rpc.publicnode.com",
		"https://optimism.drpc.org",
		"https://gateway.tenderly.co/public/optimism",
		"https://optimism.gateway.tenderly.co",
		"https://mainnet.optimism.io",
	},
	"avalanche": {
		"https://api.avax.network/ext/bc/C/rpc",
		"https://avalanche-c-chain-rpc.publicnode.com",
		"https://avalanche-public.nodies.app/ext/bc/C/rpc",
		"https://avalanche-mainnet.gateway.tenderly.co",
		"https://avalanche.api.onfinality.io/public/ext/bc/C/rpc",
		"https://1rpc.io/avax/c",
	},
	"bsc": {
		"https://rpc.sentio.xyz/bsc",
		"https://bsc-mainnet.rpcfast.com?api_key=xbhWBI1Wkguk8SNMu1bvvLurPGLXmgwYeC4S6g2H7WdwFigZSmPWVZRxrskEQwIf",
		"https://bsc.rpc.blxrbdn.com",
		"https://bnb.rpc.subquery.network/public",
		"https://bsc-mainnet.nodereal.io/v1/64a9df0874fb4a93b9d0a3849de012d3",
		"https://binance.nodereal.io",
	},
	"bnb": {
		"https://bsc-mainnet.rpcfast.com?api_key=xbhWBI1Wkguk8SNMu1bvvLurPGLXmgwYeC4S6g2H7WdwFigZSmPWVZRxrskEQwIf",
		"https://rpc.sentio.xyz/bsc",
		"https://bnb.rpc.subquery.network/public",
		"https://bsc.rpc.blxrbdn.com",
		"https://bsc-dataseed3.bnbchain.org",
		"https://bsc-dataseed1.bnbchain.org",
	},
	"fantom": {
		"https://fantom-mainnet.gateway.tatum.io",
		"https://fantom.api.onfinality.io/public",
		"https://fantom-json-rpc.stakely.io",
		"https://fantom-public.nodies.app",
		"https://fantom.drpc.org",
		"https://1rpc.io/ftm",
	},
	"gnosis": {
		"https://gnosis-rpc.publicnode.com",
		"https://gnosis-public.nodies.app",
		"https://gnosis.drpc.org",
		"https://gno-mainnet.gateway.tatum.io",
		"https://1rpc.io/gnosis",
		"https://rpc.gnosis.gateway.fm",
	},
	"xdai": {
		"https://gnosis-rpc.publicnode.com",
		"https://gnosis-public.nodies.app",
		"https://gnosis.drpc.org",
		"https://rpc.gnosis.gateway.fm",
		"https://rpc.ap-southeast-1.gateway.fm/v4/gnosis/non-archival/mainnet",
		"https://rpc.gnosischain.com",
	},
	"scroll": {
		"https://scroll-public.nodies.app",
		"https://scroll.drpc.org",
		"https://scroll-rpc.publicnode.com",
		"https://scroll.api.onfinality.io/public",
		"https://1rpc.io/scroll",
		"https://rpc.scroll.io",
	},
	"moonbeam": {
		"https://moonbeam-rpc.publicnode.com",
		"https://rpc.api.moonbeam.network",
		"https://moonbeam.api.onfinality.io/public",
		"https://1rpc.io/glmr",
		"https://moonbeam.unitedbloc.com",
		"https://moonbeam.drpc.org",
	},
	"moonriver": {
		"https://moonriver-rpc.publicnode.com",
		"https://moonriver.unitedbloc.com",
		"https://moonriver.drpc.org",
		"https://rpc.api.moonriver.moonbeam.network",
		"https://moonriver.api.onfinality.io/public",
		"https://moonriver.api.pocket.network",
	},
	"harmony": {
		"https://1rpc.io/one",
		"https://harmony-0.drpc.org",
		"https://a.api.s0.t.hmny.io",
		"https://api.s0.t.hmny.io",
		"https://api.harmony.one",
		"https://harmony.api.pocket.network",
	},
	"celo": {
		"https://celo.drpc.org",
		"https://forno.celo.org",
		"https://celo.api.onfinality.io/public",
		"https://rpc.ankr.com/celo",
		"https://celo-json-rpc.stakely.io",
		"https://rpc.celocolombia.org",
	},
	"linea": {
		"https://linea-rpc.publicnode.com",
		"https://1rpc.io/linea",
		"https://linea.drpc.org",
		"https://rpc.linea.build",
		"https://linea.api.pocket.network",
		"https://rpc.sentio.xyz/linea",
	},
	"metis": {
		"https://metis-rpc.publicnode.com",
		"https://metis-andromeda.gateway.tenderly.co",
		"https://metis.drpc.org",
		"https://metis-public.nodies.app",
		"https://metis.api.onfinality.io/public",
		"https://andromeda.metis.io/?owner=1088",
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
