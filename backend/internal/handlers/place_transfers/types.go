package place_transfers

import (
	"context"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
)

const accountCurrencyARS = "ARS"

type querier interface {
	Query(ctx context.Context, sql string, args ...any) (pgx.Rows, error)
	QueryRow(ctx context.Context, sql string, args ...any) pgx.Row
	Exec(ctx context.Context, sql string, args ...any) (pgconn.CommandTag, error)
}

type CreatePlaceTransferRequest struct {
	SourceContainerID      string  `json:"source_container_id"`
	DestinationContainerID string  `json:"destination_container_id"`
	Amount                 float64 `json:"amount"`
	Date                   string  `json:"date"`
	Note                   *string `json:"note"`
	Currency               *string `json:"currency"`
}

type PlaceTransferResponse struct {
	ID                       string    `json:"id"`
	AccountID                string    `json:"account_id"`
	SourceContainerID        string    `json:"source_container_id"`
	SourceContainerName      string    `json:"source_container_name"`
	DestinationContainerID   string    `json:"destination_container_id"`
	DestinationContainerName string    `json:"destination_container_name"`
	Amount                   float64   `json:"amount"`
	Currency                 string    `json:"currency"`
	Date                     time.Time `json:"date"`
	Note                     *string   `json:"note"`
	CreatedAt                time.Time `json:"created_at"`
	UpdatedAt                time.Time `json:"updated_at"`
}

type CancelPlaceTransferResponse struct {
	ID         string    `json:"id"`
	Status     string    `json:"status"`
	CanceledAt time.Time `json:"canceled_at"`
}
