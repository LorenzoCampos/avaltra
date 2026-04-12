package auth

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
)

// GenerateToken creates a cryptographically secure random token.
// It returns:
//   - rawToken: 64-char hex string (32 random bytes) — send this to the user
//   - hashedToken: 64-char hex SHA-256 of rawToken — store this in the database
//   - error: non-nil if crypto/rand fails
//
// Never store rawToken in the database. Store only hashedToken.
// On validation, call HashToken(receivedRaw) and compare against the stored hash.
func GenerateToken() (rawToken string, hashedToken string, err error) {
	b := make([]byte, 32)
	if _, err = rand.Read(b); err != nil {
		return "", "", fmt.Errorf("tokens: generate random bytes: %w", err)
	}
	rawToken = hex.EncodeToString(b)
	hashedToken = HashToken(rawToken)
	return rawToken, hashedToken, nil
}

// HashToken computes the SHA-256 hash of rawToken and returns it as a 64-char hex string.
// Use this when validating a token received from the user:
//
//	storedHash == HashToken(receivedRaw)
func HashToken(rawToken string) string {
	sum := sha256.Sum256([]byte(rawToken))
	return hex.EncodeToString(sum[:])
}
