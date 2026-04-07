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

// Multicall3 is deployed at the same address on all supported chains.
const (
	Multicall3Address = "0xcA11bde05977b3631167028862bE2a173976CA11"
	SelAggregate3     = "0x82ad56cb"
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

// ── Multicall3 ───────────────────────────────────────────────────────────────

// Multicall3Call represents a single call in a Multicall3 aggregate3 batch.
type Multicall3Call struct {
	Target   string
	CallData string
}

// Multicall3Result holds the success flag and return data for one Multicall3 call.
type Multicall3Result struct {
	Success bool
	Data    string
}

// encodeAggregate3 ABI-encodes an aggregate3(Call3[]) call.
// Each Call3 is (address target, bool allowFailure, bytes callData) with allowFailure=true.
func encodeAggregate3(calls []Multicall3Call) string {
	n := len(calls)

	// Compute per-element encoded sizes (in bytes).
	// Each element: 32 (address) + 32 (allowFailure) + 32 (bytes ptr) + 32 (bytes length) + padded(callData)
	sizes := make([]int, n)
	for i, call := range calls {
		cd := strings.TrimPrefix(call.CallData, "0x")
		cdBytes := len(cd) / 2
		padded := ((cdBytes + 31) / 32) * 32
		sizes[i] = 128 + padded
	}

	var b strings.Builder
	// selector (no 0x)
	b.WriteString(strings.TrimPrefix(SelAggregate3, "0x"))
	// param offset = 32
	b.WriteString(fmt.Sprintf("%064x", 32))
	// array length
	b.WriteString(fmt.Sprintf("%064x", n))
	// element offsets (relative to array content start, which begins after the length word)
	// array content = [N offset words] + [element bodies]
	accumulated := 0
	for i := 0; i < n; i++ {
		offset := n*32 + accumulated
		b.WriteString(fmt.Sprintf("%064x", offset))
		accumulated += sizes[i]
	}
	// element bodies
	for _, call := range calls {
		addr := strings.ToLower(strings.TrimPrefix(call.Target, "0x"))
		cd := strings.TrimPrefix(call.CallData, "0x")
		cdBytes := len(cd) / 2
		padded := ((cdBytes + 31) / 32) * 32

		// address (padded to 32 bytes)
		b.WriteString(fmt.Sprintf("%024x", 0))
		b.WriteString(addr)
		// allowFailure = 1
		b.WriteString(fmt.Sprintf("%064x", 1))
		// bytes ptr = 96
		b.WriteString(fmt.Sprintf("%064x", 96))
		// bytes length
		b.WriteString(fmt.Sprintf("%064x", cdBytes))
		// bytes data, right-padded to next 32-byte boundary
		b.WriteString(cd)
		if padded > cdBytes {
			b.WriteString(strings.Repeat("0", (padded-cdBytes)*2))
		}
	}
	return "0x" + b.String()
}

// decodeAggregate3Results decodes the hex return value of aggregate3 into a slice of results.
func decodeAggregate3Results(hexStr string, n int) ([]Multicall3Result, error) {
	readAt := func(bytePos int) int64 {
		start := 2 + bytePos*2
		end := start + 64
		if end > len(hexStr) {
			return 0
		}
		val := new(big.Int)
		val.SetString(hexStr[start:end], 16)
		return val.Int64()
	}

	arrayOffset := readAt(0)
	arrayContentStart := int(arrayOffset) + 32

	results := make([]Multicall3Result, n)
	for i := 0; i < n; i++ {
		elemRelOffset := readAt(arrayContentStart + i*32)
		elemStart := arrayContentStart + int(elemRelOffset)

		success := readAt(elemStart) != 0
		bytesRelOffset := readAt(elemStart + 32)
		bytesStart := elemStart + int(bytesRelOffset)
		bytesLen := int(readAt(bytesStart))

		var data string
		if bytesLen == 0 {
			data = "0x"
		} else {
			dataStart := 2 + (bytesStart+32)*2
			dataEnd := dataStart + bytesLen*2
			if dataEnd > len(hexStr) {
				return nil, fmt.Errorf("decodeAggregate3Results: data out of bounds at element %d", i)
			}
			data = "0x" + hexStr[dataStart:dataEnd]
		}
		results[i] = Multicall3Result{Success: success, Data: data}
	}
	return results, nil
}

// Multicall executes a batch of calls via the Multicall3 aggregate3 function.
func Multicall(calls []Multicall3Call, rpcUrls ...string) ([]Multicall3Result, error) {
	result, err := ethCall(Multicall3Address, encodeAggregate3(calls), rpcUrls)
	if err != nil {
		return nil, err
	}
	return decodeAggregate3Results(result, len(calls))
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

// ReadPrices reads the latest prices from multiple Chainlink feeds using Multicall3.
func ReadPrices(feeds map[string]string, rpcUrls ...string) (map[string]RoundData, error) {
	if len(feeds) == 0 {
		return map[string]RoundData{}, nil
	}
	// Group by chain when no rpcUrls given, or single group otherwise.
	type group struct {
		entries [][2]string // [name, address]
		urls    []string
	}
	var groups []group
	if len(rpcUrls) > 0 {
		entries := make([][2]string, 0, len(feeds))
		for name, addr := range feeds {
			entries = append(entries, [2]string{name, addr})
		}
		groups = []group{{entries, rpcUrls}}
	} else {
		byChain := map[string][][2]string{}
		for name, addr := range feeds {
			chain := FeedChain(addr)
			if chain == "" {
				return nil, fmt.Errorf("unknown feed address: %s — pass an RPC URL", addr)
			}
			byChain[chain] = append(byChain[chain], [2]string{name, addr})
		}
		for chain, entries := range byChain {
			groups = append(groups, group{entries, DefaultRPCs[chain]})
		}
	}
	// Run each group concurrently.
	type groupResult struct {
		data map[string]RoundData
		err  error
	}
	ch := make(chan groupResult, len(groups))
	for _, g := range groups {
		go func(g group) {
			calls := make([]Multicall3Call, 0, len(g.entries)*3)
			for _, e := range g.entries {
				calls = append(calls,
					Multicall3Call{e[1], SelDecimals},
					Multicall3Call{e[1], SelDescription},
					Multicall3Call{e[1], SelLatestRoundData},
				)
			}
			mc, err := Multicall(calls, g.urls...)
			if err != nil {
				ch <- groupResult{err: err}
				return
			}
			out := make(map[string]RoundData, len(g.entries))
			for i, e := range g.entries {
				dec, desc, round := mc[i*3], mc[i*3+1], mc[i*3+2]
				if !dec.Success || !desc.Success || !round.Success {
					ch <- groupResult{err: fmt.Errorf("multicall sub-call failed for feed: %s", e[1])}
					return
				}
				decimals := int(ReadWord(dec.Data, 0).Int64())
				description := DecodeString(desc.Data)
				raw := parseRoundDataRaw(round.Data)
				out[e[0]] = formatRound(raw, decimals, description)
			}
			ch <- groupResult{data: out}
		}(g)
	}
	out := make(map[string]RoundData, len(feeds))
	for range groups {
		r := <-ch
		if r.err != nil {
			return nil, r.err
		}
		for k, v := range r.data {
			out[k] = v
		}
	}
	return out, nil
}
