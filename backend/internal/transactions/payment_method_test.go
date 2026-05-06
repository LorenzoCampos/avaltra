package transactions

import (
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestPaymentMethodCatalog(t *testing.T) {
	tests := []struct {
		name  string
		value string
		want  bool
	}{
		{name: "cash is valid", value: "cash", want: true},
		{name: "digital wallet is valid", value: "digital_wallet", want: true},
		{name: "unsupported value is rejected", value: "crypto", want: false},
		{name: "empty string is rejected", value: "", want: false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := IsValidPaymentMethod(tt.value); got != tt.want {
				t.Fatalf("IsValidPaymentMethod(%q) = %v, want %v", tt.value, got, tt.want)
			}
		})
	}
}

func TestNullableStringFieldUnmarshalJSON(t *testing.T) {
	tests := []struct {
		name       string
		payload    string
		wantSet    bool
		wantValid  bool
		wantValue  string
		wantErr    bool
	}{
		{name: "omitted field stays unset", payload: `{}`, wantSet: false, wantValid: false, wantValue: ""},
		{name: "null field is explicit clear", payload: `{"payment_method":null}`, wantSet: true, wantValid: false, wantValue: ""},
		{name: "string field stores value", payload: `{"payment_method":"cash"}`, wantSet: true, wantValid: true, wantValue: "cash"},
		{name: "non string is rejected", payload: `{"payment_method":123}`, wantErr: true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			var payload struct {
				PaymentMethod NullableStringField `json:"payment_method"`
			}

			err := json.Unmarshal([]byte(tt.payload), &payload)
			if (err != nil) != tt.wantErr {
				t.Fatalf("json.Unmarshal() error = %v, wantErr %v", err, tt.wantErr)
			}
			if tt.wantErr {
				return
			}

			if payload.PaymentMethod.Set != tt.wantSet {
				t.Fatalf("Set = %v, want %v", payload.PaymentMethod.Set, tt.wantSet)
			}
			if payload.PaymentMethod.Valid != tt.wantValid {
				t.Fatalf("Valid = %v, want %v", payload.PaymentMethod.Valid, tt.wantValid)
			}
			if payload.PaymentMethod.Value != tt.wantValue {
				t.Fatalf("Value = %q, want %q", payload.PaymentMethod.Value, tt.wantValue)
			}
		})
	}
}

func TestResolvePaymentMethodUpdate(t *testing.T) {
	existing := "credit_card"

	tests := []struct {
		name      string
		field     NullableStringField
		wantSet   bool
		wantValue *string
		wantErr   bool
	}{
		{name: "omitted keeps current value", field: NullableStringField{}, wantSet: false, wantValue: nil},
		{name: "explicit null clears value", field: NullableStringField{Set: true, Valid: false}, wantSet: true, wantValue: nil},
		{name: "valid value replaces current", field: NullableStringField{Set: true, Valid: true, Value: "cash"}, wantSet: true, wantValue: stringPtr("cash")},
		{name: "invalid value is rejected", field: NullableStringField{Set: true, Valid: true, Value: "crypto"}, wantErr: true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			gotSet, gotValue, err := ResolvePaymentMethodUpdate(&existing, tt.field)
			if (err != nil) != tt.wantErr {
				t.Fatalf("ResolvePaymentMethodUpdate() error = %v, wantErr %v", err, tt.wantErr)
			}
			if tt.wantErr {
				return
			}
			if gotSet != tt.wantSet {
				t.Fatalf("set = %v, want %v", gotSet, tt.wantSet)
			}
			if !equalStringPtr(gotValue, tt.wantValue) {
				t.Fatalf("value = %v, want %v", gotValue, tt.wantValue)
			}
		})
	}
}

func TestPaymentMethodMigrationExists(t *testing.T) {
	migrationPath := filepath.Join("..", "..", "migrations", "021_add_payment_method_to_transactions.up.sql")
	content, err := os.ReadFile(migrationPath)
	if err != nil {
		t.Fatalf("expected migration file to exist: %v", err)
	}

	text := string(content)
	assertContains(t, text, "ALTER TABLE expenses")
	assertContains(t, text, "ADD COLUMN payment_method TEXT NULL")
	assertContains(t, text, "ALTER TABLE incomes")
	assertContains(t, text, "CHECK")
	assertContains(t, text, "digital_wallet")
	assertContains(t, text, "other")
}

func assertContains(t *testing.T, text string, want string) {
	t.Helper()
	if !strings.Contains(text, want) {
		t.Fatalf("expected %q to contain %q", text, want)
	}
}

func stringPtr(value string) *string {
	return &value
}

func equalStringPtr(a *string, b *string) bool {
	if a == nil || b == nil {
		return a == b
	}
	return *a == *b
}
