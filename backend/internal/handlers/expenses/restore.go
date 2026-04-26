package expenses

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

func RestoreExpense(db *pgxpool.Pool) gin.HandlerFunc {
	return func(c *gin.Context) {
		accountID, exists := c.Get("account_id")
		if !exists {
			c.JSON(http.StatusBadRequest, gin.H{"error": "account_id not found in context"})
			return
		}

		expenseID := c.Param("id")
		if expenseID == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "expense_id is required"})
			return
		}

		restoreQuery := `
			UPDATE expenses
			SET deleted_at = NULL
			WHERE id = $1 AND account_id = $2 AND deleted_at IS NOT NULL
			RETURNING id
		`

		var restoredID string
		err := db.QueryRow(c.Request.Context(), restoreQuery, expenseID, accountID).Scan(&restoredID)
		if err != nil && err != pgx.ErrNoRows {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to restore expense: " + err.Error()})
			return
		}

		if err == pgx.ErrNoRows {
			var deletedAtExists bool
			existsQuery := `
				SELECT deleted_at IS NOT NULL
				FROM expenses
				WHERE id = $1 AND account_id = $2
			`

			err = db.QueryRow(c.Request.Context(), existsQuery, expenseID, accountID).Scan(&deletedAtExists)
			if err == pgx.ErrNoRows {
				c.JSON(http.StatusNotFound, gin.H{"error": "expense not found or does not belong to this account"})
				return
			}
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to restore expense: " + err.Error()})
				return
			}

			c.JSON(http.StatusOK, gin.H{
				"message":          "expense already restored",
				"id":               expenseID,
				"already_restored": !deletedAtExists,
			})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"message": "expense restored successfully",
			"id":      expenseID,
		})
	}
}
