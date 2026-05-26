package recurring_incomes

import (
	"context"

	"github.com/jackc/pgx/v5"
)

type recurringIncomeStore interface {
	QueryRow(ctx context.Context, sql string, args ...any) pgx.Row
}
