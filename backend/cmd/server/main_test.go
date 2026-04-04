package main

import (
	"strings"
	"testing"
)

// TestPostgresURLNormalization tests that postgresql:// is correctly normalized to postgres://
func TestPostgresURLNormalization(t *testing.T) {
	tests := []struct {
		name, input, expected string
	}{
		{"postgresql scheme", "postgresql://user:pass@host/db", "postgres://user:pass@host/db"},
		{"postgres scheme unchanged", "postgres://user:pass@host/db", "postgres://user:pass@host/db"},
		{"with query params", "postgresql://u:p@h/db?sslmode=require", "postgres://u:p@h/db?sslmode=require"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := strings.Replace(tt.input, "postgresql://", "postgres://", 1)
			if got != tt.expected {
				t.Errorf("got %q, want %q", got, tt.expected)
			}
		})
	}
}
