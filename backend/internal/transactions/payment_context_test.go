package transactions

import (
	"context"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

func TestPaymentContextTypeCatalogs(t *testing.T) {
	tests := []struct {
		name           string
		containerKind  string
		instrumentKind string
		wantContainer  bool
		wantInstrument bool
	}{
		{name: "bank container and debit card instrument are valid", containerKind: "bank", instrumentKind: "debit_card", wantContainer: true, wantInstrument: true},
		{name: "wallet container and transfer instrument are valid", containerKind: "wallet", instrumentKind: "transfer", wantContainer: true, wantInstrument: true},
		{name: "unknown kinds are rejected", containerKind: "crypto_exchange", instrumentKind: "prepaid_card", wantContainer: false, wantInstrument: false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := IsValidPaymentContainerKind(tt.containerKind); got != tt.wantContainer {
				t.Fatalf("IsValidPaymentContainerKind(%q) = %v, want %v", tt.containerKind, got, tt.wantContainer)
			}
			if got := IsValidPaymentInstrumentKind(tt.instrumentKind); got != tt.wantInstrument {
				t.Fatalf("IsValidPaymentInstrumentKind(%q) = %v, want %v", tt.instrumentKind, got, tt.wantInstrument)
			}
		})
	}
}

type paymentContextRow struct {
	values []any
	err    error
}

func (r paymentContextRow) Scan(dest ...any) error {
	if r.err != nil {
		return r.err
	}
	for i := range dest {
		switch d := dest[i].(type) {
		case *bool:
			*d = r.values[i].(bool)
		case **string:
			*d = r.values[i].(*string)
		}
	}
	return nil
}

type paymentContextStore struct {
	rows []paymentContextRow
}

func (s *paymentContextStore) QueryRow(_ context.Context, _ string, _ ...any) pgx.Row {
	row := s.rows[0]
	s.rows = s.rows[1:]
	return row
}

func TestValidateActivePaymentContext(t *testing.T) {
	accountID := "account-1"
	containerID := uuid.New().String()
	instrumentID := uuid.New().String()
	otherContainerID := uuid.New().String()

	tests := []struct {
		name         string
		containerID  *string
		instrumentID *string
		rows         []paymentContextRow
		wantErr      string
	}{
		{name: "omitted context is accepted"},
		{name: "active matching container and instrument are accepted", containerID: &containerID, instrumentID: &instrumentID, rows: []paymentContextRow{{values: []any{true}}, {values: []any{&containerID}}}},
		{name: "inactive container is rejected", containerID: &containerID, rows: []paymentContextRow{{values: []any{false}}}, wantErr: "source_container_id does not belong to this account or is inactive"},
		{name: "instrument backed by different container is rejected", containerID: &containerID, instrumentID: &instrumentID, rows: []paymentContextRow{{values: []any{true}}, {values: []any{&otherContainerID}}}, wantErr: "source_instrument_id is not backed by source_container_id"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			store := &paymentContextStore{rows: tt.rows}
			err := ValidateActivePaymentContext(context.Background(), store, accountID, PaymentContextValidationInput{
				ContainerID:     tt.containerID,
				InstrumentID:    tt.instrumentID,
				ContainerField:  "source_container_id",
				InstrumentField: "source_instrument_id",
			})
			if tt.wantErr == "" {
				if err != nil {
					t.Fatalf("ValidateActivePaymentContext() error = %v, want nil", err)
				}
				return
			}
			if err == nil || err.Error() != tt.wantErr {
				t.Fatalf("ValidateActivePaymentContext() error = %v, want %q", err, tt.wantErr)
			}
		})
	}
}

func TestResolvePaymentContextFinalPairForUpdateRejectsPartialContainerMismatch(t *testing.T) {
	accountID := "account-1"
	recordID := uuid.New().String()
	oldContainerID := uuid.New().String()
	newContainerID := uuid.New().String()
	instrumentID := uuid.New().String()

	store := &paymentContextStore{rows: []paymentContextRow{
		{values: []any{&oldContainerID, &instrumentID}},
		{values: []any{true}},
		{values: []any{&oldContainerID}},
	}}

	_, _, _, _, err := ResolvePaymentContextFinalPairForUpdate(context.Background(), store, accountID, PaymentContextUpdateInput{
		RecordTable:      "recurring_expenses",
		RecordID:         recordID,
		ContainerColumn:  "source_container_id",
		InstrumentColumn: "source_instrument_id",
		ContainerField:   "source_container_id",
		InstrumentField:  "source_instrument_id",
		ContainerUpdate:  NullableStringField{Set: true, Valid: true, Value: newContainerID},
	})

	if err == nil || err.Error() != "source_instrument_id is not backed by source_container_id" {
		t.Fatalf("ResolvePaymentContextFinalPairForUpdate() error = %v, want backing mismatch", err)
	}
}

func TestValidatePaymentContainerKind(t *testing.T) {
	tests := []struct {
		name    string
		kind    string
		wantErr string
	}{
		{name: "bank container kind is accepted", kind: "bank"},
		{name: "wallet container kind is accepted", kind: "wallet"},
		{name: "unsupported container kind is rejected", kind: "crypto_exchange", wantErr: "payment container kind must be one of"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := ValidatePaymentContainerKind(tt.kind)
			if tt.wantErr == "" {
				if err != nil {
					t.Fatalf("ValidatePaymentContainerKind(%q) error = %v, want nil", tt.kind, err)
				}
				return
			}
			if err == nil || !strings.Contains(err.Error(), tt.wantErr) {
				t.Fatalf("ValidatePaymentContainerKind(%q) error = %v, want containing %q", tt.kind, err, tt.wantErr)
			}
		})
	}
}

func TestValidatePaymentInstrumentBackingContainer(t *testing.T) {
	backingID := uuid.New()
	tests := []struct {
		name      string
		kind      string
		backingID *uuid.UUID
		wantErr   string
	}{
		{name: "credit card requires backing container", kind: "credit_card", wantErr: ErrBackingContainerRequired.Error()},
		{name: "debit card requires backing container", kind: "debit_card", wantErr: ErrBackingContainerRequired.Error()},
		{name: "card with backing container is accepted", kind: "credit_card", backingID: &backingID},
		{name: "cash instrument does not require backing container", kind: "cash"},
		{name: "unsupported instrument kind is rejected", kind: "prepaid_card", backingID: &backingID, wantErr: "payment instrument kind must be one of"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := ValidatePaymentInstrumentBackingContainer(tt.kind, tt.backingID)
			if tt.wantErr == "" {
				if err != nil {
					t.Fatalf("ValidatePaymentInstrumentBackingContainer() error = %v, want nil", err)
				}
				return
			}
			if err == nil || !strings.Contains(err.Error(), tt.wantErr) {
				t.Fatalf("ValidatePaymentInstrumentBackingContainer() error = %v, want containing %q", err, tt.wantErr)
			}
		})
	}
}

func TestRejectSplitPaymentPayload(t *testing.T) {
	first := uuid.New()
	second := uuid.New()
	tests := []struct {
		name        string
		container   *uuid.UUID
		instrument  *uuid.UUID
		containers  []uuid.UUID
		instruments []uuid.UUID
		wantErr     string
	}{
		{name: "single container and instrument is accepted", container: &first, instrument: &second},
		{name: "multiple containers are rejected", containers: []uuid.UUID{first, second}, wantErr: ErrSplitPaymentNotSupported.Error()},
		{name: "multiple instruments are rejected", instruments: []uuid.UUID{first, second}, wantErr: ErrSplitPaymentNotSupported.Error()},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := RejectSplitPaymentPayload(PaymentAssociationInput{
				ContainerID:   tt.container,
				InstrumentID:  tt.instrument,
				ContainerIDs:  tt.containers,
				InstrumentIDs: tt.instruments,
			})
			if tt.wantErr == "" {
				if err != nil {
					t.Fatalf("RejectSplitPaymentPayload() error = %v, want nil", err)
				}
				return
			}
			if err == nil || err.Error() != tt.wantErr {
				t.Fatalf("RejectSplitPaymentPayload() error = %v, want %q", err, tt.wantErr)
			}
		})
	}
}

func TestPaymentContainersMigrationExists(t *testing.T) {
	upPath := filepath.Join("..", "..", "migrations", "023_create_payment_containers.up.sql")
	downPath := filepath.Join("..", "..", "migrations", "023_create_payment_containers.down.sql")

	upContent, err := os.ReadFile(upPath)
	if err != nil {
		t.Fatalf("expected up migration to exist: %v", err)
	}
	downContent, err := os.ReadFile(downPath)
	if err != nil {
		t.Fatalf("expected down migration to exist: %v", err)
	}

	upText := string(upContent)
	assertContains(t, upText, "DEFAULT uuid_generate_v4()")
	assertContains(t, upText, "CREATE TABLE payment_institutions")
	assertContains(t, upText, "CREATE TABLE payment_containers")
	assertContains(t, upText, "CREATE TABLE payment_instruments")
	assertContains(t, upText, "source_container_id UUID NULL")
	assertContains(t, upText, "destination_instrument_id UUID NULL")
	assertContains(t, upText, "backing_container_id UUID")
	assertContains(t, upText, "credit_card")

	downText := string(downContent)
	assertContains(t, downText, "DROP TABLE IF EXISTS payment_instruments")
	assertContains(t, downText, "DROP TABLE IF EXISTS payment_containers")
}

func TestRecurringPaymentContextMigrationExists(t *testing.T) {
	upPath := filepath.Join("..", "..", "migrations", "024_add_recurring_payment_context.up.sql")
	downPath := filepath.Join("..", "..", "migrations", "024_add_recurring_payment_context.down.sql")

	upContent, err := os.ReadFile(upPath)
	if err != nil {
		t.Fatalf("expected up migration to exist: %v", err)
	}
	downContent, err := os.ReadFile(downPath)
	if err != nil {
		t.Fatalf("expected down migration to exist: %v", err)
	}

	upText := string(upContent)
	assertContains(t, upText, "ALTER TABLE recurring_expenses")
	assertContains(t, upText, "source_container_id UUID NULL")
	assertContains(t, upText, "source_instrument_id UUID NULL")
	assertContains(t, upText, "ALTER TABLE recurring_incomes")
	assertContains(t, upText, "destination_container_id UUID NULL")
	assertContains(t, upText, "destination_instrument_id UUID NULL")
	assertContains(t, upText, "REFERENCES payment_containers(id)")
	assertContains(t, upText, "REFERENCES payment_instruments(id)")

	downText := string(downContent)
	assertContains(t, downText, "DROP COLUMN IF EXISTS source_container_id")
	assertContains(t, downText, "DROP COLUMN IF EXISTS destination_instrument_id")
}
