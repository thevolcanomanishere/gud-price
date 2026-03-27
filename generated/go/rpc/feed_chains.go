package rpc

import (
	"strings"

	"github.com/thevolcanomanishere/gud-price/generated/go/arbitrum"
	"github.com/thevolcanomanishere/gud-price/generated/go/base"
	"github.com/thevolcanomanishere/gud-price/generated/go/ethereum"
	"github.com/thevolcanomanishere/gud-price/generated/go/polygon"
)

var feedChains map[string]string

func init() {
	feedChains = make(map[string]string)
	for _, addr := range arbitrum.ArbitrumFeeds {
		feedChains[strings.ToLower(addr)] = "arbitrum"
	}
	for _, addr := range base.BaseFeeds {
		feedChains[strings.ToLower(addr)] = "base"
	}
	for _, addr := range ethereum.EthereumFeeds {
		feedChains[strings.ToLower(addr)] = "ethereum"
	}
	for _, addr := range polygon.PolygonFeeds {
		feedChains[strings.ToLower(addr)] = "polygon"
	}
}

// FeedChain returns the chain name for a known feed address, or empty string.
func FeedChain(address string) string {
	return feedChains[strings.ToLower(address)]
}
