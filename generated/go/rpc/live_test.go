package rpc

import (
	"testing"
	"time"
)

func TestLiveEthereumETHUSD(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping live RPC test")
	}
	done := make(chan struct{})
	go func() {
		defer close(done)
		data, err := ReadLatestPrice(RPC("ethereum"), "0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419")
		if err != nil {
			t.Errorf("ReadLatestPrice: %v", err)
			return
		}
		if data.Description != "ETH / USD" {
			t.Errorf("expected ETH / USD, got %s", data.Description)
		}
		if data.Answer == "" || data.Answer == "0" {
			t.Errorf("expected non-zero answer, got %s", data.Answer)
		}
		t.Logf("Ethereum ETH/USD: %s", data.Answer)
	}()
	select {
	case <-done:
	case <-time.After(15 * time.Second):
		t.Fatal("timeout: RPC call took >15s")
	}
}

func TestLivePolygonBTCUSD(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping live RPC test")
	}
	done := make(chan struct{})
	go func() {
		defer close(done)
		data, err := ReadLatestPrice(RPC("polygon"), "0xc907E116054Ad103354f2D350FD2514433D57F6f")
		if err != nil {
			t.Errorf("ReadLatestPrice: %v", err)
			return
		}
		if data.Description != "BTC / USD" {
			t.Errorf("expected BTC / USD, got %s", data.Description)
		}
		t.Logf("Polygon BTC/USD: %s", data.Answer)
	}()
	select {
	case <-done:
	case <-time.After(15 * time.Second):
		t.Fatal("timeout: RPC call took >15s")
	}
}

func TestLiveArbitrumETHUSD(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping live RPC test")
	}
	done := make(chan struct{})
	go func() {
		defer close(done)
		data, err := ReadLatestPrice(RPC("arbitrum"), "0x639Fe6ab55C921f74e7fac1ee960C0B6293ba612")
		if err != nil {
			t.Errorf("ReadLatestPrice: %v", err)
			return
		}
		if data.Description != "ETH / USD" {
			t.Errorf("expected ETH / USD, got %s", data.Description)
		}
		t.Logf("Arbitrum ETH/USD: %s", data.Answer)
	}()
	select {
	case <-done:
	case <-time.After(15 * time.Second):
		t.Fatal("timeout: RPC call took >15s")
	}
}

func TestLiveBaseETHUSD(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping live RPC test")
	}
	done := make(chan struct{})
	go func() {
		defer close(done)
		data, err := ReadLatestPrice(RPC("base"), "0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70")
		if err != nil {
			t.Errorf("ReadLatestPrice: %v", err)
			return
		}
		if data.Description != "ETH / USD" {
			t.Errorf("expected ETH / USD, got %s", data.Description)
		}
		t.Logf("Base ETH/USD: %s", data.Answer)
	}()
	select {
	case <-done:
	case <-time.After(15 * time.Second):
		t.Fatal("timeout: RPC call took >15s")
	}
}

func TestLiveReadPricesMultiple(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping live RPC test")
	}
	done := make(chan struct{})
	go func() {
		defer close(done)
		feeds := map[string]string{
			"ETH / USD": "0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419",
			"BTC / USD": "0xF4030086522a5bEEa4988F8cA5B36dbC97BeE88c",
		}
		results, err := ReadPrices(RPC("ethereum"), feeds)
		if err != nil {
			t.Errorf("ReadPrices: %v", err)
			return
		}
		for name, data := range results {
			if data.Answer == "" || data.Answer == "0" {
				t.Errorf("%s: expected non-zero answer", name)
			}
			t.Logf("%s: %s", name, data.Answer)
		}
	}()
	select {
	case <-done:
	case <-time.After(30 * time.Second):
		t.Fatal("timeout: RPC calls took >30s")
	}
}
