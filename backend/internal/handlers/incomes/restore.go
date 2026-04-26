package incomes

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

func RestoreIncome(db *pgxpool.Pool) gin.HandlerFunc {
	return func(c *gin.Context) {
		accountID, exists := c.Get("account_id")
		if !exists {
			c.JSON(http.StatusBadRequest, gin.H{"error": "account_id not found in context"})
			return
		}

		incomeID := c.Param("id")
		if incomeID == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "income_id is required"})
			return
		}

		restoreQuery := `
			UPDATE incomes
			SET deleted_at = NULL
			WHERE id = $1 AND account_id = $2 AND deleted_at IS NOT NULL
			RETURNING id
		`

		var restoredID string
		err := db.QueryRow(c.Request.Context(), restoreQuery, incomeID, accountID).Scan(&restoredID)
		if err != nil && err != pgx.ErrNoRows {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to restore income: " + err.Error()})
			return
		}

		if err == pgx.ErrNoRows {
			var deletedAtExists bool
			existsQuery := `
				SELECT deleted_at IS NOT NULL
				FROM incomes
				WHERE id = $1 AND account_id = $2
			`

			err = db.QueryRow(c.Request.Context(), existsQuery, incomeID, accountID).Scan(&deletedAtExists)
			if err == pgx.ErrNoRows {
				c.JSON(http.StatusNotFound, gin.H{"error": "income not found or does not belong to this account"})
				return
			}
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to restore income: " + err.Error()})
				return
			}

			c.JSON(http.StatusOK, gin.H{
				"message":          "income already restored",
				"id":               incomeID,
				"already_restored": !deletedAtExists,
			})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"message": "income restored successfully",
			"id":      incomeID,
		})
	}
}
