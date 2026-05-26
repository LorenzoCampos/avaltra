package recurring_expenses

import (
	"context"

	"github.com/jackc/pgx/v5"
)

type recurringExpenseStore interface {
	QueryRow(ctx context.Context, sql string, args ...any) pgx.Row
}
