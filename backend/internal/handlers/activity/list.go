package activity

import (
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
)

type ListActivityQuery struct {
	DateFrom string `form:"date_from"` // YYYY-MM-DD
	DateTo   string `form:"date_to"`   // YYYY-MM-DD
	Month    string `form:"month"`     // YYYY-MM (shortcuts for date_from and date_to)
	Page     int    `form:"page"`      // Página (default: 1)
	Limit    int    `form:"limit"`     // Items por página (default: 50, max: 100)
}

type ActivityItem struct {
	ID           string  `json:"id"`
	Type         string  `json:"type"` // income, expense, savings_deposit, savings_withdrawal
	Description  string  `json:"description"`
	Amount       float64 `json:"amount"`
	Currency     string  `json:"currency"`
	CategoryName *string `json:"category_name,omitempty"` // For incomes/expenses
	GoalName     *string `json:"goal_name,omitempty"`     // For savings transactions
	GoalID       *string `json:"goal_id,omitempty"`       // For savings transactions
	Date         string  `json:"date"`
	CreatedAt    string  `json:"created_at"`
}

type ActivitySummary struct {
	TotalIncome             float64 `json:"total_income"`
	TotalExpenses           float64 `json:"total_expenses"`
	TotalSavingsDeposits    float64 `json:"total_savings_deposits"`
	TotalSavingsWithdrawals float64 `json:"total_savings_withdrawals"`
	NetBalance              float64 `json:"net_balance"` // income - expenses - savings_deposits + savings_withdrawals
}

type ListActivityResponse struct {
	Activities []ActivityItem  `json:"activities"`
	TotalCount int             `json:"total_count"`
	Page       int             `json:"page"`
	Limit      int             `json:"limit"`
	TotalPages int             `json:"total_pages"`
	Summary    ActivitySummary `json:"summary"`
}

func ListActivity(db *pgxpool.Pool) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Get account_id from context (set by AccountMiddleware)
		accountID, exists := c.Get("account_id")
		if !exists {
			c.JSON(http.StatusBadRequest, gin.H{"error": "account_id not found in context"})
			return
		}

		// Parse query parameters
		var query ListActivityQuery
		if err := c.ShouldBindQuery(&query); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		// Set defaults
		if query.Page < 1 {
			query.Page = 1
		}
		if query.Limit < 1 {
			query.Limit = 50
		}
		if query.Limit > 100 {
			query.Limit = 100
		}

		// Handle month parameter (YYYY-MM) - shortcuts to date_from and date_to
		if query.Month != "" {
			// Validate format
			_, err := time.Parse("2006-01", query.Month)
			if err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "invalid month format, use YYYY-MM"})
				return
			}

			// Set date_from to first day of month
			query.DateFrom = query.Month + "-01"

			// Set date_to to last day of month
			parsedMonth, _ := time.Parse("2006-01", query.Month)
			lastDay := parsedMonth.AddDate(0, 1, -1) // Go to next month, then back one day
			query.DateTo = lastDay.Format("2006-01-02")
		}

		// No default date filter - show ALL if no dates provided
		// Users can filter by month if they want

		// Validate dates if provided
		if query.DateFrom != "" {
			if _, err := time.Parse("2006-01-02", query.DateFrom); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "invalid date_from format, use YYYY-MM-DD"})
				return
			}
		}
		if query.DateTo != "" {
			if _, err := time.Parse("2006-01-02", query.DateTo); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "invalid date_to format, use YYYY-MM-DD"})
				return
			}
		}

		// Build date filter for WHERE clause
		dateFilter := ""
		dateArgs := []interface{}{}
		dateArgIndex := 2 // Start at 2 because $1 is accountID

		if query.DateFrom != "" {
			dateFilter += " AND date >= $" + strconv.Itoa(dateArgIndex)
			dateArgs = append(dateArgs, query.DateFrom)
			dateArgIndex++
		}
		if query.DateTo != "" {
			dateFilter += " AND date <= $" + strconv.Itoa(dateArgIndex)
			dateArgs = append(dateArgs, query.DateTo)
			dateArgIndex++
		}

		// Build the UNION query to get all activities
		unionQuery := `
			-- Incomes (both one-time and recurring-generated)
			SELECT 
				i.id,
				'income' as type,
				i.description,
				i.amount_in_primary_currency as amount,
				i.currency,
				ic.name as category_name,
				NULL::TEXT as goal_name,
				NULL::UUID as goal_id,
				i.date,
				i.created_at
			FROM incomes i
			LEFT JOIN income_categories ic ON i.category_id = ic.id
			WHERE i.account_id = $1 
				` + dateFilter + `

			UNION ALL

			-- Expenses (both one-time and recurring-generated)
			SELECT 
				e.id,
				'expense' as type,
				e.description,
				e.amount_in_primary_currency as amount,
				e.currency,
				ec.name as category_name,
				NULL::TEXT as goal_name,
				NULL::UUID as goal_id,
				e.date,
				e.created_at
			FROM expenses e
			LEFT JOIN expense_categories ec ON e.category_id = ec.id
			WHERE e.account_id = $1 
				` + dateFilter + `

			UNION ALL

			-- Savings Transactions
			SELECT 
				st.id,
				CASE 
					WHEN st.transaction_type = 'deposit' THEN 'savings_deposit'
					WHEN st.transaction_type = 'withdrawal' THEN 'savings_withdrawal'
				END as type,
				COALESCE(st.description, 'Savings ' || st.transaction_type) as description,
				st.amount,
				sg.currency,
				NULL::TEXT as category_name,
				sg.name as goal_name,
				sg.id as goal_id,
				st.date,
				st.created_at
			FROM savings_goal_transactions st
			INNER JOIN savings_goals sg ON st.savings_goal_id = sg.id
			WHERE sg.account_id = $1
				` + dateFilter + `

			ORDER BY created_at DESC, date DESC
		`

		// Prepare args for union query
		// $1 = accountID (used in all 3 UNION branches)
		// $2, $3 = date_from, date_to (also used in all 3 branches - placeholders are reused)
		unionArgs := []interface{}{accountID}
		unionArgs = append(unionArgs, dateArgs...)

		// Get total count first (using same query wrapped in SELECT COUNT(*))
		countQuery := "SELECT COUNT(*) FROM (" + unionQuery + ") as activities"
		var totalCount int
		err := db.QueryRow(c.Request.Context(), countQuery, unionArgs...).Scan(&totalCount)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to count activities: " + err.Error()})
			return
		}

		// Calculate summary from ALL transactions in the period (not just paginated results)
		summaryQuery := `
			SELECT 
				type,
				SUM(amount) as total
			FROM (` + unionQuery + `) as all_activities
			GROUP BY type
		`

		summaryRows, err := db.Query(c.Request.Context(), summaryQuery, unionArgs...)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to calculate summary: " + err.Error()})
			return
		}
		defer summaryRows.Close()

		var totalIncome float64
		var totalExpenses float64
		var totalSavingsDeposits float64
		var totalSavingsWithdrawals float64

		for summaryRows.Next() {
			var activityType string
			var total float64

			err := summaryRows.Scan(&activityType, &total)
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to parse summary: " + err.Error()})
				return
			}

			switch activityType {
			case "income":
				totalIncome = total
			case "expense":
				totalExpenses = total
			case "savings_deposit":
				totalSavingsDeposits = total
			case "savings_withdrawal":
				totalSavingsWithdrawals = total
			}
		}

		if err := summaryRows.Err(); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "error reading summary: " + err.Error()})
			return
		}

		// Calculate net balance
		netBalance := totalIncome - totalExpenses - totalSavingsDeposits + totalSavingsWithdrawals

		// Calculate pagination
		totalPages := (totalCount + query.Limit - 1) / query.Limit
		offset := (query.Page - 1) * query.Limit

		// Add LIMIT and OFFSET to main query for paginated results
		paginatedQuery := unionQuery + " LIMIT $" + strconv.Itoa(len(unionArgs)+1) + " OFFSET $" + strconv.Itoa(len(unionArgs)+2)
		paginatedArgs := append([]interface{}{}, unionArgs...) // Clone args
		paginatedArgs = append(paginatedArgs, query.Limit, offset)

		// Execute paginated query for activities list
		rows, err := db.Query(c.Request.Context(), paginatedQuery, paginatedArgs...)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch activities: " + err.Error()})
			return
		}
		defer rows.Close()

		// Parse paginated results
		activities := []ActivityItem{}

		for rows.Next() {
			var activity ActivityItem
			var categoryName, goalName *string
			var goalID *string
			var date time.Time
			var createdAt time.Time

			err := rows.Scan(
				&activity.ID,
				&activity.Type,
				&activity.Description,
				&activity.Amount,
				&activity.Currency,
				&categoryName,
				&goalName,
				&goalID,
				&date,
				&createdAt,
			)
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to parse activity: " + err.Error()})
				return
			}

			activity.CategoryName = categoryName
			activity.GoalName = goalName
			activity.GoalID = goalID
			activity.Date = date.Format("2006-01-02")
			activity.CreatedAt = createdAt.Format(time.RFC3339)

			activities = append(activities, activity)
		}

		// Check for errors during iteration
		if err := rows.Err(); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "error reading activities: " + err.Error()})
			return
		}

		// Build response
		response := ListActivityResponse{
			Activities: activities,
			TotalCount: totalCount,
			Page:       query.Page,
			Limit:      query.Limit,
			TotalPages: totalPages,
			Summary: ActivitySummary{
				TotalIncome:             totalIncome,
				TotalExpenses:           totalExpenses,
				TotalSavingsDeposits:    totalSavingsDeposits,
				TotalSavingsWithdrawals: totalSavingsWithdrawals,
				NetBalance:              netBalance,
			},
		}

		c.JSON(http.StatusOK, response)
	}
}
