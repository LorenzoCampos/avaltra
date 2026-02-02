package users

import (
	"net/http"

	"github.com/LorenzoCampos/bolsillo-claro/internal/middleware"
	"github.com/LorenzoCampos/bolsillo-claro/pkg/logger"
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
)

// SetDefaultAccountRequest representa la request para setear cuenta default
type SetDefaultAccountRequest struct {
	AccountID *string `json:"account_id"` // Puede ser null para limpiar
}

// SetDefaultAccount maneja PUT /api/users/me/default-account
// Establece la cuenta predeterminada del usuario
func SetDefaultAccount(pool *pgxpool.Pool) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Obtener user_id del contexto
		userID, exists := middleware.GetUserID(c)
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": "Usuario no autenticado",
			})
			return
		}

		var req SetDefaultAccountRequest

		// Validar JSON
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"error":   "Datos inválidos",
				"details": err.Error(),
			})
			return
		}

		ctx := c.Request.Context()

		// Si se proporciona account_id, verificar que existe y pertenece al usuario
		if req.AccountID != nil && *req.AccountID != "" {
			var accountExists bool
			checkQuery := `
				SELECT EXISTS(
					SELECT 1 FROM accounts 
					WHERE id = $1 AND user_id = $2
				)
			`
			err := pool.QueryRow(ctx, checkQuery, *req.AccountID, userID).Scan(&accountExists)
			if err != nil || !accountExists {
				c.JSON(http.StatusBadRequest, gin.H{
					"error": "La cuenta no existe o no te pertenece",
				})
				return
			}
		}

		// Actualizar default_account_id y retornar el user completo
		var updateQuery string
		var args []interface{}

		if req.AccountID == nil || *req.AccountID == "" {
			// Limpiar default account (set to NULL)
			updateQuery = `
				UPDATE users 
				SET default_account_id = NULL, updated_at = NOW()
				WHERE id = $1
				RETURNING id, email, name, default_account_id, created_at::TEXT
			`
			args = []interface{}{userID}
		} else {
			// Setear default account
			updateQuery = `
				UPDATE users 
				SET default_account_id = $1, updated_at = NOW()
				WHERE id = $2
				RETURNING id, email, name, default_account_id, created_at::TEXT
			`
			args = []interface{}{*req.AccountID, userID}
		}

		var user UserProfileResponse
		var defaultAccountID *string
		var createdAt string

		err := pool.QueryRow(ctx, updateQuery, args...).Scan(
			&user.ID,
			&user.Email,
			&user.Name,
			&defaultAccountID,
			&createdAt,
		)

		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error":   "Error actualizando cuenta predeterminada",
				"details": err.Error(),
			})
			return
		}

		user.DefaultAccountID = defaultAccountID
		user.CreatedAt = createdAt

		// Log de actualización
		logger.Info("user.default_account.updated", "Cuenta predeterminada actualizada", map[string]interface{}{
			"user_id":    userID,
			"account_id": req.AccountID,
			"ip":         c.ClientIP(),
		})

		c.JSON(http.StatusOK, user)
	}
}
