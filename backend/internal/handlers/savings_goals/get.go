package savings_goals

import (
	"net/http"
	"strconv"
	"time"

	"github.com/LorenzoCampos/avaltra/internal/middleware"
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5"
)

// SavingsGoalTransaction represents a transaction for a savings goal
type SavingsGoalTransaction struct {
	ID              string  `json:"id"`
	Amount          float64 `json:"amount"`           // Positive for deposit, negative for withdrawal (display)
	TransactionType string  `json:"transaction_type"` // "deposit" or "withdrawal"
	Description     *string `json:"description,omitempty"`
	ContainerID     *string `json:"container_id"`
	Date            string  `json:"date"`
	CreatedAt       string  `json:"created_at"`
}

// PaginationMetadata represents pagination information
type PaginationMetadata struct {
	CurrentPage int `json:"current_page"`
	TotalPages  int `json:"total_pages"`
	TotalCount  int `json:"total_count"`
	Limit       int `json:"limit"`
}

// SavingsGoalDetailResponse represents a savings goal with its transaction history
type SavingsGoalDetailResponse struct {
	SavingsGoalResponse
	Transactions []SavingsGoalTransaction `json:"transactions"`
	Pagination   PaginationMetadata       `json:"pagination"`
}

// GetSavingsGoal handles GET /api/savings-goals/:id
func GetSavingsGoal(db dbQuerier) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Get account_id from context
		accountID, exists := middleware.GetAccountID(c)
		if !exists {
			c.JSON(http.StatusBadRequest, gin.H{"error": "account_id not found in context"})
			return
		}

		// Get savings goal ID from URL
		goalID := c.Param("id")
		if goalID == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "savings_goal_id is required"})
			return
		}

		ctx := c.Request.Context()

		// Query savings goal
		var goal SavingsGoalResponse
		var description, savedIn, savedContainerID, savedContainerName *string
		var deadline *time.Time
		var createdAt, updatedAt time.Time

		query := `
			SELECT 
				sg.id, sg.account_id, sg.name, sg.description, sg.target_amount,
				sg.current_amount, sg.currency, sg.saved_in, sg.saved_container_id,
				pc.name AS saved_container_name, sg.deadline,
				sg.is_active, sg.created_at, sg.updated_at
			FROM savings_goals sg
			LEFT JOIN payment_containers pc ON pc.id = sg.saved_container_id AND pc.account_id = sg.account_id
			WHERE sg.id = $1 AND sg.account_id = $2
		`

		err := db.QueryRow(ctx, query, goalID, accountID).Scan(
			&goal.ID, &goal.AccountID, &goal.Name, &description,
			&goal.TargetAmount, &goal.CurrentAmount, &goal.Currency,
			&savedIn, &savedContainerID, &savedContainerName, &deadline,
			&goal.IsActive, &createdAt, &updatedAt,
		)

		if err == pgx.ErrNoRows {
			c.JSON(http.StatusNotFound, gin.H{"error": "meta de ahorro no encontrada o no pertenece a esta cuenta"})
			return
		}

		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch savings goal"})
			return
		}

		// Set optional fields
		goal.Description = description
		goal.SavedIn = savedIn
		goal.SavedContainerID = savedContainerID
		goal.SavedContainerName = savedContainerName
		goal.StorageStatus = storageStatus(savedContainerID)

		if deadline != nil {
			deadlineStr := deadline.Format("2006-01-02")
			goal.Deadline = &deadlineStr
		}

		// Calculate progress percentage
		if goal.TargetAmount > 0 {
			goal.ProgressPercentage = (goal.CurrentAmount / goal.TargetAmount) * 100
		} else {
			goal.ProgressPercentage = 0
		}

		// Calculate required_monthly_savings si hay deadline
		goal.RequiredMonthlySavings = calculateRequiredMonthlySavings(goal.CurrentAmount, goal.TargetAmount, deadline)

		goal.CreatedAt = createdAt.Format(time.RFC3339)
		goal.UpdatedAt = updatedAt.Format(time.RFC3339)

		// Parse pagination parameters
		pageStr := c.DefaultQuery("page", "1")
		limitStr := c.DefaultQuery("limit", "20")

		page, err := strconv.Atoi(pageStr)
		if err != nil || page < 1 {
			page = 1
		}

		limit, err := strconv.Atoi(limitStr)
		if err != nil || limit < 1 {
			limit = 20
		}
		// Max limit is 100 to prevent huge responses
		if limit > 100 {
			limit = 100
		}

		offset := (page - 1) * limit

		// Count total transactions
		countQuery := `SELECT COUNT(*) FROM savings_goal_transactions WHERE savings_goal_id = $1`
		var totalCount int
		err = db.QueryRow(ctx, countQuery, goalID).Scan(&totalCount)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to count transactions"})
			return
		}

		// Calculate total pages
		totalPages := (totalCount + limit - 1) / limit
		if totalPages < 1 {
			totalPages = 1
		}

		// Query transactions history with pagination
		transactionsQuery := `
		SELECT 
			id, amount, transaction_type, description, container_id,
			date::TEXT, created_at::TEXT
		FROM savings_goal_transactions
		WHERE savings_goal_id = $1
		ORDER BY date DESC, created_at DESC
		LIMIT $2 OFFSET $3
	`

		rows, err := db.Query(ctx, transactionsQuery, goalID, limit, offset)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch transactions"})
			return
		}
		defer rows.Close()

		transactions := []SavingsGoalTransaction{}
		for rows.Next() {
			var txn SavingsGoalTransaction
			var description *string

			err := rows.Scan(
				&txn.ID, &txn.Amount, &txn.TransactionType,
				&description, &txn.ContainerID, &txn.Date, &txn.CreatedAt,
			)
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to parse transaction"})
				return
			}

			txn.Description = description

			// For display purposes, show withdrawals as negative amounts
			if txn.TransactionType == "withdrawal" {
				txn.Amount = -txn.Amount
			}

			transactions = append(transactions, txn)
		}

		if err := rows.Err(); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "error reading transactions"})
			return
		}

		// Build pagination metadata
		pagination := PaginationMetadata{
			CurrentPage: page,
			TotalPages:  totalPages,
			TotalCount:  totalCount,
			Limit:       limit,
		}

		// Build response
		response := SavingsGoalDetailResponse{
			SavingsGoalResponse: goal,
			Transactions:        transactions,
			Pagination:          pagination,
		}

		c.JSON(http.StatusOK, response)
	}
}
