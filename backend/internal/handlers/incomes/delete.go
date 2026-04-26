package incomes

import (
	"net/http"

	"github.com/LorenzoCampos/avaltra/internal/middleware"
	"github.com/LorenzoCampos/avaltra/pkg/logger"
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

func DeleteIncome(db *pgxpool.Pool) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Get account_id from context (set by AccountMiddleware)
		accountID, exists := c.Get("account_id")
		if !exists {
			c.JSON(http.StatusBadRequest, gin.H{"error": "account_id not found in context"})
			return
		}

		// Get income ID from URL parameter
		incomeID := c.Param("id")
		if incomeID == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "income_id is required"})
			return
		}

		deleteQuery := `
			UPDATE incomes
			SET deleted_at = NOW()
			WHERE id = $1 AND account_id = $2 AND deleted_at IS NULL
			RETURNING id
		`

		var deletedID string
		err := db.QueryRow(c.Request.Context(), deleteQuery, incomeID, accountID).Scan(&deletedID)

		if err != nil && err != pgx.ErrNoRows {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to delete income: " + err.Error()})
			return
		}

		if err == pgx.ErrNoRows {
			var alreadyDeleted bool
			existsQuery := `
				SELECT deleted_at IS NOT NULL
				FROM incomes
				WHERE id = $1 AND account_id = $2
			`

			err = db.QueryRow(c.Request.Context(), existsQuery, incomeID, accountID).Scan(&alreadyDeleted)
			if err == pgx.ErrNoRows {
				c.JSON(http.StatusNotFound, gin.H{"error": "income not found or does not belong to this account"})
				return
			}
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to delete income: " + err.Error()})
				return
			}

			c.JSON(http.StatusOK, gin.H{
				"message":         "income already deleted",
				"id":              incomeID,
				"already_deleted": true,
			})
			return
		}

		// Obtener user_id del contexto para logging
		userID, _ := middleware.GetUserID(c)

		// Log de eliminación exitosa
		logger.Info("income.deleted", "Ingreso eliminado", map[string]interface{}{
			"income_id":  incomeID,
			"account_id": accountID,
			"user_id":    userID,
			"ip":         c.ClientIP(),
		})

		// Return success with no content
		c.JSON(http.StatusOK, gin.H{
			"message": "income deleted successfully",
			"id":      incomeID,
		})
	}
}
