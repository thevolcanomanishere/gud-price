//! Chainlink price feed RPC client -- reads on-chain data via JSON-RPC eth_call.

use std::collections::HashMap;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Mutex;
use std::time::Instant;

// ---- Function selectors -------------------------------------------------------

pub const SEL_DECIMALS: &str = "0x313ce567";
pub const SEL_DESCRIPTION: &str = "0x7284e416";
pub const SEL_LATEST_ROUND_DATA: &str = "0xfeaf968c";
pub const SEL_GET_ROUND_DATA: &str = "0x9a6fc8f5";
pub const SEL_PHASE_ID: &str = "0x58303b10";
pub const SEL_PHASE_AGGREGATORS: &str = "0xc1597304";
pub const SEL_AGGREGATOR: &str = "0x245a7bfc";

/// Multicall3 is deployed at the same address on all supported chains.
pub const MULTICALL3: &str = "0xcA11bde05977b3631167028862bE2a173976CA11";
pub const SEL_AGGREGATE3: &str = "0x82ad56cb";

// ---- Types --------------------------------------------------------------------

/// Formatted round data with a human-readable price string.
#[derive(Debug, Clone)]
pub struct RoundData {
    pub round_id: u128,
    pub answer: String,
    pub started_at: u64,
    pub updated_at: u64,
    pub answered_in_round: u128,
    pub description: String,
}

/// Raw round data straight from the ABI-encoded response.
#[derive(Debug, Clone)]
pub struct RoundDataRaw {
    pub round_id: u128,
    pub answer: i128,
    pub started_at: u64,
    pub updated_at: u64,
    pub answered_in_round: u128,
}

/// Decimals and description for a Chainlink price feed.
#[derive(Debug, Clone)]
pub struct FeedMetadata {
    pub decimals: u8,
    pub description: String,
}

// ---- Multicall3 types ---------------------------------------------------------

/// A single call for Multicall3.aggregate3.
#[derive(Debug, Clone)]
pub struct Multicall3Call {
    pub target: String,
    pub call_data: String,
}

/// The result of a single Multicall3.aggregate3 sub-call.
#[derive(Debug, Clone)]
pub struct Multicall3Result {
    pub success: bool,
    pub data: String,
}

// ---- Hex / ABI helpers --------------------------------------------------------

/// Read a 256-bit word from a hex-encoded result at the given 32-byte slot index.
/// Returns the value as u128 (sufficient for Chainlink round IDs and timestamps).
pub fn read_word(hex: &str, slot: usize) -> u128 {
    let start = 2 + slot * 64; // skip "0x"
    let word = &hex[start..start + 64];
    u128::from_str_radix(word, 16).unwrap_or(0)
}

/// Read a 256-bit word and interpret it as a signed 256-bit integer,
/// then return as i128 (sufficient for Chainlink answer values).
pub fn read_word_signed(hex: &str, slot: usize) -> i128 {
    let start = 2 + slot * 64;
    let word = &hex[start..start + 64];
    // Check the high bit (first hex char >= 8 means negative in two's complement)
    let first_nibble = u8::from_str_radix(&word[..1], 16).unwrap_or(0);
    if first_nibble >= 8 {
        // Negative: compute two's complement for the low 128 bits.
        // For a 256-bit negative number, if the top 128 bits are all 1s (0xfff...)
        // the low 128 bits interpreted as i128 give the correct value.
        let low = u128::from_str_radix(&word[32..], 16).unwrap_or(0);
        low as i128
    } else {
        let low = u128::from_str_radix(&word[32..], 16).unwrap_or(0);
        low as i128
    }
}

/// Decode a Solidity ABI-encoded `string` from hex result data.
pub fn decode_string(hex: &str) -> String {
    let offset = read_word(hex, 0) as usize; // byte offset to string data
    let char_offset = 2 + offset * 2;
    let length_hex = &hex[char_offset..char_offset + 64];
    let length = usize::from_str_radix(length_hex, 16).unwrap_or(0);
    let str_hex = &hex[char_offset + 64..char_offset + 64 + length * 2];
    let bytes: Vec<u8> = (0..str_hex.len())
        .step_by(2)
        .map(|i| u8::from_str_radix(&str_hex[i..i + 2], 16).unwrap_or(0))
        .collect();
    String::from_utf8(bytes).unwrap_or_default()
}

/// ABI-encode a uint value as a 32-byte hex string (no "0x" prefix).
pub fn encode_uint(value: u128) -> String {
    format!("{:064x}", value)
}

/// Parse a hex address string like "0xABC..." into lowercase with 0x prefix.
/// If the input doesn't have a 0x prefix it is added.
pub fn parse_address(hex: &str) -> String {
    if hex.starts_with("0x") || hex.starts_with("0X") {
        hex.to_lowercase()
    } else {
        format!("0x{}", hex.to_lowercase())
    }
}

/// Format a raw integer price using the feed's decimal count.
pub fn format_price(raw: i128, decimals: u8) -> String {
    if raw == 0 {
        return "0".to_string();
    }
    let negative = raw < 0;
    let abs = if negative { -raw } else { raw } as u128;
    let mut s = abs.to_string();
    let d = decimals as usize;

    if d == 0 {
        return if negative { format!("-{}", s) } else { s };
    }

    // Pad so that we have at least decimals+1 digits.
    while s.len() <= d {
        s.insert(0, '0');
    }
    let int_part = &s[..s.len() - d];
    let frac_part = s[s.len() - d..].trim_end_matches('0');
    let result = if frac_part.is_empty() {
        int_part.to_string()
    } else {
        format!("{}.{}", int_part, frac_part)
    };
    if negative {
        format!("-{}", result)
    } else {
        result
    }
}

// ---- Parse helpers ------------------------------------------------------------

/// Parse raw round data from a hex-encoded `latestRoundData` or `getRoundData` response.
pub fn parse_round_data_raw(hex: &str) -> RoundDataRaw {
    RoundDataRaw {
        round_id: read_word(hex, 0),
        answer: read_word_signed(hex, 1),
        started_at: read_word(hex, 2) as u64,
        updated_at: read_word(hex, 3) as u64,
        answered_in_round: read_word(hex, 4),
    }
}

/// Format a raw round into a human-readable `RoundData`.
pub fn format_round(raw: &RoundDataRaw, decimals: u8, description: &str) -> RoundData {
    RoundData {
        round_id: raw.round_id,
        answer: format_price(raw.answer, decimals),
        started_at: raw.started_at,
        updated_at: raw.updated_at,
        answered_in_round: raw.answered_in_round,
        description: description.to_string(),
    }
}

/// Parse feed metadata (decimals + description) from their respective hex responses.
pub fn parse_feed_metadata(decimals_hex: &str, description_hex: &str) -> FeedMetadata {
    FeedMetadata {
        decimals: read_word(decimals_hex, 0) as u8,
        description: decode_string(description_hex),
    }
}

fn encode_aggregate3(calls: &[Multicall3Call]) -> String {
    let n = calls.len();

    // Compute per-element sizes (in bytes) for offset calculation
    let sizes: Vec<usize> = calls
        .iter()
        .map(|c| {
            let data_hex = if c.call_data.starts_with("0x") || c.call_data.starts_with("0X") {
                &c.call_data[2..]
            } else {
                &c.call_data
            };
            let data_byte_len = data_hex.len() / 2;
            let padded_len = ((data_byte_len + 31) / 32) * 32;
            128 + padded_len
        })
        .collect();

    let mut hex = String::new();

    // selector (without 0x)
    hex.push_str(&SEL_AGGREGATE3[2..]);

    // param offset = 32
    hex.push_str(&format!("{:064x}", 32usize));

    // array length = N
    hex.push_str(&format!("{:064x}", n));

    // element offsets from array content start (right after length word)
    let mut cumulative = 0usize;
    for i in 0..n {
        let offset = n * 32 + cumulative;
        hex.push_str(&format!("{:064x}", offset));
        cumulative += sizes[i];
    }

    // element bodies
    for call in calls {
        let target = if call.target.starts_with("0x") || call.target.starts_with("0X") {
            &call.target[2..]
        } else {
            &call.target
        };
        let data_hex = if call.call_data.starts_with("0x") || call.call_data.starts_with("0X") {
            &call.call_data[2..]
        } else {
            &call.call_data
        };
        let data_byte_len = data_hex.len() / 2;
        let padded_len = ((data_byte_len + 31) / 32) * 32;

        // target: 12 zero bytes + 20-byte address
        hex.push_str("000000000000000000000000");
        hex.push_str(&target.to_lowercase());
        // allowFailure = true
        hex.push_str(&format!("{:064x}", 1usize));
        // bytes ptr = 96
        hex.push_str(&format!("{:064x}", 96usize));
        // bytes length
        hex.push_str(&format!("{:064x}", data_byte_len));
        // calldata right-padded to padded_len*2 hex chars
        hex.push_str(data_hex);
        let padding = padded_len * 2 - data_hex.len();
        for _ in 0..padding {
            hex.push('0');
        }
    }

    format!("0x{}", hex)
}

fn decode_aggregate3_results(hex: &str, n: usize) -> Vec<Multicall3Result> {
    let read_at = |byte_pos: usize| -> usize {
        let start = 2 + byte_pos * 2;
        usize::from_str_radix(&hex[start..start + 64], 16).unwrap_or(0)
    };

    let array_byte_offset = read_at(0); // = 32
    let array_content_start = array_byte_offset + 32; // skip the length word itself

    let mut results = Vec::with_capacity(n);
    for i in 0..n {
        let elem_rel_offset = read_at(array_content_start + i * 32);
        let elem_start = array_content_start + elem_rel_offset;

        let success = read_at(elem_start) != 0;

        let bytes_rel_offset = read_at(elem_start + 32);
        let bytes_start = elem_start + bytes_rel_offset;
        let bytes_len = read_at(bytes_start);

        let data = if bytes_len > 0 {
            let hex_start = 2 + (bytes_start + 32) * 2;
            let hex_end = hex_start + bytes_len * 2;
            format!("0x{}", &hex[hex_start..hex_end])
        } else {
            "0x".to_string()
        };

        results.push(Multicall3Result { success, data });
    }
    results
}

fn do_multicall(calls: &[Multicall3Call], urls: &[&str]) -> Result<Vec<Multicall3Result>, String> {
    let sorted = sort_by_health(urls);
    let mut last_err = String::new();
    let calldata = encode_aggregate3(calls); // encode once, reuse across retries
    for url in &sorted {
        match eth_call(url, MULTICALL3, &calldata) {
            Ok(hex) => return Ok(decode_aggregate3_results(&hex, calls.len())),
            Err(e) => {
                mark_failed(url);
                last_err = e;
            }
        }
    }
    Err(last_err)
}

/// Execute a batch of calls via Multicall3.aggregate3 in a single RPC request.
/// Uses allowFailure=true per call; check `success` on each result.
pub fn multicall(calls: &[Multicall3Call], rpc_url: &str) -> Result<Vec<Multicall3Result>, String> {
    do_multicall(calls, &[rpc_url])
}

// ---- Circuit breaker ----------------------------------------------------------

static FAILED_ENDPOINTS: Mutex<Option<HashMap<String, Instant>>> = Mutex::new(None);
const COOLDOWN_SECS: u64 = 60;

fn mark_failed(url: &str) {
    let mut guard = FAILED_ENDPOINTS.lock().unwrap();
    let map = guard.get_or_insert_with(HashMap::new);
    map.insert(url.to_string(), Instant::now());
}

fn sort_by_health(urls: &[&str]) -> Vec<String> {
    let mut sorted: Vec<String> = urls.iter().map(|u| u.to_string()).collect();
    let guard = FAILED_ENDPOINTS.lock().unwrap();
    if let Some(map) = guard.as_ref() {
        let now = Instant::now();
        sorted.sort_by(|a, b| {
            let a_healthy = map
                .get(a)
                .is_none_or(|t| now.duration_since(*t).as_secs() > COOLDOWN_SECS);
            let b_healthy = map
                .get(b)
                .is_none_or(|t| now.duration_since(*t).as_secs() > COOLDOWN_SECS);
            b_healthy.cmp(&a_healthy)
        });
    }
    sorted
}

// ---- URL resolution -----------------------------------------------------------

fn resolve_urls<'a>(
    contract_address: &str,
    rpc_url: Option<&'a str>,
) -> Result<Vec<&'a str>, String> {
    if let Some(url) = rpc_url {
        return Ok(vec![url]);
    }
    let chain = crate::feed_chains::feed_chain(contract_address).ok_or_else(|| {
        format!(
            "Unknown feed address: {}. Pass an RPC URL.",
            contract_address
        )
    })?;
    let urls = crate::rpcs::rpcs(chain);
    if urls.is_empty() {
        return Err(format!("No RPC endpoints for chain: {}", chain));
    }
    Ok(urls.to_vec())
}

// ---- JSON-RPC transport -------------------------------------------------------

static RPC_ID_COUNTER: AtomicU64 = AtomicU64::new(1);

/// Perform a single `eth_call` against the given JSON-RPC endpoint.
pub fn eth_call(rpc_url: &str, to: &str, data: &str) -> Result<String, String> {
    let id = RPC_ID_COUNTER.fetch_add(1, Ordering::Relaxed);
    let body = format!(
        r#"{{"jsonrpc":"2.0","id":{},"method":"eth_call","params":[{{"to":"{}","data":"{}"}},"latest"]}}"#,
        id, to, data
    );
    let response = ureq::post(rpc_url)
        .header("Content-Type", "application/json")
        .send(body.as_bytes())
        .map_err(|e| format!("HTTP error: {}", e))?;

    let text = response
        .into_body()
        .read_to_string()
        .map_err(|e| format!("Read error: {}", e))?;

    // Minimal JSON parsing -- find "result" or "error".
    if let Some(idx) = text.find("\"result\":\"") {
        let start = idx + 10; // skip `"result":"`
        if let Some(end) = text[start..].find('"') {
            return Ok(text[start..start + end].to_string());
        }
    }
    if let Some(idx) = text.find("\"error\"") {
        return Err(format!("RPC error: {}", &text[idx..]));
    }
    Err(format!("Unexpected RPC response: {}", text))
}

/// Perform an `eth_call` with fallback across multiple URLs.
fn eth_call_fallback(
    contract_address: &str,
    data: &str,
    rpc_url: Option<&str>,
) -> Result<String, String> {
    let urls = resolve_urls(contract_address, rpc_url)?;
    let sorted = sort_by_health(&urls);
    let mut last_err = String::new();
    for url in &sorted {
        match eth_call(url, contract_address, data) {
            Ok(result) => return Ok(result),
            Err(e) => {
                mark_failed(url);
                last_err = e;
            }
        }
    }
    Err(last_err)
}

// ---- Public API ---------------------------------------------------------------

/// Read the decimals and description from a Chainlink price feed contract.
pub fn read_feed_metadata(
    contract_address: &str,
    rpc_url: Option<&str>,
) -> Result<FeedMetadata, String> {
    let dec_hex = eth_call_fallback(contract_address, SEL_DECIMALS, rpc_url)?;
    let desc_hex = eth_call_fallback(contract_address, SEL_DESCRIPTION, rpc_url)?;
    Ok(parse_feed_metadata(&dec_hex, &desc_hex))
}

/// Read the latest price from a Chainlink feed, formatted as a decimal string.
pub fn read_latest_price(
    contract_address: &str,
    rpc_url: Option<&str>,
) -> Result<RoundData, String> {
    let meta = read_feed_metadata(contract_address, rpc_url)?;
    let hex = eth_call_fallback(contract_address, SEL_LATEST_ROUND_DATA, rpc_url)?;
    let raw = parse_round_data_raw(&hex);
    Ok(format_round(&raw, meta.decimals, &meta.description))
}

/// Read the latest price as raw values (no formatting).
pub fn read_latest_price_raw(
    contract_address: &str,
    rpc_url: Option<&str>,
) -> Result<RoundDataRaw, String> {
    let hex = eth_call_fallback(contract_address, SEL_LATEST_ROUND_DATA, rpc_url)?;
    Ok(parse_round_data_raw(&hex))
}

/// Read the latest price using pre-fetched metadata (saves 2 RPC calls).
pub fn read_latest_price_with_meta(
    contract_address: &str,
    meta: &FeedMetadata,
    rpc_url: Option<&str>,
) -> Result<RoundData, String> {
    let hex = eth_call_fallback(contract_address, SEL_LATEST_ROUND_DATA, rpc_url)?;
    let raw = parse_round_data_raw(&hex);
    Ok(format_round(&raw, meta.decimals, &meta.description))
}

/// Read the price at a specific Chainlink round ID.
pub fn read_price_at_round(
    contract_address: &str,
    round_id: u128,
    rpc_url: Option<&str>,
) -> Result<RoundData, String> {
    let meta = read_feed_metadata(contract_address, rpc_url)?;
    let data_selector = format!("{}{}", SEL_GET_ROUND_DATA, encode_uint(round_id));
    let hex = eth_call_fallback(contract_address, &data_selector, rpc_url)?;
    let raw = parse_round_data_raw(&hex);
    Ok(format_round(&raw, meta.decimals, &meta.description))
}

/// Read the current phase ID from a Chainlink feed proxy.
pub fn read_phase_id(contract_address: &str, rpc_url: Option<&str>) -> Result<u128, String> {
    let hex = eth_call_fallback(contract_address, SEL_PHASE_ID, rpc_url)?;
    Ok(read_word(&hex, 0))
}

/// Read the current aggregator contract address.
pub fn read_aggregator(contract_address: &str, rpc_url: Option<&str>) -> Result<String, String> {
    let hex = eth_call_fallback(contract_address, SEL_AGGREGATOR, rpc_url)?;
    Ok(format!("0x{}", &hex[26..66]))
}

/// Read the aggregator contract address for a specific phase.
pub fn read_phase_aggregator(
    contract_address: &str,
    phase_id: u128,
    rpc_url: Option<&str>,
) -> Result<String, String> {
    let data_selector = format!("{}{}", SEL_PHASE_AGGREGATORS, encode_uint(phase_id));
    let hex = eth_call_fallback(contract_address, &data_selector, rpc_url)?;
    Ok(format!("0x{}", &hex[26..66]))
}

/// Read latest prices from multiple Chainlink feeds using Multicall3.
pub fn read_prices(
    feeds: &HashMap<String, String>,
    rpc_url: Option<&str>,
) -> Result<HashMap<String, RoundData>, String> {
    if feeds.is_empty() {
        return Ok(HashMap::new());
    }
    // Group by chain or single group if rpc_url given
    let groups: Vec<(Vec<(String, String)>, Vec<String>)>;
    if let Some(url) = rpc_url {
        let entries: Vec<_> = feeds.iter().map(|(n, a)| (n.clone(), a.clone())).collect();
        groups = vec![(entries, vec![url.to_string()])];
    } else {
        let mut by_chain: HashMap<&str, Vec<(String, String)>> = HashMap::new();
        for (name, address) in feeds {
            let chain = crate::feed_chains::feed_chain(address)
                .ok_or_else(|| format!("Unknown feed address: {}", address))?;
            by_chain.entry(chain).or_default().push((name.clone(), address.clone()));
        }
        groups = by_chain
            .into_iter()
            .map(|(chain, entries)| {
                let urls: Vec<String> =
                    crate::rpcs::rpcs(chain).iter().map(|s| s.to_string()).collect();
                (entries, urls)
            })
            .collect();
    }
    let mut out = HashMap::new();
    for (group_entries, group_urls) in &groups {
        let url_refs: Vec<&str> = group_urls.iter().map(|s| s.as_str()).collect();
        let calls: Vec<Multicall3Call> = group_entries
            .iter()
            .flat_map(|(_, addr)| {
                [
                    Multicall3Call { target: addr.clone(), call_data: SEL_DECIMALS.to_string() },
                    Multicall3Call {
                        target: addr.clone(),
                        call_data: SEL_DESCRIPTION.to_string(),
                    },
                    Multicall3Call {
                        target: addr.clone(),
                        call_data: SEL_LATEST_ROUND_DATA.to_string(),
                    },
                ]
            })
            .collect();
        let mc = do_multicall(&calls, &url_refs)?;
        for (i, (name, address)) in group_entries.iter().enumerate() {
            let (dec, desc, round) = (&mc[i * 3], &mc[i * 3 + 1], &mc[i * 3 + 2]);
            if !dec.success || !desc.success || !round.success {
                return Err(format!("Multicall sub-call failed for feed: {}", address));
            }
            let decimals = read_word(&dec.data, 0) as u8;
            let description = decode_string(&desc.data);
            let raw = parse_round_data_raw(&round.data);
            out.insert(name.clone(), format_round(&raw, decimals, &description));
        }
    }
    Ok(out)
}

// ---- Tests --------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;

    // ---------- format_price tests ----------

    #[test]
    fn test_format_price_zero() {
        assert_eq!(format_price(0, 8), "0");
    }

    #[test]
    fn test_format_price_no_decimals() {
        assert_eq!(format_price(12345, 0), "12345");
    }

    #[test]
    fn test_format_price_with_decimals() {
        // 196835000000 with 8 decimals => 1968.35
        assert_eq!(format_price(196835000000, 8), "1968.35");
    }

    #[test]
    fn test_format_price_trailing_zeros_stripped() {
        // 100000000 with 8 decimals => 1
        assert_eq!(format_price(100000000, 8), "1");
    }

    #[test]
    fn test_format_price_negative() {
        assert_eq!(format_price(-12345678, 4), "-1234.5678");
    }

    #[test]
    fn test_format_price_small_value() {
        // value smaller than 10^decimals
        assert_eq!(format_price(50, 4), "0.005");
    }

    #[test]
    fn test_format_price_negative_zero_decimals() {
        assert_eq!(format_price(-42, 0), "-42");
    }

    // ---------- read_word / read_word_signed tests ----------

    #[test]
    fn test_read_word_slot0() {
        // "0x" + 64 hex zeros with last byte = 0x08
        let hex = format!("0x{:064x}", 8u128);
        assert_eq!(read_word(&hex, 0), 8);
    }

    #[test]
    fn test_read_word_slot1() {
        let hex = format!("0x{:064x}{:064x}", 1u128, 42u128);
        assert_eq!(read_word(&hex, 0), 1);
        assert_eq!(read_word(&hex, 1), 42);
    }

    #[test]
    fn test_read_word_signed_positive() {
        let hex = format!("0x{:064x}", 12345u128);
        assert_eq!(read_word_signed(&hex, 0), 12345);
    }

    #[test]
    fn test_read_word_signed_negative() {
        // -1 in 256-bit two's complement is 64 f's
        let hex = format!("0x{}", "f".repeat(64));
        assert_eq!(read_word_signed(&hex, 0), -1);
    }

    #[test]
    fn test_read_word_signed_negative_small() {
        // -100 in 256-bit two's complement
        // i128 representation: low 128 bits of (2^256 - 100)
        // The high 128 bits are all f's, low 128 bits = 2^128 - 100
        let val_low = (u128::MAX - 99) as u128; // 2^128 - 100
        let hex = format!("0x{}{:032x}", "f".repeat(32), val_low);
        assert_eq!(read_word_signed(&hex, 0), -100);
    }

    // ---------- decode_string tests ----------

    #[test]
    fn test_decode_string() {
        // ABI-encoded "ETH / USD"
        // slot 0: offset = 0x20 (32)
        // at byte 32: length = 9
        // then: "ETH / USD" in hex = 455448202f20555344
        let offset = format!("{:064x}", 32u128);
        let length = format!("{:064x}", 9u128);
        let data_hex = "455448202f20555344";
        // pad data to 32 bytes
        let data_padded = format!("{:0<64}", data_hex);
        let hex = format!("0x{}{}{}", offset, length, data_padded);
        assert_eq!(decode_string(&hex), "ETH / USD");
    }

    // ---------- encode_uint tests ----------

    #[test]
    fn test_encode_uint_zero() {
        assert_eq!(encode_uint(0), "0".repeat(64));
    }

    #[test]
    fn test_encode_uint_small() {
        let result = encode_uint(255);
        assert_eq!(result.len(), 64);
        assert_eq!(result, format!("{:064x}", 255u128));
    }

    // ---------- parse_address tests ----------

    #[test]
    fn test_parse_address_with_prefix() {
        assert_eq!(
            parse_address("0xABCdef1234567890abcdef1234567890ABCDEF12"),
            "0xabcdef1234567890abcdef1234567890abcdef12"
        );
    }

    #[test]
    fn test_parse_address_without_prefix() {
        assert_eq!(
            parse_address("ABCdef1234567890abcdef1234567890ABCDEF12"),
            "0xabcdef1234567890abcdef1234567890abcdef12"
        );
    }

    // ---------- parse_round_data_raw tests ----------

    #[test]
    fn test_parse_round_data_raw() {
        // Build a fake response with 5 slots
        let round_id = 100u128;
        let answer = 196835000000u128; // positive
        let started_at = 1700000000u128;
        let updated_at = 1700000060u128;
        let answered_in_round = 100u128;
        let hex = format!(
            "0x{:064x}{:064x}{:064x}{:064x}{:064x}",
            round_id, answer, started_at, updated_at, answered_in_round
        );
        let raw = parse_round_data_raw(&hex);
        assert_eq!(raw.round_id, 100);
        assert_eq!(raw.answer, 196835000000);
        assert_eq!(raw.started_at, 1700000000);
        assert_eq!(raw.updated_at, 1700000060);
        assert_eq!(raw.answered_in_round, 100);
    }

    // ---------- format_round tests ----------

    #[test]
    fn test_format_round() {
        let raw = RoundDataRaw {
            round_id: 42,
            answer: 196835000000,
            started_at: 1700000000,
            updated_at: 1700000060,
            answered_in_round: 42,
        };
        let rd = format_round(&raw, 8, "ETH / USD");
        assert_eq!(rd.round_id, 42);
        assert_eq!(rd.answer, "1968.35");
        assert_eq!(rd.started_at, 1700000000);
        assert_eq!(rd.updated_at, 1700000060);
        assert_eq!(rd.answered_in_round, 42);
        assert_eq!(rd.description, "ETH / USD");
    }

    // ---------- parse_feed_metadata tests ----------

    #[test]
    fn test_parse_feed_metadata() {
        let decimals_hex = format!("0x{:064x}", 8u128);

        // Build ABI-encoded string "BTC / USD"
        let offset = format!("{:064x}", 32u128);
        let length = format!("{:064x}", 9u128);
        let data_hex = "425443202f20555344"; // "BTC / USD"
        let data_padded = format!("{:0<64}", data_hex);
        let description_hex = format!("0x{}{}{}", offset, length, data_padded);

        let meta = parse_feed_metadata(&decimals_hex, &description_hex);
        assert_eq!(meta.decimals, 8);
        assert_eq!(meta.description, "BTC / USD");
    }

    // ---------- selector constant tests ----------

    #[test]
    fn test_selector_constants() {
        assert_eq!(SEL_DECIMALS, "0x313ce567");
        assert_eq!(SEL_DESCRIPTION, "0x7284e416");
        assert_eq!(SEL_LATEST_ROUND_DATA, "0xfeaf968c");
        assert_eq!(SEL_GET_ROUND_DATA, "0x9a6fc8f5");
        assert_eq!(SEL_PHASE_ID, "0x58303b10");
        assert_eq!(SEL_PHASE_AGGREGATORS, "0xc1597304");
        assert_eq!(SEL_AGGREGATOR, "0x245a7bfc");
    }

    // ---------- encode_uint round-trip ----------

    #[test]
    fn test_encode_uint_roundtrip() {
        let val = 18446744073709551615u128; // u64::MAX
        let encoded = encode_uint(val);
        let decoded = u128::from_str_radix(&encoded, 16).unwrap();
        assert_eq!(decoded, val);
    }

    // ---------- edge cases ----------

    #[test]
    fn test_format_price_one_wei() {
        // 1 with 18 decimals => 0.000000000000000001
        assert_eq!(format_price(1, 18), "0.000000000000000001");
    }

    #[test]
    fn test_format_price_exact_power() {
        // 10^8 with 8 decimals = 1
        assert_eq!(format_price(100_000_000, 8), "1");
    }

    #[test]
    fn test_read_word_large_value() {
        let val = u128::MAX;
        let hex = format!("0x{:064x}", val);
        assert_eq!(read_word(&hex, 0), val);
    }

    #[test]
    fn test_decode_string_empty() {
        // Empty string: offset=32, length=0
        let offset = format!("{:064x}", 32u128);
        let length = format!("{:064x}", 0u128);
        let hex = format!("0x{}{}", offset, length);
        assert_eq!(decode_string(&hex), "");
    }

    #[test]
    fn test_parse_round_data_raw_all_zeros() {
        let hex = format!("0x{}", "0".repeat(64 * 5));
        let raw = parse_round_data_raw(&hex);
        assert_eq!(raw.round_id, 0);
        assert_eq!(raw.answer, 0);
        assert_eq!(raw.started_at, 0);
        assert_eq!(raw.updated_at, 0);
        assert_eq!(raw.answered_in_round, 0);
    }

    // ── Live RPC tests (run with: cargo test -- --ignored) ──────

    #[test]
    #[ignore]
    fn test_live_ethereum_eth_usd() {
        let data = read_latest_price("0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419", None)
            .expect("RPC call failed");
        assert_eq!(data.description, "ETH / USD");
        let price: f64 = data.answer.parse().unwrap();
        assert!(price > 0.0, "price should be positive, got {}", price);
        println!("Ethereum ETH/USD: {}", data.answer);
    }

    #[test]
    #[ignore]
    fn test_live_polygon_btc_usd() {
        let data = read_latest_price("0xc907E116054Ad103354f2D350FD2514433D57F6f", None)
            .expect("RPC call failed");
        assert_eq!(data.description, "BTC / USD");
        let price: f64 = data.answer.parse().unwrap();
        assert!(price > 0.0);
        println!("Polygon BTC/USD: {}", data.answer);
    }

    #[test]
    #[ignore]
    fn test_live_arbitrum_eth_usd() {
        let data = read_latest_price("0x639Fe6ab55C921f74e7fac1ee960C0B6293ba612", None)
            .expect("RPC call failed");
        assert_eq!(data.description, "ETH / USD");
        let price: f64 = data.answer.parse().unwrap();
        assert!(price > 0.0);
        println!("Arbitrum ETH/USD: {}", data.answer);
    }

    #[test]
    #[ignore]
    fn test_live_base_eth_usd() {
        let data = read_latest_price("0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70", None)
            .expect("RPC call failed");
        assert_eq!(data.description, "ETH / USD");
        let price: f64 = data.answer.parse().unwrap();
        assert!(price > 0.0);
        println!("Base ETH/USD: {}", data.answer);
    }
}
