package savings_goals

import (
	"context"
	"encoding/json"
	"errors"
	"strings"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

type dbQuerier interface {
	Query(ctx context.Context, sql string, args ...any) (pgx.Rows, error)
	QueryRow(ctx context.Context, sql string, args ...any) pgx.Row
}

type dbBeginner interface {
	dbQuerier
	Begin(ctx context.Context) (pgx.Tx, error)
}

type optionalString struct {
	Set   bool
	Value *string
}

func (o *optionalString) UnmarshalJSON(data []byte) error {
	o.Set = true
	if string(data) == "null" {
		o.Value = nil
		return nil
	}
	var value string
	if err := json.Unmarshal(data, &value); err != nil {
		return err
	}
	o.Value = &value
	return nil
}

func validateOptionalContainer(ctx context.Context, db dbQuerier, accountID string, containerID *string) (*string, error) {
	if containerID == nil {
		return nil, nil
	}
	trimmed := strings.TrimSpace(*containerID)
	if trimmed == "" {
		return nil, errors.New("invalid-savings-place")
	}
	if _, err := uuid.Parse(trimmed); err != nil {
		return nil, errors.New("invalid-savings-place")
	}

	var containerName string
	err := db.QueryRow(ctx, `SELECT name FROM payment_containers WHERE id = $1 AND account_id = $2 AND is_active = true`, trimmed, accountID).Scan(&containerName)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, errors.New("invalid-savings-place")
	}
	if err != nil {
		return nil, err
	}
	*containerID = trimmed
	return &containerName, nil
}

func storageStatus(containerID *string) string {
	if containerID == nil || strings.TrimSpace(*containerID) == "" {
		return "unassigned"
	}
	return "assigned"
}
