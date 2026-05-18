package payment_containers

import (
	"context"
	"database/sql"
	"strings"

	"github.com/google/uuid"
)

func scanPaymentContainer(row interface{ Scan(dest ...any) error }) (PaymentContainerResponse, error) {
	var container PaymentContainerResponse
	var institutionID sql.NullString
	err := row.Scan(&container.ID, &container.AccountID, &institutionID, &container.Name, &container.Kind, &container.IsActive, &container.CreatedAt, &container.UpdatedAt)
	if institutionID.Valid {
		container.InstitutionID = &institutionID.String
	}
	return container, err
}

func scanPaymentInstrument(row interface{ Scan(dest ...any) error }) (PaymentInstrumentResponse, error) {
	var instrument PaymentInstrumentResponse
	var institutionID sql.NullString
	var backingContainerID sql.NullString
	err := row.Scan(&instrument.ID, &instrument.AccountID, &institutionID, &backingContainerID, &instrument.Name, &instrument.Kind, &instrument.IsActive, &instrument.CreatedAt, &instrument.UpdatedAt)
	if institutionID.Valid {
		instrument.InstitutionID = &institutionID.String
	}
	if backingContainerID.Valid {
		instrument.BackingContainerID = &backingContainerID.String
	}
	return instrument, err
}

func parseOptionalUUID(value *string) (*uuid.UUID, error) {
	if value == nil || strings.TrimSpace(*value) == "" {
		return nil, nil
	}
	parsed, err := uuid.Parse(strings.TrimSpace(*value))
	if err != nil {
		return nil, err
	}
	return &parsed, nil
}

func containerExists(ctx context.Context, db querier, accountID string, containerID *uuid.UUID) (bool, error) {
	if containerID == nil {
		return true, nil
	}
	var exists bool
	err := db.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM payment_containers WHERE id = $1 AND account_id = $2)`, *containerID, accountID).Scan(&exists)
	return exists, err
}
