package savings_goals

import (
	"net/http"
	"time"

	"github.com/LorenzoCampos/avaltra/internal/middleware"
	"github.com/gin-gonic/gin"
)

// ListSavingsGoals handles GET /api/savings-goals
func ListSavingsGoals(db dbQuerier) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Get account_id from context
		accountID, exists := middleware.GetAccountID(c)
		if !exists {
			c.JSON(http.StatusBadRequest, gin.H{"error": "account_id not found in context"})
			return
		}

		ctx := c.Request.Context()

		// Get is_active filter from query param (default: "true")
		// Options: "true", "false", "all"
		isActiveParam := c.DefaultQuery("is_active", "true")

		// Build query based on is_active filter
		query := `
			SELECT 
				sg.id, sg.account_id, sg.name, sg.description, sg.target_amount,
				sg.current_amount, sg.currency, sg.saved_in, sg.saved_container_id,
				pc.name AS saved_container_name, sg.deadline,
				sg.is_active, sg.created_at, sg.updated_at
			FROM savings_goals sg
			LEFT JOIN payment_containers pc ON pc.id = sg.saved_container_id AND pc.account_id = sg.account_id
			WHERE sg.account_id = $1`

		if isActiveParam == "true" {
			query += " AND sg.is_active = true"
		} else if isActiveParam == "false" {
			query += " AND sg.is_active = false"
		}
		// Si es "all", no agrega filtro (muestra todas)

		query += " ORDER BY sg.created_at DESC"

		rows, err := db.Query(ctx, query, accountID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch savings goals"})
			return
		}
		defer rows.Close()

		savingsGoals := []SavingsGoalResponse{}
		for rows.Next() {
			var goal SavingsGoalResponse
			var description, savedIn, savedContainerID, savedContainerName *string
			var deadline *time.Time
			var createdAt, updatedAt time.Time

			err := rows.Scan(
				&goal.ID, &goal.AccountID, &goal.Name, &description,
				&goal.TargetAmount, &goal.CurrentAmount, &goal.Currency,
				&savedIn, &savedContainerID, &savedContainerName, &deadline,
				&goal.IsActive, &createdAt, &updatedAt,
			)
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to parse savings goal"})
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

			savingsGoals = append(savingsGoals, goal)
		}

		if err := rows.Err(); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "error reading savings goals"})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"savings_goals": savingsGoals,
			"total_count":   len(savingsGoals),
		})
	}
}
