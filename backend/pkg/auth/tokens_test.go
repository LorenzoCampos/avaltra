package auth

import (
	"encoding/hex"
	"testing"
)

// TestGenerateToken_ReturnsNonEmptyStrings verifies that GenerateToken returns
// a 64-char hex raw token and a 64-char hex hash, with no error.
func TestGenerateToken_ReturnsNonEmptyStrings(t *testing.T) {
	raw, hash, err := GenerateToken()
	if err != nil {
		t.Fatalf("GenerateToken() returned error: %v", err)
	}

	// 32 bytes → hex = 64 chars
	if len(raw) != 64 {
		t.Errorf("raw token length = %d, want 64 (32 bytes hex-encoded)", len(raw))
	}
	// SHA-256 = 32 bytes → hex = 64 chars
	if len(hash) != 64 {
		t.Errorf("hash length = %d, want 64 (SHA-256 hex-encoded)", len(hash))
	}
}

// TestGenerateToken_RawIsValidHex verifies the raw token is valid hexadecimal.
func TestGenerateToken_RawIsValidHex(t *testing.T) {
	raw, _, err := GenerateToken()
	if err != nil {
		t.Fatalf("GenerateToken() returned error: %v", err)
	}

	if _, decodeErr := hex.DecodeString(raw); decodeErr != nil {
		t.Errorf("raw token is not valid hex: %v", decodeErr)
	}
}

// TestGenerateToken_HashMatchesRaw verifies that the returned hash equals
// HashToken(raw) — the SHA-256 round-trip.
func TestGenerateToken_HashMatchesRaw(t *testing.T) {
	raw, hash, err := GenerateToken()
	if err != nil {
		t.Fatalf("GenerateToken() returned error: %v", err)
	}

	expected := HashToken(raw)
	if hash != expected {
		t.Errorf("hash mismatch: GenerateToken returned %q, HashToken(raw) = %q", hash, expected)
	}
}

// TestHashToken_DifferentInputsDifferentHashes verifies that two different tokens
// produce different hashes (collision resistance for reasonable inputs).
func TestHashToken_DifferentInputsDifferentHashes(t *testing.T) {
	h1 := HashToken("aabbccdd")
	h2 := HashToken("11223344")

	if h1 == h2 {
		t.Errorf("different inputs produced same hash: %q", h1)
	}
}

// TestHashToken_SameInputSameHash verifies determinism — same input always produces same hash.
func TestHashToken_SameInputSameHash(t *testing.T) {
	input := "sometoken1234567890abcdef"
	h1 := HashToken(input)
	h2 := HashToken(input)

	if h1 != h2 {
		t.Errorf("HashToken is not deterministic: %q != %q", h1, h2)
	}
}

// TestHashToken_Returns64CharHex verifies the hash is always 64-char hex (SHA-256).
func TestHashToken_Returns64CharHex(t *testing.T) {
	hash := HashToken("any-input")
	if len(hash) != 64 {
		t.Errorf("HashToken length = %d, want 64", len(hash))
	}
	if _, err := hex.DecodeString(hash); err != nil {
		t.Errorf("HashToken output is not valid hex: %v", err)
	}
}

// TestGenerateToken_UniqueOnEachCall verifies tokens are different across calls
// (crypto/rand should produce unique values).
func TestGenerateToken_UniqueOnEachCall(t *testing.T) {
	raw1, _, err1 := GenerateToken()
	raw2, _, err2 := GenerateToken()

	if err1 != nil || err2 != nil {
		t.Fatalf("GenerateToken errors: %v, %v", err1, err2)
	}
	if raw1 == raw2 {
		t.Error("two calls to GenerateToken produced identical raw tokens — crypto/rand may not be working")
	}
}
