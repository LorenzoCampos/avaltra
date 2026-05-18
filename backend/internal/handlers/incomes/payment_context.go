package incomes

import (
	"context"
	"fmt"

	"github.com/LorenzoCampos/avaltra/internal/transactions"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

type incomePaymentContextRequest struct {
	ContainerID  *string
	InstrumentID *string
}

type incomePaymentContextUpdate struct {
	ContainerID  transactions.NullableStringField
	InstrumentID transactions.NullableStringField
}

func validateIncomePaymentContext(ctx context.Context, db incomeStore, accountID any, input incomePaymentContextRequest) error {
	var containerID *string
	if input.ContainerID != nil {
		if _, err := uuid.Parse(*input.ContainerID); err != nil {
			return fmt.Errorf("destination_container_id must be a valid UUID")
		}
		var exists bool
		if err := db.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM payment_containers WHERE id = $1 AND account_id = $2 AND is_active = true)`, *input.ContainerID, accountID).Scan(&exists); err != nil {
			return fmt.Errorf("failed to validate destination_container_id")
		}
		if !exists {
			return fmt.Errorf("destination_container_id does not belong to this account or is inactive")
		}
		containerID = input.ContainerID
	}

	if input.InstrumentID == nil {
		return nil
	}
	if _, err := uuid.Parse(*input.InstrumentID); err != nil {
		return fmt.Errorf("destination_instrument_id must be a valid UUID")
	}

	var backingContainerID *string
	if err := db.QueryRow(ctx, `SELECT backing_container_id FROM payment_instruments WHERE id = $1 AND account_id = $2 AND is_active = true`, *input.InstrumentID, accountID).Scan(&backingContainerID); err != nil {
		if err == pgx.ErrNoRows {
			return fmt.Errorf("destination_instrument_id does not belong to this account or is inactive")
		}
		return fmt.Errorf("failed to validate destination_instrument_id")
	}
	if containerID != nil && backingContainerID != nil && *backingContainerID != *containerID {
		return fmt.Errorf("destination_instrument_id is not backed by destination_container_id")
	}
	return nil
}

func resolveIncomePaymentContextUpdate(ctx context.Context, db incomeStore, accountID any, incomeID string, input incomePaymentContextUpdate) (bool, *string, bool, *string, error) {
	containerSet, containerID, err := resolveNullableUUIDField("destination_container_id", input.ContainerID)
	if err != nil {
		return false, nil, false, nil, err
	}
	instrumentSet, instrumentID, err := resolveNullableUUIDField("destination_instrument_id", input.InstrumentID)
	if err != nil {
		return false, nil, false, nil, err
	}
	if err := validateIncomePaymentContext(ctx, db, accountID, incomePaymentContextRequest{ContainerID: containerID, InstrumentID: instrumentID}); err != nil {
		return false, nil, false, nil, err
	}
	if err := validateIncomePaymentContextUpdateFinalPair(ctx, db, accountID, incomeID, containerSet, containerID, instrumentSet, instrumentID); err != nil {
		return false, nil, false, nil, err
	}
	return containerSet, containerID, instrumentSet, instrumentID, nil
}

func validateIncomePaymentContextUpdateFinalPair(ctx context.Context, db incomeStore, accountID any, incomeID string, containerSet bool, containerID *string, instrumentSet bool, instrumentID *string) error {
	if containerSet == instrumentSet || (containerSet && containerID == nil) || (instrumentSet && instrumentID == nil) {
		return nil
	}

	var existingContainerID, existingInstrumentID *string
	if err := db.QueryRow(ctx, `SELECT destination_container_id, destination_instrument_id FROM incomes WHERE id = $1 AND account_id = $2 AND deleted_at IS NULL`, incomeID, accountID).Scan(&existingContainerID, &existingInstrumentID); err != nil {
		if err == pgx.ErrNoRows {
			return fmt.Errorf("income not found or does not belong to this account")
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

	return validateIncomePaymentContextBacking(ctx, db, accountID, finalContainerID, finalInstrumentID)
}

func validateIncomePaymentContextBacking(ctx context.Context, db incomeStore, accountID any, containerID, instrumentID *string) error {
	if containerID == nil || instrumentID == nil {
		return nil
	}
	var backingContainerID *string
	if err := db.QueryRow(ctx, `SELECT backing_container_id FROM payment_instruments WHERE id = $1 AND account_id = $2`, *instrumentID, accountID).Scan(&backingContainerID); err != nil {
		if err == pgx.ErrNoRows {
			return fmt.Errorf("destination_instrument_id does not belong to this account")
		}
		return fmt.Errorf("failed to validate destination_instrument_id")
	}
	if backingContainerID != nil && *backingContainerID != *containerID {
		return fmt.Errorf("destination_instrument_id is not backed by destination_container_id")
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
