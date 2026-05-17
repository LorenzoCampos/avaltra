package payment_containers

import (
	"context"
	"encoding/json"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
)

type querier interface {
	Query(ctx context.Context, sql string, args ...any) (pgx.Rows, error)
	QueryRow(ctx context.Context, sql string, args ...any) pgx.Row
	Exec(ctx context.Context, sql string, args ...any) (pgconn.CommandTag, error)
}

type CreatePaymentContainerRequest struct {
	Name          string  `json:"name" binding:"required"`
	Kind          string  `json:"kind" binding:"required"`
	InstitutionID *string `json:"institution_id"`
}

type UpdatePaymentContainerRequest struct {
	Name          nullableString `json:"name"`
	Kind          nullableString `json:"kind"`
	InstitutionID nullableString `json:"institution_id"`
	IsActive      *bool          `json:"is_active"`
}

type PaymentContainerResponse struct {
	ID            string    `json:"id"`
	AccountID     string    `json:"account_id"`
	InstitutionID *string   `json:"institution_id"`
	Name          string    `json:"name"`
	Kind          string    `json:"kind"`
	IsActive      bool      `json:"is_active"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}

type CreatePaymentInstrumentRequest struct {
	Name               string  `json:"name" binding:"required"`
	Kind               string  `json:"kind" binding:"required"`
	InstitutionID      *string `json:"institution_id"`
	BackingContainerID *string `json:"backing_container_id"`
}

type UpdatePaymentInstrumentRequest struct {
	Name               nullableString `json:"name"`
	Kind               nullableString `json:"kind"`
	InstitutionID      nullableString `json:"institution_id"`
	BackingContainerID nullableString `json:"backing_container_id"`
	IsActive           *bool          `json:"is_active"`
}

type PaymentInstrumentResponse struct {
	ID                 string    `json:"id"`
	AccountID          string    `json:"account_id"`
	InstitutionID      *string   `json:"institution_id"`
	BackingContainerID *string   `json:"backing_container_id"`
	Name               string    `json:"name"`
	Kind               string    `json:"kind"`
	IsActive           bool      `json:"is_active"`
	CreatedAt          time.Time `json:"created_at"`
	UpdatedAt          time.Time `json:"updated_at"`
}

type nullableString struct {
	Set   bool
	Value *string
}

func (n *nullableString) UnmarshalJSON(data []byte) error {
	n.Set = true
	if string(data) == "null" {
		n.Value = nil
		return nil
	}
	var value string
	if err := json.Unmarshal(data, &value); err != nil {
		return err
	}
	n.Value = &value
	return nil
}
