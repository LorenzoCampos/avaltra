package expenses

import (
	"context"

	"github.com/jackc/pgx/v5"
)

type expenseStore interface {
	QueryRow(ctx context.Context, sql string, args ...any) pgx.Row
	Query(ctx context.Context, sql string, args ...any) (pgx.Rows, error)
}
