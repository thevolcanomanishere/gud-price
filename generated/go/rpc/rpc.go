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

// ── JSON-RPC transport ──────────────────────────────────────────────────────

type rpcRequest struct {
	JSONRPC string        `json:"jsonrpc"`
	ID      uint64        `json:"id"`
	Method  string        `json:"method"`
	Params  []interface{} `json:"params"`
}

type rpcResponse struct {
	Result string `json:"result"`
	Error  *struct {
		Message string `json:"message"`
	} `json:"error"`
}

// ethCall performs a JSON-RPC eth_call against the given RPC URL.
func ethCall(rpcUrl, to, data string) (string, error) {
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

	if rpcResp.Error != nil {
		return "", fmt.Errorf("RPC error: %s", rpcResp.Error.Message)
	}

	return rpcResp.Result, nil
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
func ReadFeedMetadata(rpcUrl, address string) (FeedMetadata, error) {
	decHex, err := ethCall(rpcUrl, address, SelDecimals)
	if err != nil {
		return FeedMetadata{}, err
	}
	descHex, err := ethCall(rpcUrl, address, SelDescription)
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
func ReadLatestPrice(rpcUrl, address string) (RoundData, error) {
	meta, err := ReadFeedMetadata(rpcUrl, address)
	if err != nil {
		return RoundData{}, err
	}

	hexStr, err := ethCall(rpcUrl, address, SelLatestRoundData)
	if err != nil {
		return RoundData{}, err
	}

	return formatRound(parseRoundDataRaw(hexStr), meta.Decimals, meta.Description), nil
}

// ReadLatestPriceWithMeta reads the latest price using pre-fetched metadata
// (saves 2 RPC calls).
func ReadLatestPriceWithMeta(rpcUrl, address string, meta FeedMetadata) (RoundData, error) {
	hexStr, err := ethCall(rpcUrl, address, SelLatestRoundData)
	if err != nil {
		return RoundData{}, err
	}

	return formatRound(parseRoundDataRaw(hexStr), meta.Decimals, meta.Description), nil
}

// ReadLatestPriceRaw reads the latest price as raw big.Int values.
func ReadLatestPriceRaw(rpcUrl, address string) (RoundDataRaw, error) {
	hexStr, err := ethCall(rpcUrl, address, SelLatestRoundData)
	if err != nil {
		return RoundDataRaw{}, err
	}

	return parseRoundDataRaw(hexStr), nil
}

// ReadPriceAtRound reads the price at a specific Chainlink round ID.
func ReadPriceAtRound(rpcUrl, address string, roundId *big.Int) (RoundData, error) {
	meta, err := ReadFeedMetadata(rpcUrl, address)
	if err != nil {
		return RoundData{}, err
	}

	hexStr, err := ethCall(rpcUrl, address, SelGetRoundData+EncodeUint(roundId))
	if err != nil {
		return RoundData{}, err
	}

	return formatRound(parseRoundDataRaw(hexStr), meta.Decimals, meta.Description), nil
}

// ReadPhaseId reads the current phase ID from a Chainlink feed proxy.
func ReadPhaseId(rpcUrl, address string) (*big.Int, error) {
	hexStr, err := ethCall(rpcUrl, address, SelPhaseID)
	if err != nil {
		return nil, err
	}
	return ReadWord(hexStr, 0), nil
}

// ReadAggregator reads the current aggregator contract address.
func ReadAggregator(rpcUrl, address string) (string, error) {
	hexStr, err := ethCall(rpcUrl, address, SelAggregator)
	if err != nil {
		return "", err
	}
	return "0x" + hexStr[26:66], nil
}

// ReadPhaseAggregator reads the aggregator address for a specific phase.
func ReadPhaseAggregator(rpcUrl, address string, phaseId *big.Int) (string, error) {
	hexStr, err := ethCall(rpcUrl, address, SelPhaseAggregators+EncodeUint(phaseId))
	if err != nil {
		return "", err
	}
	return "0x" + hexStr[26:66], nil
}

// ReadPrices reads the latest prices from multiple Chainlink feeds concurrently.
func ReadPrices(rpcUrl string, feeds map[string]string) (map[string]RoundData, error) {
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
			d, err := ReadLatestPrice(rpcUrl, a)
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
