// Package rpc implements a Chainlink price feed reader using only the Go
// standard library. It mirrors the TypeScript implementation in src/rpc.ts.
package rpc

import (
	"bytes"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"math/big"
	"net/http"
	"sort"
	"strings"
	"sync"
	"sync/atomic"
	"time"
)

// Function selectors for the Chainlink AggregatorV3Interface.
const (
	SelDecimals         = "0x313ce567"
	SelDescription      = "0x7284e416"
	SelLatestRoundData  = "0xfeaf968c"
	SelGetRoundData     = "0x9a6fc8f5"
	SelPhaseID          = "0x58303b10"
	SelPhaseAggregators = "0xc1597304"
	SelAggregator       = "0x245a7bfc"
)

// rpcID is a global counter for JSON-RPC request IDs.
var rpcID uint64

// FeedMetadata holds the decimals and description of a Chainlink feed.
type FeedMetadata struct {
	Decimals    int
	Description string
}

// RoundData holds a formatted price round from a Chainlink feed.
type RoundData struct {
	RoundID         *big.Int
	Answer          string
	StartedAt       time.Time
	UpdatedAt       time.Time
	AnsweredInRound *big.Int
	Description     string
}

// RoundDataRaw holds the raw big.Int values from a latestRoundData call.
type RoundDataRaw struct {
	RoundID         *big.Int
	Answer          *big.Int
	StartedAt       *big.Int
	UpdatedAt       *big.Int
	AnsweredInRound *big.Int
}

// ── ABI helpers ─────────────────────────────────────────────────────────────

// ReadWord reads a 256-bit word from a hex-encoded result at the given
// 32-byte slot index. The hex string must start with "0x".
func ReadWord(hexStr string, slot int) *big.Int {
	start := 2 + slot*64
	end := start + 64
	if end > len(hexStr) {
		return new(big.Int)
	}
	n := new(big.Int)
	n.SetString(hexStr[start:end], 16)
	return n
}

// DecodeString decodes a Solidity ABI-encoded string from hex result data.
func DecodeString(hexStr string) string {
	offset := ReadWord(hexStr, 0)
	charOffset := 2 + int(offset.Int64())*2
	if charOffset+64 > len(hexStr) {
		return ""
	}
	length := new(big.Int)
	length.SetString(hexStr[charOffset:charOffset+64], 16)
	strHex := hexStr[charOffset+64 : charOffset+64+int(length.Int64())*2]
	b, err := hex.DecodeString(strHex)
	if err != nil {
		return ""
	}
	return string(b)
}

// EncodeUint ABI-encodes a big.Int as a left-padded 32-byte hex string
// (without 0x prefix).
func EncodeUint(value *big.Int) string {
	h := value.Text(16)
	if len(h) >= 64 {
		return h
	}
	return strings.Repeat("0", 64-len(h)) + h
}

// FormatPrice formats a raw integer price using the feed's decimal count.
func FormatPrice(raw *big.Int, decimals int) string {
	if raw.Sign() == 0 {
		return "0"
	}

	negative := raw.Sign() < 0
	abs := new(big.Int).Abs(raw)
	str := abs.String()

	if decimals == 0 {
		if negative {
			return "-" + str
		}
		return str
	}

	// Pad so there is at least decimals+1 digits.
	for len(str) < decimals+1 {
		str = "0" + str
	}

	intPart := str[:len(str)-decimals]
	fracPart := strings.TrimRight(str[len(str)-decimals:], "0")

	var result string
	if fracPart != "" {
		result = intPart + "." + fracPart
	} else {
		result = intPart
	}

	if negative {
		return "-" + result
	}
	return result
}

// ── Circuit breaker ─────────────────────────────────────────────────────────

var (
	failedMu        sync.Mutex
	failedEndpoints = map[string]time.Time{}
	cooldown        = 60 * time.Second
)

func sortByHealth(urls []string) []string {
	sorted := make([]string, len(urls))
	copy(sorted, urls)
	now := time.Now()
	failedMu.Lock()
	defer failedMu.Unlock()
	sort.SliceStable(sorted, func(i, j int) bool {
		ti, iFailed := failedEndpoints[sorted[i]]
		tj, jFailed := failedEndpoints[sorted[j]]
		iHealthy := !iFailed || now.Sub(ti) > cooldown
		jHealthy := !jFailed || now.Sub(tj) > cooldown
		if iHealthy && !jHealthy {
			return true
		}
		if !iHealthy && jHealthy {
			return false
		}
		return false
	})
	return sorted
}

func markFailed(url string) {
	failedMu.Lock()
	failedEndpoints[url] = time.Now()
	failedMu.Unlock()
}

// ── URL resolution ──────────────────────────────────────────────────────────

func resolveURLs(address string, rpcUrls []string) ([]string, error) {
	if len(rpcUrls) > 0 {
		return rpcUrls, nil
	}
	chain := FeedChain(address)
	if chain == "" {
		return nil, fmt.Errorf("unknown feed address: %s — pass an RPC URL", address)
	}
	urls, ok := DefaultRPCs[chain]
	if !ok || len(urls) == 0 {
		return nil, fmt.Errorf("no RPC endpoints for chain: %s", chain)
	}
	return urls, nil
}

// ── JSON-RPC transport ──────────────────────────────────────────────────────

type rpcRequest struct {
	JSONRPC string        `json:"jsonrpc"`
	ID      uint64        `json:"id"`
	Method  string        `json:"method"`
	Params  []interface{} `json:"params"`
}

type rpcResponse struct {
	Result string          `json:"result"`
	Error  json.RawMessage `json:"error"`
}

// ethCallSingle performs a JSON-RPC eth_call against a single RPC URL.
func ethCallSingle(rpcUrl, to, data string) (string, error) {
	id := atomic.AddUint64(&rpcID, 1)
	req := rpcRequest{
		JSONRPC: "2.0",
		ID:      id,
		Method:  "eth_call",
		Params: []interface{}{
			map[string]string{"to": to, "data": data},
			"latest",
		},
	}

	body, err := json.Marshal(req)
	if err != nil {
		return "", fmt.Errorf("marshal request: %w", err)
	}

	resp, err := http.Post(rpcUrl, "application/json", bytes.NewReader(body))
	if err != nil {
		return "", fmt.Errorf("http post: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("read response: %w", err)
	}

	var rpcResp rpcResponse
	if err := json.Unmarshal(respBody, &rpcResp); err != nil {
		return "", fmt.Errorf("unmarshal response: %w", err)
	}

	if len(rpcResp.Error) > 0 && string(rpcResp.Error) != "null" {
		var errObj struct{ Message string }
		if json.Unmarshal(rpcResp.Error, &errObj) == nil && errObj.Message != "" {
			return "", fmt.Errorf("RPC error: %s", errObj.Message)
		}
		return "", fmt.Errorf("RPC error: %s", string(rpcResp.Error))
	}

	return rpcResp.Result, nil
}

// ethCall performs an eth_call with fallback across multiple URLs.
func ethCall(address, data string, rpcUrls []string) (string, error) {
	urls, err := resolveURLs(address, rpcUrls)
	if err != nil {
		return "", err
	}
	sorted := sortByHealth(urls)
	var lastErr error
	for _, url := range sorted {
		result, err := ethCallSingle(url, address, data)
		if err != nil {
			markFailed(url)
			lastErr = err
			continue
		}
		return result, nil
	}
	return "", lastErr
}

// ── Internal helpers ────────────────────────────────────────────────────────

func parseRoundDataRaw(hexStr string) RoundDataRaw {
	return RoundDataRaw{
		RoundID:         ReadWord(hexStr, 0),
		Answer:          ReadWord(hexStr, 1),
		StartedAt:       ReadWord(hexStr, 2),
		UpdatedAt:       ReadWord(hexStr, 3),
		AnsweredInRound: ReadWord(hexStr, 4),
	}
}

func formatRound(raw RoundDataRaw, decimals int, description string) RoundData {
	return RoundData{
		RoundID:         raw.RoundID,
		Answer:          FormatPrice(raw.Answer, decimals),
		StartedAt:       time.Unix(raw.StartedAt.Int64(), 0),
		UpdatedAt:       time.Unix(raw.UpdatedAt.Int64(), 0),
		AnsweredInRound: raw.AnsweredInRound,
		Description:     description,
	}
}

// ── Public API ──────────────────────────────────────────────────────────────

// ReadFeedMetadata reads the decimals and description from a Chainlink feed.
func ReadFeedMetadata(address string, rpcUrls ...string) (FeedMetadata, error) {
	decHex, err := ethCall(address, SelDecimals, rpcUrls)
	if err != nil {
		return FeedMetadata{}, err
	}
	descHex, err := ethCall(address, SelDescription, rpcUrls)
	if err != nil {
		return FeedMetadata{}, err
	}

	return FeedMetadata{
		Decimals:    int(ReadWord(decHex, 0).Int64()),
		Description: DecodeString(descHex),
	}, nil
}

// ReadLatestPrice reads the latest price from a Chainlink feed, formatted as
// a decimal string.
func ReadLatestPrice(address string, rpcUrls ...string) (RoundData, error) {
	meta, err := ReadFeedMetadata(address, rpcUrls...)
	if err != nil {
		return RoundData{}, err
	}

	hexStr, err := ethCall(address, SelLatestRoundData, rpcUrls)
	if err != nil {
		return RoundData{}, err
	}

	return formatRound(parseRoundDataRaw(hexStr), meta.Decimals, meta.Description), nil
}

// ReadLatestPriceWithMeta reads the latest price using pre-fetched metadata
// (saves 2 RPC calls).
func ReadLatestPriceWithMeta(address string, meta FeedMetadata, rpcUrls ...string) (RoundData, error) {
	hexStr, err := ethCall(address, SelLatestRoundData, rpcUrls)
	if err != nil {
		return RoundData{}, err
	}

	return formatRound(parseRoundDataRaw(hexStr), meta.Decimals, meta.Description), nil
}

// ReadLatestPriceRaw reads the latest price as raw big.Int values.
func ReadLatestPriceRaw(address string, rpcUrls ...string) (RoundDataRaw, error) {
	hexStr, err := ethCall(address, SelLatestRoundData, rpcUrls)
	if err != nil {
		return RoundDataRaw{}, err
	}

	return parseRoundDataRaw(hexStr), nil
}

// ReadPriceAtRound reads the price at a specific Chainlink round ID.
func ReadPriceAtRound(address string, roundId *big.Int, rpcUrls ...string) (RoundData, error) {
	meta, err := ReadFeedMetadata(address, rpcUrls...)
	if err != nil {
		return RoundData{}, err
	}

	hexStr, err := ethCall(address, SelGetRoundData+EncodeUint(roundId), rpcUrls)
	if err != nil {
		return RoundData{}, err
	}

	return formatRound(parseRoundDataRaw(hexStr), meta.Decimals, meta.Description), nil
}

// ReadPhaseId reads the current phase ID from a Chainlink feed proxy.
func ReadPhaseId(address string, rpcUrls ...string) (*big.Int, error) {
	hexStr, err := ethCall(address, SelPhaseID, rpcUrls)
	if err != nil {
		return nil, err
	}
	return ReadWord(hexStr, 0), nil
}

// ReadAggregator reads the current aggregator contract address.
func ReadAggregator(address string, rpcUrls ...string) (string, error) {
	hexStr, err := ethCall(address, SelAggregator, rpcUrls)
	if err != nil {
		return "", err
	}
	return "0x" + hexStr[26:66], nil
}

// ReadPhaseAggregator reads the aggregator address for a specific phase.
func ReadPhaseAggregator(address string, phaseId *big.Int, rpcUrls ...string) (string, error) {
	hexStr, err := ethCall(address, SelPhaseAggregators+EncodeUint(phaseId), rpcUrls)
	if err != nil {
		return "", err
	}
	return "0x" + hexStr[26:66], nil
}

// ReadPrices reads the latest prices from multiple Chainlink feeds concurrently.
func ReadPrices(feeds map[string]string, rpcUrls ...string) (map[string]RoundData, error) {
	type result struct {
		name string
		data RoundData
		err  error
	}

	var wg sync.WaitGroup
	ch := make(chan result, len(feeds))

	for name, address := range feeds {
		wg.Add(1)
		go func(n, a string) {
			defer wg.Done()
			d, err := ReadLatestPrice(a, rpcUrls...)
			ch <- result{n, d, err}
		}(name, address)
	}

	wg.Wait()
	close(ch)

	out := make(map[string]RoundData, len(feeds))
	for r := range ch {
		if r.err != nil {
			return nil, fmt.Errorf("feed %s: %w", r.name, r.err)
		}
		out[r.name] = r.data
	}

	return out, nil
}
