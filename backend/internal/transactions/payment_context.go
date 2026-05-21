package transactions

import (
	"context"
	"errors"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

var (
	ErrSplitPaymentNotSupported = errors.New("split-payment-not-supported")
	ErrBackingContainerRequired = errors.New("backing-container-required")
)

var paymentContainerKindCatalog = map[string]struct{}{
	"bank":   {},
	"wallet": {},
	"cash":   {},
	"other":  {},
}

var paymentInstrumentKindCatalog = map[string]struct{}{
	"debit_card":  {},
	"credit_card": {},
	"transfer":    {},
	"cash":        {},
	"other":       {},
}

type PaymentAssociationInput struct {
	ContainerID   *uuid.UUID
	InstrumentID  *uuid.UUID
	ContainerIDs  []uuid.UUID
	InstrumentIDs []uuid.UUID
}

type PaymentContextValidationInput struct {
	ContainerID     *string
	InstrumentID    *string
	ContainerField  string
	InstrumentField string
}

type PaymentContextUpdateInput struct {
	RecordTable      string
	RecordID         string
	ContainerColumn  string
	InstrumentColumn string
	ContainerField   string
	InstrumentField  string
	ContainerUpdate  NullableStringField
	InstrumentUpdate NullableStringField
}

type paymentContextQuerier interface {
	QueryRow(ctx context.Context, sql string, args ...any) pgx.Row
}

func IsValidPaymentContainerKind(value string) bool {
	_, ok := paymentContainerKindCatalog[value]
	return ok
}

func IsValidPaymentInstrumentKind(value string) bool {
	_, ok := paymentInstrumentKindCatalog[value]
	return ok
}

func ValidatePaymentContainerKind(value string) error {
	if !IsValidPaymentContainerKind(value) {
		return fmt.Errorf("payment container kind must be one of bank, wallet, cash, other")
	}
	return nil
}

func ValidatePaymentInstrumentBackingContainer(kind string, backingContainerID *uuid.UUID) error {
	if !IsValidPaymentInstrumentKind(kind) {
		return fmt.Errorf("payment instrument kind must be one of debit_card, credit_card, transfer, cash, other")
	}
	if (kind == "credit_card" || kind == "debit_card") && backingContainerID == nil {
		return ErrBackingContainerRequired
	}
	return nil
}

func RejectSplitPaymentPayload(input PaymentAssociationInput) error {
	if len(input.ContainerIDs) > 1 || len(input.InstrumentIDs) > 1 {
		return ErrSplitPaymentNotSupported
	}
	return nil
}

func ValidateActivePaymentContext(ctx context.Context, db paymentContextQuerier, accountID any, input PaymentContextValidationInput) error {
	var containerID *string
	if input.ContainerID != nil {
		if _, err := uuid.Parse(*input.ContainerID); err != nil {
			return fmt.Errorf("%s must be a valid UUID", input.ContainerField)
		}
		var exists bool
		if err := db.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM payment_containers WHERE id = $1 AND account_id = $2 AND is_active = true)`, *input.ContainerID, accountID).Scan(&exists); err != nil {
			return fmt.Errorf("failed to validate %s", input.ContainerField)
		}
		if !exists {
			return fmt.Errorf("%s does not belong to this account or is inactive", input.ContainerField)
		}
		containerID = input.ContainerID
	}

	if input.InstrumentID == nil {
		return nil
	}
	if _, err := uuid.Parse(*input.InstrumentID); err != nil {
		return fmt.Errorf("%s must be a valid UUID", input.InstrumentField)
	}

	var backingContainerID *string
	if err := db.QueryRow(ctx, `SELECT backing_container_id FROM payment_instruments WHERE id = $1 AND account_id = $2 AND is_active = true`, *input.InstrumentID, accountID).Scan(&backingContainerID); err != nil {
		if err == pgx.ErrNoRows {
			return fmt.Errorf("%s does not belong to this account or is inactive", input.InstrumentField)
		}
		return fmt.Errorf("failed to validate %s", input.InstrumentField)
	}
	if containerID != nil && backingContainerID != nil && *backingContainerID != *containerID {
		return fmt.Errorf("%s is not backed by %s", input.InstrumentField, input.ContainerField)
	}
	return nil
}

func ResolvePaymentContextFinalPairForUpdate(ctx context.Context, db paymentContextQuerier, accountID any, input PaymentContextUpdateInput) (bool, *string, bool, *string, error) {
	containerSet, containerID, err := resolvePaymentContextUpdateValue(input.ContainerField, input.ContainerUpdate)
	if err != nil {
		return false, nil, false, nil, err
	}
	instrumentSet, instrumentID, err := resolvePaymentContextUpdateValue(input.InstrumentField, input.InstrumentUpdate)
	if err != nil {
		return false, nil, false, nil, err
	}
	if !containerSet && !instrumentSet {
		return false, nil, false, nil, nil
	}

	var existingContainerID, existingInstrumentID *string
	query := fmt.Sprintf(
		`SELECT %s, %s FROM %s WHERE id = $1 AND account_id = $2`,
		input.ContainerColumn,
		input.InstrumentColumn,
		input.RecordTable,
	)
	if err := db.QueryRow(ctx, query, input.RecordID, accountID).Scan(&existingContainerID, &existingInstrumentID); err != nil {
		if err == pgx.ErrNoRows {
			return false, nil, false, nil, fmt.Errorf("record not found or does not belong to this account")
		}
		return false, nil, false, nil, fmt.Errorf("failed to validate existing payment context")
	}

	finalContainerID := existingContainerID
	if containerSet {
		finalContainerID = containerID
	}
	finalInstrumentID := existingInstrumentID
	if instrumentSet {
		finalInstrumentID = instrumentID
	}
	if containerSet && !instrumentSet {
		// Instruments are soft-deprecated for primary place-only saves. When a
		// current client saves a new container without an instrument, clear any
		// legacy instrument ref instead of validating it as part of the new context.
		instrumentSet = true
		instrumentID = nil
		finalInstrumentID = nil
	}

	if err := ValidateActivePaymentContext(ctx, db, accountID, PaymentContextValidationInput{
		ContainerID:     finalContainerID,
		InstrumentID:    finalInstrumentID,
		ContainerField:  input.ContainerField,
		InstrumentField: input.InstrumentField,
	}); err != nil {
		return false, nil, false, nil, err
	}

	return containerSet, containerID, instrumentSet, instrumentID, nil
}

func resolvePaymentContextUpdateValue(name string, field NullableStringField) (bool, *string, error) {
	if !field.Set {
		return false, nil, nil
	}
	if !field.Valid || field.Value == "" {
		return true, nil, nil
	}
	if _, err := uuid.Parse(field.Value); err != nil {
		return false, nil, fmt.Errorf("%s must be a valid UUID", name)
	}
	return true, &field.Value, nil
}
