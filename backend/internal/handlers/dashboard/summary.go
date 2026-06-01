package dashboard

import (
	"context"
	"net/http"
	"sort"
	"time"

	"github.com/LorenzoCampos/avaltra/pkg/recurrence"
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5"
)

type dashboardQuerier interface {
	Query(context.Context, string, ...any) (pgx.Rows, error)
	QueryRow(context.Context, string, ...any) pgx.Row
}

// CategoryExpense represents expenses grouped by category
type CategoryExpense struct {
	CategoryID    *string `json:"category_id,omitempty"`
	CategoryName  *string `json:"category_name,omitempty"`
	CategoryIcon  *string `json:"category_icon,omitempty"`
	CategoryColor *string `json:"category_color,omitempty"`
	Total         float64 `json:"total"`
	Percentage    float64 `json:"percentage"`
}

// TopExpense represents a single top expense
type TopExpense struct {
	ID                      string  `json:"id"`
	Description             string  `json:"description"`
	Amount                  float64 `json:"amount"`
	Currency                string  `json:"currency"`
	AmountInPrimaryCurrency float64 `json:"amount_in_primary_currency"`
	CategoryName            *string `json:"category_name,omitempty"`
	Date                    string  `json:"date"`
}

// RecentTransaction represents a recent transaction (expense or income)
type RecentTransaction struct {
	ID                      string  `json:"id"`
	Type                    string  `json:"type"` // "expense" or "income"
	Description             string  `json:"description"`
	Amount                  float64 `json:"amount"`
	Currency                string  `json:"currency"`
	AmountInPrimaryCurrency float64 `json:"amount_in_primary_currency"`
	CategoryName            *string `json:"category_name,omitempty"`
	Date                    string  `json:"date"`
	CreatedAt               string  `json:"created_at"`
}

type UpcomingRecurringItem struct {
	ID             string  `json:"id"`
	Description    string  `json:"description"`
	Amount         float64 `json:"amount"`
	Currency       string  `json:"currency"`
	NextOccurrence string  `json:"next_occurrence"`
	DaysUntil      int     `json:"days_until"`
}

type UpcomingRecurringSummary struct {
	Count int                     `json:"count"`
	Items []UpcomingRecurringItem `json:"items"`
}

type MoneyByContainer struct {
	ContainerID  *string `json:"container_id"`
	Name         string  `json:"name"`
	Type         *string `json:"type"`
	Total        float64 `json:"total"`
	Percentage   float64 `json:"percentage"`
	IsUnassigned bool    `json:"is_unassigned"`
}

// DashboardSummaryResponse represents the complete dashboard summary
type DashboardSummaryResponse struct {
	Period                         string                   `json:"period"` // YYYY-MM format
	PrimaryCurrency                string                   `json:"primary_currency"`
	TotalIncome                    float64                  `json:"total_income"`
	TotalExpenses                  float64                  `json:"total_expenses"`
	TotalAssignedToGoals           float64                  `json:"total_assigned_to_goals"` // Informational only
	AvailableBalance               float64                  `json:"available_balance"`       // Legacy monthly net
	CurrentAvailableBalance        float64                  `json:"current_available_balance"`
	NextMonthRecurringExpenseTotal float64                  `json:"next_month_recurring_expense_total"`
	ExpensesByCategory             []CategoryExpense        `json:"expenses_by_category"`
	TopExpenses                    []TopExpense             `json:"top_expenses"`
	RecentTransactions             []RecentTransaction      `json:"recent_transactions"`
	UpcomingRecurring              UpcomingRecurringSummary `json:"upcoming_recurring"`
	MoneyByContainer               []MoneyByContainer       `json:"money_by_container"`
}

type containerMoneyRow struct {
	ContainerID   *string
	ContainerName *string
	ContainerType *string
	Total         float64
}

type recurringExpenseTemplateRow struct {
	ID                      string
	Description             string
	Amount                  float64
	Currency                string
	AmountInPrimaryCurrency float64
	RecurrenceFrequency     string
	RecurrenceInterval      int
	RecurrenceDayOfMonth    *int
	RecurrenceDayOfWeek     *int
	StartDate               time.Time
	EndDate                 *time.Time
	TotalOccurrences        *int
	CurrentOccurrence       int
	IsActive                bool
}

var loadUpcomingRecurringExpenses = getUpcomingRecurringExpenses
var loadNextMonthRecurringExpenseTotal = getNextMonthRecurringExpenseTotal

// GetSummary handles GET /api/dashboard/summary
// Returns a complete summary of the user's financial data for a given month
func GetSummary(db dashboardQuerier) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Get account_id from context (set by AccountMiddleware)
		accountID, exists := c.Get("account_id")
		if !exists {
			c.JSON(http.StatusBadRequest, gin.H{"error": "account_id not found in context"})
			return
		}

		// Parse query parameters (optional month/year, defaults to current month)
		month := c.DefaultQuery("month", time.Now().Format("2006-01"))

		// Validate month format (YYYY-MM)
		_, err := time.Parse("2006-01", month)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid month format, use YYYY-MM"})
			return
		}

		ctx := c.Request.Context()
		today := time.Now().UTC().Truncate(24 * time.Hour)

		// Get primary currency of the account
		var primaryCurrency string
		err = db.QueryRow(ctx, `SELECT currency FROM accounts WHERE id = $1`, accountID).Scan(&primaryCurrency)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get account currency"})
			return
		}

		// ============================================================================
		// 1. CALCULATE TOTAL INCOME (sum of amount_in_primary_currency)
		// ============================================================================
		var totalIncome float64
		incomeQuery := `
			SELECT COALESCE(SUM(amount_in_primary_currency), 0)
			FROM incomes
			WHERE account_id = $1
			  AND deleted_at IS NULL
			  AND TO_CHAR(date, 'YYYY-MM') = $2
		`
		err = db.QueryRow(ctx, incomeQuery, accountID, month).Scan(&totalIncome)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to calculate total income"})
			return
		}

		// ============================================================================
		// 2. CALCULATE TOTAL EXPENSES (sum of amount_in_primary_currency)
		// ============================================================================
		var totalExpenses float64
		expensesQuery := `
			SELECT COALESCE(SUM(amount_in_primary_currency), 0)
			FROM expenses
			WHERE account_id = $1
			  AND deleted_at IS NULL
			  AND TO_CHAR(date, 'YYYY-MM') = $2
		`
		err = db.QueryRow(ctx, expensesQuery, accountID, month).Scan(&totalExpenses)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to calculate total expenses"})
			return
		}

		var historicalIncome float64
		historicalIncomeQuery := `
			SELECT COALESCE(SUM(amount_in_primary_currency), 0)
			FROM incomes
			WHERE account_id = $1
			  AND deleted_at IS NULL
		`
		err = db.QueryRow(ctx, historicalIncomeQuery, accountID).Scan(&historicalIncome)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to calculate historical income"})
			return
		}

		var historicalExpenses float64
		historicalExpensesQuery := `
			SELECT COALESCE(SUM(amount_in_primary_currency), 0)
			FROM expenses
			WHERE account_id = $1
			  AND deleted_at IS NULL
		`
		err = db.QueryRow(ctx, historicalExpensesQuery, accountID).Scan(&historicalExpenses)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to calculate historical expenses"})
			return
		}

		moneyByContainerRows, err := queryMoneyByContainer(ctx, db, accountID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to calculate money by container"})
			return
		}
		moneyByContainer := buildMoneyByContainerBreakdown(moneyByContainerRows)

		// ============================================================================
		// 3. EXPENSES BY CATEGORY (with percentages)
		// ============================================================================
		categoryQuery := `
			SELECT 
				e.category_id,
				ec.name as category_name,
				ec.icon as category_icon,
				ec.color as category_color,
				SUM(e.amount_in_primary_currency) as total
			FROM expenses e
			LEFT JOIN expense_categories ec ON e.category_id = ec.id
			WHERE e.account_id = $1
			  AND e.deleted_at IS NULL
			  AND TO_CHAR(e.date, 'YYYY-MM') = $2
			GROUP BY e.category_id, ec.name, ec.icon, ec.color
			HAVING SUM(e.amount_in_primary_currency) > 0
			ORDER BY total DESC
		`

		rows, err := db.Query(ctx, categoryQuery, accountID, month)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get expenses by category"})
			return
		}
		defer rows.Close()

		expensesByCategory := []CategoryExpense{}
		for rows.Next() {
			var cat CategoryExpense
			err := rows.Scan(&cat.CategoryID, &cat.CategoryName, &cat.CategoryIcon, &cat.CategoryColor, &cat.Total)
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to parse category expense"})
				return
			}

			// Calculate percentage
			if totalExpenses > 0 {
				cat.Percentage = (cat.Total / totalExpenses) * 100
			} else {
				cat.Percentage = 0
			}

			expensesByCategory = append(expensesByCategory, cat)
		}

		if err := rows.Err(); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "error reading category expenses"})
			return
		}

		// ============================================================================
		// 4. TOP 5 EXPENSES (ordered by amount_in_primary_currency)
		// ============================================================================
		topExpensesQuery := `
			SELECT 
				e.id,
				e.description,
				e.amount,
				e.currency,
				e.amount_in_primary_currency,
				ec.name as category_name,
				e.date::TEXT
			FROM expenses e
			LEFT JOIN expense_categories ec ON e.category_id = ec.id
			WHERE e.account_id = $1
			  AND e.deleted_at IS NULL
			  AND TO_CHAR(e.date, 'YYYY-MM') = $2
			ORDER BY e.amount_in_primary_currency DESC
			LIMIT 5
		`

		rows, err = db.Query(ctx, topExpensesQuery, accountID, month)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get top expenses"})
			return
		}
		defer rows.Close()

		topExpenses := []TopExpense{}
		for rows.Next() {
			var exp TopExpense
			err := rows.Scan(&exp.ID, &exp.Description, &exp.Amount, &exp.Currency,
				&exp.AmountInPrimaryCurrency, &exp.CategoryName, &exp.Date)
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to parse top expense"})
				return
			}
			topExpenses = append(topExpenses, exp)
		}

		if err := rows.Err(); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "error reading top expenses"})
			return
		}

		// ============================================================================
		// 5. RECENT TRANSACTIONS (last 10 expenses + incomes, merged and sorted)
		// ============================================================================
		recentTransactionsQuery := `
			SELECT * FROM (
				(
					SELECT 
						e.id,
						'expense' as type,
						e.description,
						e.amount,
						e.currency,
						e.amount_in_primary_currency,
						ec.name as category_name,
						e.date::TEXT as date,
						e.created_at::TEXT as created_at
					FROM expenses e
					LEFT JOIN expense_categories ec ON e.category_id = ec.id
					WHERE e.account_id = $1
					  AND e.deleted_at IS NULL
					  AND TO_CHAR(e.date, 'YYYY-MM') = $2
				)
				UNION ALL
				(
					SELECT 
						i.id,
						'income' as type,
						i.description,
						i.amount,
						i.currency,
						i.amount_in_primary_currency,
						ic.name as category_name,
						i.date::TEXT as date,
						i.created_at::TEXT as created_at
					FROM incomes i
					LEFT JOIN income_categories ic ON i.category_id = ic.id
					WHERE i.account_id = $1
					  AND i.deleted_at IS NULL
					  AND TO_CHAR(i.date, 'YYYY-MM') = $2
				)
			) AS combined
			ORDER BY combined.date DESC, combined.created_at DESC
			LIMIT 10
		`

		rows, err = db.Query(ctx, recentTransactionsQuery, accountID, month)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get recent transactions"})
			return
		}
		defer rows.Close()

		recentTransactions := []RecentTransaction{}
		for rows.Next() {
			var txn RecentTransaction
			err := rows.Scan(&txn.ID, &txn.Type, &txn.Description, &txn.Amount, &txn.Currency,
				&txn.AmountInPrimaryCurrency, &txn.CategoryName, &txn.Date, &txn.CreatedAt)
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to parse transaction"})
				return
			}
			recentTransactions = append(recentTransactions, txn)
		}

		if err := rows.Err(); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "error reading recent transactions"})
			return
		}

		// ============================================================================
		// 6. CALCULATE NET SAVINGS ACTIVITY FOR THIS MONTH
		// ============================================================================
		// Calculate deposits and withdrawals for THIS MONTH only
		// Deposits reduce available balance (money moved to savings)
		// Withdrawals increase available balance (money returned from savings)
		var monthlyDeposits, monthlyWithdrawals float64

		savingsActivityQuery := `
		SELECT 
			COALESCE(SUM(CASE WHEN transaction_type = 'deposit' THEN amount ELSE 0 END), 0) as deposits,
			COALESCE(SUM(CASE WHEN transaction_type = 'withdrawal' THEN amount ELSE 0 END), 0) as withdrawals
		FROM savings_goal_transactions sgt
		INNER JOIN savings_goals sg ON sgt.savings_goal_id = sg.id
		WHERE sg.account_id = $1
		  AND TO_CHAR(sgt.date, 'YYYY-MM') = $2
	`
		err = db.QueryRow(ctx, savingsActivityQuery, accountID, month).Scan(&monthlyDeposits, &monthlyWithdrawals)
		if err != nil {
			// If there's an error, just set to 0 instead of failing the entire request
			monthlyDeposits = 0
			monthlyWithdrawals = 0
		}

		// Net savings activity (deposits - withdrawals)
		netSavingsActivity := calculateNetSavingsActivity(monthlyDeposits, monthlyWithdrawals)

		var historicalDeposits, historicalWithdrawals float64
		historicalSavingsActivityQuery := `
		SELECT 
			COALESCE(SUM(CASE WHEN transaction_type = 'deposit' THEN amount ELSE 0 END), 0) as deposits,
			COALESCE(SUM(CASE WHEN transaction_type = 'withdrawal' THEN amount ELSE 0 END), 0) as withdrawals
		FROM savings_goal_transactions sgt
		INNER JOIN savings_goals sg ON sgt.savings_goal_id = sg.id
		WHERE sg.account_id = $1
	`
		err = db.QueryRow(ctx, historicalSavingsActivityQuery, accountID).Scan(&historicalDeposits, &historicalWithdrawals)
		if err != nil {
			historicalDeposits = 0
			historicalWithdrawals = 0
		}

		historicalSavingsNet := calculateNetSavingsActivity(historicalDeposits, historicalWithdrawals)

		// ============================================================================
		// 7. CALCULATE TOTAL ACCUMULATED IN SAVINGS (FOR DISPLAY)
		// ============================================================================
		// This is the TOTAL accumulated across all months
		// It's for informational purposes only
		var totalAssignedToGoals float64
		goalsQuery := `
		SELECT COALESCE(SUM(current_amount), 0)
		FROM savings_goals
		WHERE account_id = $1 AND is_active = true
	`
		err = db.QueryRow(ctx, goalsQuery, accountID).Scan(&totalAssignedToGoals)
		if err != nil {
			totalAssignedToGoals = 0
		}

		// ============================================================================
		// 8. CALCULATE AVAILABLE BALANCE (MONTHLY)
		// ============================================================================
		// Available balance = income - expenses - net savings activity
		//
		// Example:
		// - Income: $10,000
		// - Expenses: $3,000
		// - Saved this month: $2,000
		// - Available: $10,000 - $3,000 - $2,000 = $5,000 ✓
		//
		// Next month (no activity):
		// - Income: $0
		// - Expenses: $0
		// - Saved this month: $0
		// - Available: $0 - $0 - $0 = $0 ✓ (not negative!)
		availableBalance := calculateCurrentAvailableBalance(totalIncome, totalExpenses, netSavingsActivity)
		currentAvailableBalance := calculateCurrentAvailableBalance(historicalIncome, historicalExpenses, historicalSavingsNet)

		upcomingRecurring, err := loadUpcomingRecurringExpenses(db, ctx, accountID, today)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get upcoming recurring expenses"})
			return
		}

		nextMonthRecurringExpenseTotal, err := loadNextMonthRecurringExpenseTotal(db, ctx, accountID, today)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get next month recurring expense total"})
			return
		}

		// ============================================================================
		// BUILD RESPONSE
		// ============================================================================
		response := DashboardSummaryResponse{
			Period:                         month,
			PrimaryCurrency:                primaryCurrency,
			TotalIncome:                    totalIncome,
			TotalExpenses:                  totalExpenses,
			TotalAssignedToGoals:           totalAssignedToGoals,
			AvailableBalance:               availableBalance,
			CurrentAvailableBalance:        currentAvailableBalance,
			ExpensesByCategory:             expensesByCategory,
			TopExpenses:                    topExpenses,
			RecentTransactions:             recentTransactions,
			UpcomingRecurring:              upcomingRecurring,
			NextMonthRecurringExpenseTotal: nextMonthRecurringExpenseTotal,
			MoneyByContainer:               moneyByContainer,
		}

		c.JSON(http.StatusOK, response)
	}
}

func queryMoneyByContainer(ctx context.Context, db dashboardQuerier, accountID interface{}) ([]containerMoneyRow, error) {
	query := `
		SELECT container_id, container_name, container_type, SUM(total) AS total
		FROM (
			SELECT
				i.destination_container_id AS container_id,
				pc.name AS container_name,
				pc.kind AS container_type,
				SUM(i.amount_in_primary_currency) AS total
			FROM incomes i
			LEFT JOIN payment_containers pc ON i.destination_container_id = pc.id
			WHERE i.account_id = $1 AND i.deleted_at IS NULL
			GROUP BY i.destination_container_id, pc.name, pc.kind
			UNION ALL
			SELECT
				e.source_container_id AS container_id,
				pc.name AS container_name,
				pc.kind AS container_type,
				-SUM(e.amount_in_primary_currency) AS total
			FROM expenses e
			LEFT JOIN payment_containers pc ON e.source_container_id = pc.id
			WHERE e.account_id = $1 AND e.deleted_at IS NULL
			GROUP BY e.source_container_id, pc.name, pc.kind
			UNION ALL
			SELECT
				pt.source_container_id AS container_id,
				pc.name AS container_name,
				pc.kind AS container_type,
				-SUM(pt.amount) AS total
			FROM place_transfers pt
			LEFT JOIN payment_containers pc ON pt.source_container_id = pc.id
			WHERE pt.account_id = $1 AND pt.deleted_at IS NULL
			GROUP BY pt.source_container_id, pc.name, pc.kind
			UNION ALL
			SELECT
				pt.destination_container_id AS container_id,
				pc.name AS container_name,
				pc.kind AS container_type,
				SUM(pt.amount) AS total
			FROM place_transfers pt
			LEFT JOIN payment_containers pc ON pt.destination_container_id = pc.id
			WHERE pt.account_id = $1 AND pt.deleted_at IS NULL
			GROUP BY pt.destination_container_id, pc.name, pc.kind
			UNION ALL
			SELECT
				sgt.container_id AS container_id,
				pc.name AS container_name,
				pc.kind AS container_type,
				SUM(CASE
					WHEN sgt.transaction_type = 'deposit' THEN -sgt.amount
					WHEN sgt.transaction_type = 'withdrawal' THEN sgt.amount
					ELSE 0
				END) AS total
			FROM savings_goal_transactions sgt
			INNER JOIN savings_goals sg ON sgt.savings_goal_id = sg.id
			LEFT JOIN payment_containers pc ON sgt.container_id = pc.id
			WHERE sg.account_id = $1
			GROUP BY sgt.container_id, pc.name, pc.kind
		) AS movements
		GROUP BY container_id, container_name, container_type
		HAVING SUM(total) <> 0
	`
	rows, err := db.Query(ctx, query, accountID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	result := make([]containerMoneyRow, 0)
	for rows.Next() {
		var row containerMoneyRow
		if err := rows.Scan(&row.ContainerID, &row.ContainerName, &row.ContainerType, &row.Total); err != nil {
			return nil, err
		}
		result = append(result, row)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return result, nil
}

func buildMoneyByContainerBreakdown(rows []containerMoneyRow) []MoneyByContainer {
	items := make([]MoneyByContainer, 0, len(rows))
	unassignedTotal := 0.0
	grandTotal := 0.0

	for _, row := range rows {
		if row.Total <= 0 {
			continue
		}
		grandTotal += row.Total
		if row.ContainerID == nil {
			unassignedTotal += row.Total
			continue
		}
		name := "Unassigned"
		if row.ContainerName != nil && *row.ContainerName != "" {
			name = *row.ContainerName
		}
		items = append(items, MoneyByContainer{
			ContainerID: row.ContainerID,
			Name:        name,
			Type:        row.ContainerType,
			Total:       row.Total,
		})
	}

	if unassignedTotal > 0 {
		items = append(items, MoneyByContainer{
			Name:         "Unassigned",
			Total:        unassignedTotal,
			IsUnassigned: true,
		})
	}

	if grandTotal > 0 {
		for index := range items {
			items[index].Percentage = (items[index].Total / grandTotal) * 100
		}
	}

	sort.SliceStable(items, func(i, j int) bool {
		return items[i].Total > items[j].Total
	})

	return items
}

func getNextMonthRecurringExpenseTotal(db dashboardQuerier, ctx context.Context, accountID interface{}, today time.Time) (float64, error) {
	query := `
		SELECT
			id,
			description,
			amount,
			currency,
			COALESCE(amount_in_primary_currency, amount) AS amount_in_primary_currency,
			recurrence_frequency,
			recurrence_interval,
			recurrence_day_of_month,
			recurrence_day_of_week,
			start_date,
			end_date,
			total_occurrences,
			current_occurrence,
			is_active
		FROM recurring_expenses
		WHERE account_id = $1
		  AND is_active = true
	`

	rows, err := db.Query(ctx, query, accountID)
	if err != nil {
		return 0, err
	}
	defer rows.Close()

	start, endExclusive := nextCalendarMonthWindow(today)
	total := 0.0

	for rows.Next() {
		var template recurringExpenseTemplateRow
		err := rows.Scan(
			&template.ID,
			&template.Description,
			&template.Amount,
			&template.Currency,
			&template.AmountInPrimaryCurrency,
			&template.RecurrenceFrequency,
			&template.RecurrenceInterval,
			&template.RecurrenceDayOfMonth,
			&template.RecurrenceDayOfWeek,
			&template.StartDate,
			&template.EndDate,
			&template.TotalOccurrences,
			&template.CurrentOccurrence,
			&template.IsActive,
		)
		if err != nil {
			return 0, err
		}

		total += projectedRecurringExpenseAmount(template, start, endExclusive)
	}

	if err := rows.Err(); err != nil {
		return 0, err
	}

	return total, nil
}

func nextCalendarMonthWindow(today time.Time) (time.Time, time.Time) {
	currentMonthStart := time.Date(today.UTC().Year(), today.UTC().Month(), 1, 0, 0, 0, 0, time.UTC)
	start := currentMonthStart.AddDate(0, 1, 0)
	return start, start.AddDate(0, 1, 0)
}

func projectedRecurringExpenseAmount(template recurringExpenseTemplateRow, start time.Time, endExclusive time.Time) float64 {
	total := 0.0
	for candidate := start; candidate.Before(endExclusive); candidate = candidate.AddDate(0, 0, 1) {
		if recurrence.ShouldOccurOnDate(recurrence.Template{
			IsActive:             template.IsActive,
			RecurrenceFrequency:  template.RecurrenceFrequency,
			RecurrenceInterval:   template.RecurrenceInterval,
			RecurrenceDayOfMonth: template.RecurrenceDayOfMonth,
			RecurrenceDayOfWeek:  template.RecurrenceDayOfWeek,
			StartDate:            template.StartDate,
			EndDate:              template.EndDate,
			TotalOccurrences:     template.TotalOccurrences,
			CurrentOccurrence:    template.CurrentOccurrence,
		}, candidate) {
			total += template.AmountInPrimaryCurrency
		}
	}

	return total
}

func getUpcomingRecurringExpenses(db dashboardQuerier, ctx context.Context, accountID interface{}, today time.Time) (UpcomingRecurringSummary, error) {
	query := `
		SELECT
			id,
			description,
			amount,
			currency,
			recurrence_frequency,
			recurrence_interval,
			recurrence_day_of_month,
			recurrence_day_of_week,
			start_date,
			end_date,
			total_occurrences,
			current_occurrence,
			is_active
		FROM recurring_expenses
		WHERE account_id = $1
		  AND is_active = true
	`

	rows, err := db.Query(ctx, query, accountID)
	if err != nil {
		return UpcomingRecurringSummary{}, err
	}
	defer rows.Close()

	items := make([]UpcomingRecurringItem, 0)
	for rows.Next() {
		var template recurringExpenseTemplateRow
		err := rows.Scan(
			&template.ID,
			&template.Description,
			&template.Amount,
			&template.Currency,
			&template.RecurrenceFrequency,
			&template.RecurrenceInterval,
			&template.RecurrenceDayOfMonth,
			&template.RecurrenceDayOfWeek,
			&template.StartDate,
			&template.EndDate,
			&template.TotalOccurrences,
			&template.CurrentOccurrence,
			&template.IsActive,
		)
		if err != nil {
			return UpcomingRecurringSummary{}, err
		}

		nextOccurrence, ok := recurrence.NextOccurrenceWithinWindow(recurrence.Template{
			IsActive:             template.IsActive,
			RecurrenceFrequency:  template.RecurrenceFrequency,
			RecurrenceInterval:   template.RecurrenceInterval,
			RecurrenceDayOfMonth: template.RecurrenceDayOfMonth,
			RecurrenceDayOfWeek:  template.RecurrenceDayOfWeek,
			StartDate:            template.StartDate,
			EndDate:              template.EndDate,
			TotalOccurrences:     template.TotalOccurrences,
			CurrentOccurrence:    template.CurrentOccurrence,
		}, today, 7)
		if !ok {
			continue
		}

		items = append(items, UpcomingRecurringItem{
			ID:             template.ID,
			Description:    template.Description,
			Amount:         template.Amount,
			Currency:       template.Currency,
			NextOccurrence: nextOccurrence.Format("2006-01-02"),
			DaysUntil:      int(nextOccurrence.Sub(today).Hours() / 24),
		})
	}

	if err := rows.Err(); err != nil {
		return UpcomingRecurringSummary{}, err
	}

	sort.Slice(items, func(i, j int) bool {
		return items[i].NextOccurrence < items[j].NextOccurrence
	})

	return UpcomingRecurringSummary{
		Count: len(items),
		Items: items,
	}, nil
}

func calculateNetSavingsActivity(deposits, withdrawals float64) float64 {
	return deposits - withdrawals
}

func calculateCurrentAvailableBalance(income, expenses, savingsNet float64) float64 {
	return income - expenses - savingsNet
}
