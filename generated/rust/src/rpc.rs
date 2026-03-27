//! Chainlink price feed RPC client -- reads on-chain data via JSON-RPC eth_call.

use std::collections::HashMap;
use std::sync::atomic::{AtomicU64, Ordering};

// ---- Function selectors -------------------------------------------------------

pub const SEL_DECIMALS: &str = "0x313ce567";
pub const SEL_DESCRIPTION: &str = "0x7284e416";
pub const SEL_LATEST_ROUND_DATA: &str = "0xfeaf968c";
pub const SEL_GET_ROUND_DATA: &str = "0x9a6fc8f5";
pub const SEL_PHASE_ID: &str = "0x58303b10";
pub const SEL_PHASE_AGGREGATORS: &str = "0xc1597304";
pub const SEL_AGGREGATOR: &str = "0x245a7bfc";

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
        return if negative {
            format!("-{}", s)
        } else {
            s
        };
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

// ---- Public API ---------------------------------------------------------------

/// Read the decimals and description from a Chainlink price feed contract.
pub fn read_feed_metadata(rpc_url: &str, contract_address: &str) -> Result<FeedMetadata, String> {
    let dec_hex = eth_call(rpc_url, contract_address, SEL_DECIMALS)?;
    let desc_hex = eth_call(rpc_url, contract_address, SEL_DESCRIPTION)?;
    Ok(parse_feed_metadata(&dec_hex, &desc_hex))
}

/// Read the latest price from a Chainlink feed, formatted as a decimal string.
pub fn read_latest_price(
    rpc_url: &str,
    contract_address: &str,
) -> Result<RoundData, String> {
    let meta = read_feed_metadata(rpc_url, contract_address)?;
    let hex = eth_call(rpc_url, contract_address, SEL_LATEST_ROUND_DATA)?;
    let raw = parse_round_data_raw(&hex);
    Ok(format_round(&raw, meta.decimals, &meta.description))
}

/// Read the latest price as raw values (no formatting).
pub fn read_latest_price_raw(
    rpc_url: &str,
    contract_address: &str,
) -> Result<RoundDataRaw, String> {
    let hex = eth_call(rpc_url, contract_address, SEL_LATEST_ROUND_DATA)?;
    Ok(parse_round_data_raw(&hex))
}

/// Read the latest price using pre-fetched metadata (saves 2 RPC calls).
pub fn read_latest_price_with_meta(
    rpc_url: &str,
    contract_address: &str,
    meta: &FeedMetadata,
) -> Result<RoundData, String> {
    let hex = eth_call(rpc_url, contract_address, SEL_LATEST_ROUND_DATA)?;
    let raw = parse_round_data_raw(&hex);
    Ok(format_round(&raw, meta.decimals, &meta.description))
}

/// Read the price at a specific Chainlink round ID.
pub fn read_price_at_round(
    rpc_url: &str,
    contract_address: &str,
    round_id: u128,
) -> Result<RoundData, String> {
    let meta = read_feed_metadata(rpc_url, contract_address)?;
    let data_selector = format!("{}{}", SEL_GET_ROUND_DATA, encode_uint(round_id));
    let hex = eth_call(rpc_url, contract_address, &data_selector)?;
    let raw = parse_round_data_raw(&hex);
    Ok(format_round(&raw, meta.decimals, &meta.description))
}

/// Read the current phase ID from a Chainlink feed proxy.
pub fn read_phase_id(rpc_url: &str, contract_address: &str) -> Result<u128, String> {
    let hex = eth_call(rpc_url, contract_address, SEL_PHASE_ID)?;
    Ok(read_word(&hex, 0))
}

/// Read the current aggregator contract address.
pub fn read_aggregator(rpc_url: &str, contract_address: &str) -> Result<String, String> {
    let hex = eth_call(rpc_url, contract_address, SEL_AGGREGATOR)?;
    // Address is the low 20 bytes of the 32-byte word: chars 26..66 (after "0x").
    Ok(format!("0x{}", &hex[26..66]))
}

/// Read the aggregator contract address for a specific phase.
pub fn read_phase_aggregator(
    rpc_url: &str,
    contract_address: &str,
    phase_id: u128,
) -> Result<String, String> {
    let data_selector = format!("{}{}", SEL_PHASE_AGGREGATORS, encode_uint(phase_id));
    let hex = eth_call(rpc_url, contract_address, &data_selector)?;
    Ok(format!("0x{}", &hex[26..66]))
}

/// Read latest prices from multiple Chainlink feeds.
pub fn read_prices(
    rpc_url: &str,
    feeds: &HashMap<String, String>,
) -> Result<HashMap<String, RoundData>, String> {
    let mut out = HashMap::new();
    for (name, address) in feeds {
        let round = read_latest_price(rpc_url, address)?;
        out.insert(name.clone(), round);
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
        assert_eq!(
            format_price(1, 18),
            "0.000000000000000001"
        );
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
}
