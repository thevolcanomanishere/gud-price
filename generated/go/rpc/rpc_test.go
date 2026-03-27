package rpc

import (
	"encoding/json"
	"fmt"
	"math/big"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

// ── FormatPrice tests ────────────────────────────────────────────────────────

func TestFormatPrice(t *testing.T) {
	tests := []struct {
		name     string
		raw      *big.Int
		decimals int
		want     string
	}{
		{"formats integer price with 8 decimals", big.NewInt(180000000000), 8, "1800"},
		{"formats fractional price", big.NewInt(123456789), 8, "1.23456789"},
		{"handles zero", big.NewInt(0), 8, "0"},
		{"handles zero decimals", big.NewInt(42), 0, "42"},
		{"handles 18 decimals", new(big.Int).SetBytes(hexToBytes("56BC75E2D63100000")), 18, "100"},
		{"handles small fractional values", big.NewInt(1), 8, "0.00000001"},
		{"strips trailing zeros (1800)", big.NewInt(180000000000), 8, "1800"},
		{"strips trailing zeros (1.5)", big.NewInt(150000000), 8, "1.5"},
		{"handles negative values", big.NewInt(-100000000), 8, "-1"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := FormatPrice(tt.raw, tt.decimals)
			if got != tt.want {
				t.Errorf("FormatPrice(%s, %d) = %q, want %q", tt.raw, tt.decimals, got, tt.want)
			}
		})
	}
}

func hexToBytes(hexStr string) []byte {
	n := new(big.Int)
	n.SetString(hexStr, 16)
	return n.Bytes()
}

// ── Hex decoding helper tests ────────────────────────────────────────────────

func TestReadWord(t *testing.T) {
	// Build a hex string with two 32-byte words: 8 and 42
	hex := "0x" +
		fmt.Sprintf("%064x", 8) +
		fmt.Sprintf("%064x", 42)

	w0 := ReadWord(hex, 0)
	if w0.Int64() != 8 {
		t.Errorf("ReadWord(hex, 0) = %d, want 8", w0.Int64())
	}

	w1 := ReadWord(hex, 1)
	if w1.Int64() != 42 {
		t.Errorf("ReadWord(hex, 1) = %d, want 42", w1.Int64())
	}

	// Out of bounds returns zero
	w2 := ReadWord(hex, 5)
	if w2.Sign() != 0 {
		t.Errorf("ReadWord out of bounds = %d, want 0", w2.Int64())
	}
}

func TestDecodeString(t *testing.T) {
	hex := hexString("ETH / USD")
	got := DecodeString(hex)
	if got != "ETH / USD" {
		t.Errorf("DecodeString = %q, want %q", got, "ETH / USD")
	}

	hex2 := hexString("BTC / USD")
	got2 := DecodeString(hex2)
	if got2 != "BTC / USD" {
		t.Errorf("DecodeString = %q, want %q", got2, "BTC / USD")
	}
}

func TestEncodeUint(t *testing.T) {
	got := EncodeUint(big.NewInt(50))
	if len(got) != 64 {
		t.Errorf("EncodeUint length = %d, want 64", len(got))
	}
	if !strings.HasSuffix(got, "32") {
		t.Errorf("EncodeUint(50) = %q, want suffix '32'", got)
	}

	got0 := EncodeUint(big.NewInt(0))
	if got0 != strings.Repeat("0", 64) {
		t.Errorf("EncodeUint(0) should be all zeros")
	}
}

// ── Mock RPC server helpers ──────────────────────────────────────────────────

// hexWords builds a hex string with the given 256-bit values as 32-byte words.
func hexWords(values ...int64) string {
	var sb strings.Builder
	sb.WriteString("0x")
	for _, v := range values {
		sb.WriteString(fmt.Sprintf("%064x", v))
	}
	return sb.String()
}

// hexString builds an ABI-encoded string response.
func hexString(s string) string {
	hexChars := fmt.Sprintf("%x", s)
	// Pad hex chars to multiple of 64
	padded := hexChars
	if rem := len(padded) % 64; rem != 0 {
		padded += strings.Repeat("0", 64-rem)
	}
	return "0x" +
		fmt.Sprintf("%064x", 32) + // offset
		fmt.Sprintf("%064x", len(s)) + // length
		padded
}

// selectorRouter creates an httptest server that routes based on function selector.
func selectorRouter(responses map[string]string) *httptest.Server {
	return httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		var req struct {
			ID     uint64        `json:"id"`
			Params []interface{} `json:"params"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, err.Error(), 500)
			return
		}

		params := req.Params[0].(map[string]interface{})
		data := params["data"].(string)
		selector := data[:10]

		result, ok := responses[selector]
		if !ok {
			json.NewEncoder(w).Encode(map[string]interface{}{
				"jsonrpc": "2.0",
				"id":      req.ID,
				"error":   map[string]string{"message": "unmocked selector: " + selector},
			})
			return
		}

		json.NewEncoder(w).Encode(map[string]interface{}{
			"jsonrpc": "2.0",
			"id":      req.ID,
			"result":  result,
		})
	}))
}

// errorServer creates an httptest server that always returns an RPC error.
func errorServer(msg string) *httptest.Server {
	return httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		var req struct {
			ID uint64 `json:"id"`
		}
		json.NewDecoder(r.Body).Decode(&req)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"jsonrpc": "2.0",
			"id":      req.ID,
			"error":   map[string]string{"message": msg},
		})
	}))
}

// ── ReadFeedMetadata tests ───────────────────────────────────────────────────

func TestReadFeedMetadata(t *testing.T) {
	srv := selectorRouter(map[string]string{
		SelDecimals:    hexWords(8),
		SelDescription: hexString("ETH / USD"),
	})
	defer srv.Close()

	meta, err := ReadFeedMetadata("0xabc", srv.URL)
	if err != nil {
		t.Fatalf("ReadFeedMetadata: %v", err)
	}
	if meta.Decimals != 8 {
		t.Errorf("Decimals = %d, want 8", meta.Decimals)
	}
	if meta.Description != "ETH / USD" {
		t.Errorf("Description = %q, want %q", meta.Description, "ETH / USD")
	}
}

// ── ReadLatestPrice tests ────────────────────────────────────────────────────

func TestReadLatestPrice(t *testing.T) {
	srv := selectorRouter(map[string]string{
		SelDecimals:        hexWords(8),
		SelDescription:     hexString("ETH / USD"),
		SelLatestRoundData: hexWords(100, 180000000000, 1700000000, 1700000001, 100),
	})
	defer srv.Close()

	data, err := ReadLatestPrice("0xabc", srv.URL)
	if err != nil {
		t.Fatalf("ReadLatestPrice: %v", err)
	}
	if data.RoundID.Int64() != 100 {
		t.Errorf("RoundID = %d, want 100", data.RoundID.Int64())
	}
	if data.Answer != "1800" {
		t.Errorf("Answer = %q, want %q", data.Answer, "1800")
	}
	if data.Description != "ETH / USD" {
		t.Errorf("Description = %q, want %q", data.Description, "ETH / USD")
	}
	if data.StartedAt != time.Unix(1700000000, 0) {
		t.Errorf("StartedAt = %v, want %v", data.StartedAt, time.Unix(1700000000, 0))
	}
	if data.UpdatedAt != time.Unix(1700000001, 0) {
		t.Errorf("UpdatedAt = %v, want %v", data.UpdatedAt, time.Unix(1700000001, 0))
	}
	if data.AnsweredInRound.Int64() != 100 {
		t.Errorf("AnsweredInRound = %d, want 100", data.AnsweredInRound.Int64())
	}
}

// ── ReadLatestPriceRaw tests ─────────────────────────────────────────────────

func TestReadLatestPriceRaw(t *testing.T) {
	srv := selectorRouter(map[string]string{
		SelLatestRoundData: hexWords(100, 180000000000, 1700000000, 1700000001, 100),
	})
	defer srv.Close()

	data, err := ReadLatestPriceRaw("0xabc", srv.URL)
	if err != nil {
		t.Fatalf("ReadLatestPriceRaw: %v", err)
	}
	if data.RoundID.Int64() != 100 {
		t.Errorf("RoundID = %d, want 100", data.RoundID.Int64())
	}
	if data.Answer.Int64() != 180000000000 {
		t.Errorf("Answer = %d, want 180000000000", data.Answer.Int64())
	}
	if data.StartedAt.Int64() != 1700000000 {
		t.Errorf("StartedAt = %d, want 1700000000", data.StartedAt.Int64())
	}
	if data.UpdatedAt.Int64() != 1700000001 {
		t.Errorf("UpdatedAt = %d, want 1700000001", data.UpdatedAt.Int64())
	}
	if data.AnsweredInRound.Int64() != 100 {
		t.Errorf("AnsweredInRound = %d, want 100", data.AnsweredInRound.Int64())
	}
}

// ── ReadLatestPriceWithMeta tests ────────────────────────────────────────────

func TestReadLatestPriceWithMeta(t *testing.T) {
	srv := selectorRouter(map[string]string{
		SelLatestRoundData: hexWords(50, 4200000000000, 1700000000, 1700000001, 50),
	})
	defer srv.Close()

	meta := FeedMetadata{Decimals: 8, Description: "BTC / USD"}
	data, err := ReadLatestPriceWithMeta("0xabc", meta, srv.URL)
	if err != nil {
		t.Fatalf("ReadLatestPriceWithMeta: %v", err)
	}
	if data.Answer != "42000" {
		t.Errorf("Answer = %q, want %q", data.Answer, "42000")
	}
	if data.Description != "BTC / USD" {
		t.Errorf("Description = %q, want %q", data.Description, "BTC / USD")
	}
}

// ── ReadPriceAtRound tests ───────────────────────────────────────────────────

func TestReadPriceAtRound(t *testing.T) {
	srv := selectorRouter(map[string]string{
		SelDecimals:     hexWords(8),
		SelDescription:  hexString("BTC / USD"),
		SelGetRoundData: hexWords(50, 4200000000000, 1700000000, 1700000001, 50),
	})
	defer srv.Close()

	data, err := ReadPriceAtRound("0xabc", big.NewInt(50), srv.URL)
	if err != nil {
		t.Fatalf("ReadPriceAtRound: %v", err)
	}
	if data.RoundID.Int64() != 50 {
		t.Errorf("RoundID = %d, want 50", data.RoundID.Int64())
	}
	if data.Answer != "42000" {
		t.Errorf("Answer = %q, want %q", data.Answer, "42000")
	}
}

// ── ReadPhaseId tests ────────────────────────────────────────────────────────

func TestReadPhaseId(t *testing.T) {
	srv := selectorRouter(map[string]string{
		SelPhaseID: hexWords(5),
	})
	defer srv.Close()

	phase, err := ReadPhaseId("0xabc", srv.URL)
	if err != nil {
		t.Fatalf("ReadPhaseId: %v", err)
	}
	if phase.Int64() != 5 {
		t.Errorf("PhaseId = %d, want 5", phase.Int64())
	}
}

// ── ReadAggregator tests ─────────────────────────────────────────────────────

func TestReadAggregator(t *testing.T) {
	addr := "0xabcdef1234567890abcdef1234567890abcdef12"
	srv := selectorRouter(map[string]string{
		SelAggregator: "0x000000000000000000000000" + addr[2:],
	})
	defer srv.Close()

	got, err := ReadAggregator("0xabc", srv.URL)
	if err != nil {
		t.Fatalf("ReadAggregator: %v", err)
	}
	if got != addr {
		t.Errorf("ReadAggregator = %q, want %q", got, addr)
	}
}

// ── ReadPhaseAggregator tests ────────────────────────────────────────────────

func TestReadPhaseAggregator(t *testing.T) {
	addr := "0x1234567890abcdef1234567890abcdef12345678"
	srv := selectorRouter(map[string]string{
		SelPhaseAggregators: "0x000000000000000000000000" + addr[2:],
	})
	defer srv.Close()

	got, err := ReadPhaseAggregator("0xabc", big.NewInt(5), srv.URL)
	if err != nil {
		t.Fatalf("ReadPhaseAggregator: %v", err)
	}
	if got != addr {
		t.Errorf("ReadPhaseAggregator = %q, want %q", got, addr)
	}
}

// ── ReadPrices tests ─────────────────────────────────────────────────────────

func TestReadPrices(t *testing.T) {
	srv := selectorRouter(map[string]string{
		SelDecimals:        hexWords(8),
		SelDescription:     hexString("ETH / USD"),
		SelLatestRoundData: hexWords(1, 180000000000, 1700000000, 1700000001, 1),
	})
	defer srv.Close()

	feeds := map[string]string{
		"ETH / USD": "0xaaa",
		"BTC / USD": "0xbbb",
	}

	results, err := ReadPrices(feeds, srv.URL)
	if err != nil {
		t.Fatalf("ReadPrices: %v", err)
	}
	if len(results) != 2 {
		t.Errorf("ReadPrices returned %d results, want 2", len(results))
	}
	if results["ETH / USD"].Answer != "1800" {
		t.Errorf("ETH/USD answer = %q, want %q", results["ETH / USD"].Answer, "1800")
	}
	if _, ok := results["BTC / USD"]; !ok {
		t.Error("BTC / USD not in results")
	}
}

// ── RPC error handling tests ─────────────────────────────────────────────────

func TestRPCErrorHandling(t *testing.T) {
	srv := errorServer("execution reverted")
	defer srv.Close()

	_, err := ReadLatestPriceRaw("0xabc", srv.URL)
	if err == nil {
		t.Fatal("expected error, got nil")
	}
	if !strings.Contains(err.Error(), "execution reverted") {
		t.Errorf("error = %q, want to contain %q", err.Error(), "execution reverted")
	}
}
