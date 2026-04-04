package users

import (
	"net/http"

	"github.com/LorenzoCampos/avaltra/internal/middleware"
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
)

// UserProfileResponse representa el perfil del usuario
type UserProfileResponse struct {
	ID               string  `json:"id"`
	Email            string  `json:"email"`
	Name             string  `json:"name"`
	DefaultAccountID *string `json:"default_account_id,omitempty"`
	CreatedAt        string  `json:"created_at"`
}

// GetMe maneja GET /api/users/me
// Retorna el perfil del usuario autenticado
func GetMe(pool *pgxpool.Pool) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Obtener user_id del contexto (middleware de autenticación)
		userID, exists := middleware.GetUserID(c)
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": "Usuario no autenticado",
			})
			return
		}

		ctx := c.Request.Context()

		// Query para obtener datos del usuario
		query := `
			SELECT id, email, name, default_account_id, created_at::TEXT
			FROM users
			WHERE id = $1
		`

		var user UserProfileResponse
		var defaultAccountID *string
		var createdAt string

		err := pool.QueryRow(ctx, query, userID).Scan(
			&user.ID,
			&user.Email,
			&user.Name,
			&defaultAccountID,
			&createdAt,
		)

		if err != nil {
			// Log the actual error for debugging
			c.JSON(http.StatusNotFound, gin.H{
				"error":   "Usuario no encontrado",
				"details": err.Error(), // Remove this in production
			})
			return
		}

		user.DefaultAccountID = defaultAccountID
		user.CreatedAt = createdAt

		c.JSON(http.StatusOK, user)
	}
}
