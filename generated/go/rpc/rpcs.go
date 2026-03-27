package rpc

// DefaultRPCs maps chain names to their public RPC endpoints.
// The first endpoint in each slice is the primary/official one.
var DefaultRPCs = map[string][]string{
	"ethereum": {
		"https://ethereum-rpc.publicnode.com",
		"https://cloudflare-eth.com",
		"https://eth.drpc.org",
	},
	"polygon": {
		"https://polygon-rpc.com",
		"https://polygon-bor-rpc.publicnode.com",
		"https://polygon.drpc.org",
	},
	"arbitrum": {
		"https://arbitrum-one-rpc.publicnode.com",
		"https://arb1.arbitrum.io/rpc",
		"https://arbitrum.drpc.org",
	},
	"base": {
		"https://mainnet.base.org",
		"https://base-rpc.publicnode.com",
		"https://base.drpc.org",
	},
	"optimism": {
		"https://mainnet.optimism.io",
		"https://optimism-rpc.publicnode.com",
		"https://optimism.drpc.org",
	},
	"avalanche": {
		"https://api.avax.network/ext/bc/C/rpc",
		"https://avalanche-c-chain-rpc.publicnode.com",
		"https://avalanche.drpc.org",
	},
	"bsc": {
		"https://bsc-dataseed.bnbchain.org",
		"https://bsc-rpc.publicnode.com",
		"https://bsc.drpc.org",
	},
	"bnb": {
		"https://bsc-dataseed.bnbchain.org",
		"https://bsc-rpc.publicnode.com",
		"https://bsc.drpc.org",
	},
	"fantom": {
		"https://rpc.ftm.tools",
		"https://fantom-rpc.publicnode.com",
		"https://fantom.drpc.org",
	},
	"gnosis": {
		"https://rpc.gnosischain.com",
		"https://gnosis-rpc.publicnode.com",
		"https://gnosis.drpc.org",
	},
	"xdai": {
		"https://rpc.gnosischain.com",
		"https://gnosis-rpc.publicnode.com",
		"https://gnosis.drpc.org",
	},
	"scroll": {
		"https://rpc.scroll.io",
		"https://scroll-rpc.publicnode.com",
		"https://scroll.drpc.org",
	},
	"moonbeam": {
		"https://rpc.api.moonbeam.network",
		"https://moonbeam-rpc.publicnode.com",
		"https://moonbeam.drpc.org",
	},
	"moonriver": {
		"https://rpc.api.moonriver.moonbeam.network",
		"https://moonriver-rpc.publicnode.com",
		"https://moonriver.drpc.org",
	},
	"harmony": {
		"https://api.harmony.one",
		"https://harmony.drpc.org",
	},
	"celo": {
		"https://forno.celo.org",
		"https://celo-rpc.publicnode.com",
		"https://celo.drpc.org",
	},
	"linea": {
		"https://rpc.linea.build",
		"https://linea-rpc.publicnode.com",
		"https://linea.drpc.org",
	},
	"metis": {
		"https://andromeda.metis.io/?owner=1088",
		"https://metis.drpc.org",
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
