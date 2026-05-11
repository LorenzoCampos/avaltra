package expenses

import "context"

func validateExpenseCategory(ctx context.Context, db expenseStore, categoryID *string, accountID any) (bool, error) {
	if categoryID == nil {
		return true, nil
	}

	var exists bool
	err := db.QueryRow(ctx,
		`SELECT EXISTS(
			SELECT 1 FROM expense_categories
			WHERE id = $1 AND (account_id IS NULL OR account_id = $2)
		)`,
		categoryID, accountID,
	).Scan(&exists)
	return exists, err
}
