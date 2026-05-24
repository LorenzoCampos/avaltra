package expenses

import (
	"context"
	"fmt"

	"github.com/LorenzoCampos/avaltra/internal/transactions"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

type expensePaymentContextRequest struct {
	ContainerID  *string
	InstrumentID *string
}

type expensePaymentContextUpdate struct {
	ContainerID  transactions.NullableStringField
	InstrumentID transactions.NullableStringField
}

func validateExpensePaymentContext(ctx context.Context, db expenseStore, accountID any, input expensePaymentContextRequest) error {
	var containerID *string
	if input.ContainerID != nil {
		if _, err := uuid.Parse(*input.ContainerID); err != nil {
			return fmt.Errorf("source_container_id must be a valid UUID")
		}
		var exists bool
		if err := db.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM payment_containers WHERE id = $1 AND account_id = $2 AND is_active = true)`, *input.ContainerID, accountID).Scan(&exists); err != nil {
			return fmt.Errorf("failed to validate source_container_id")
		}
		if !exists {
			return fmt.Errorf("source_container_id does not belong to this account or is inactive")
		}
		containerID = input.ContainerID
	}

	if input.InstrumentID == nil {
		return nil
	}
	if _, err := uuid.Parse(*input.InstrumentID); err != nil {
		return fmt.Errorf("source_instrument_id must be a valid UUID")
	}

	var backingContainerID *string
	if err := db.QueryRow(ctx, `SELECT backing_container_id FROM payment_instruments WHERE id = $1 AND account_id = $2 AND is_active = true`, *input.InstrumentID, accountID).Scan(&backingContainerID); err != nil {
		if err == pgx.ErrNoRows {
			return fmt.Errorf("source_instrument_id does not belong to this account or is inactive")
		}
		return fmt.Errorf("failed to validate source_instrument_id")
	}
	if containerID != nil && backingContainerID != nil && *backingContainerID != *containerID {
		return fmt.Errorf("source_instrument_id is not backed by source_container_id")
	}
	return nil
}

func requireExpensePaymentContainer(input expensePaymentContextRequest) error {
	if input.ContainerID == nil || *input.ContainerID == "" {
		return fmt.Errorf("source_container_id is required for one-time expenses")
	}
	return nil
}

func resolveExpensePaymentContextUpdate(ctx context.Context, db expenseStore, accountID any, expenseID string, input expensePaymentContextUpdate) (bool, *string, bool, *string, error) {
	containerSet, containerID, err := resolveNullableUUIDField("source_container_id", input.ContainerID)
	if err != nil {
		return false, nil, false, nil, err
	}
	instrumentSet, instrumentID, err := resolveNullableUUIDField("source_instrument_id", input.InstrumentID)
	if err != nil {
		return false, nil, false, nil, err
	}
	if containerSet && !instrumentSet {
		// Instruments are soft-deprecated for primary place-only saves. A current
		// client that saves a source container without an instrument clears any
		// legacy instrument ref instead of preserving stale, mismatched context.
		instrumentSet = true
		instrumentID = nil
	}
	if err := validateExpensePaymentContext(ctx, db, accountID, expensePaymentContextRequest{ContainerID: containerID, InstrumentID: instrumentID}); err != nil {
		return false, nil, false, nil, err
	}
	if err := validateExpensePaymentContextUpdateFinalPair(ctx, db, accountID, expenseID, containerSet, containerID, instrumentSet, instrumentID); err != nil {
		return false, nil, false, nil, err
	}
	return containerSet, containerID, instrumentSet, instrumentID, nil
}

func validateExpenseRequiredPlaceOnUpdate(ctx context.Context, db expenseStore, accountID any, expenseID string, finalExpenseType string, containerSet bool, containerID *string) error {
	if finalExpenseType != "one-time" {
		return nil
	}
	if containerSet {
		if containerID == nil {
			return fmt.Errorf("source_container_id is required for one-time expenses")
		}
		return nil
	}

	var exists bool
	if err := db.QueryRow(ctx, `SELECT EXISTS(
		SELECT 1
		FROM expenses e
		JOIN payment_containers pc ON pc.id = e.source_container_id
		WHERE e.id = $1 AND e.account_id = $2 AND e.deleted_at IS NULL AND pc.account_id = $2 AND pc.is_active = true
	)`, expenseID, accountID).Scan(&exists); err != nil {
		return fmt.Errorf("failed to validate source_container_id")
	}
	if !exists {
		return fmt.Errorf("source_container_id is required for one-time expenses")
	}
	return nil
}

func validateExpensePaymentContextUpdateFinalPair(ctx context.Context, db expenseStore, accountID any, expenseID string, containerSet bool, containerID *string, instrumentSet bool, instrumentID *string) error {
	if containerSet == instrumentSet || (containerSet && containerID == nil) || (instrumentSet && instrumentID == nil) {
		return nil
	}

	var existingContainerID, existingInstrumentID *string
	if err := db.QueryRow(ctx, `SELECT source_container_id, source_instrument_id FROM expenses WHERE id = $1 AND account_id = $2 AND deleted_at IS NULL`, expenseID, accountID).Scan(&existingContainerID, &existingInstrumentID); err != nil {
		if err == pgx.ErrNoRows {
			return fmt.Errorf("expense not found or does not belong to this account")
		}
		return fmt.Errorf("failed to validate existing payment context")
	}

	finalContainerID := existingContainerID
	if containerSet {
		finalContainerID = containerID
	}
	finalInstrumentID := existingInstrumentID
	if instrumentSet {
		finalInstrumentID = instrumentID
	}

	return validateExpensePaymentContextBacking(ctx, db, accountID, finalContainerID, finalInstrumentID)
}

func validateExpensePaymentContextBacking(ctx context.Context, db expenseStore, accountID any, containerID, instrumentID *string) error {
	if containerID == nil || instrumentID == nil {
		return nil
	}
	var backingContainerID *string
	if err := db.QueryRow(ctx, `SELECT backing_container_id FROM payment_instruments WHERE id = $1 AND account_id = $2`, *instrumentID, accountID).Scan(&backingContainerID); err != nil {
		if err == pgx.ErrNoRows {
			return fmt.Errorf("source_instrument_id does not belong to this account")
		}
		return fmt.Errorf("failed to validate source_instrument_id")
	}
	if backingContainerID != nil && *backingContainerID != *containerID {
		return fmt.Errorf("source_instrument_id is not backed by source_container_id")
	}
	return nil
}

func resolveNullableUUIDField(name string, field transactions.NullableStringField) (bool, *string, error) {
	if !field.Set {
		return false, nil, nil
	}
	if !field.Valid {
		return true, nil, nil
	}
	if _, err := uuid.Parse(field.Value); err != nil {
		return false, nil, fmt.Errorf("%s must be a valid UUID", name)
	}
	return true, &field.Value, nil
}
