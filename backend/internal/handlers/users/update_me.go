package users

import (
	"net/http"
	"strings"

	"github.com/LorenzoCampos/avaltra/internal/middleware"
	"github.com/LorenzoCampos/avaltra/pkg/logger"
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
)

// UpdateMeRequest representa la request para actualizar perfil
type UpdateMeRequest struct {
	Name string `json:"name" binding:"required,min=1,max=255"`
}

// UpdateMe maneja PUT /api/users/me
// Actualiza el nombre del usuario (email NO se puede cambiar)
func UpdateMe(pool *pgxpool.Pool) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Obtener user_id del contexto
		userID, exists := middleware.GetUserID(c)
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": "Usuario no autenticado",
			})
			return
		}

		var req UpdateMeRequest

		// Validar JSON
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"error":   "Datos inválidos",
				"details": err.Error(),
			})
			return
		}

		// Limpiar espacios
		req.Name = strings.TrimSpace(req.Name)

		if req.Name == "" {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "El nombre no puede estar vacío",
			})
			return
		}

		ctx := c.Request.Context()

		// Actualizar nombre
		query := `
			UPDATE users 
			SET name = $1, updated_at = NOW()
			WHERE id = $2
			RETURNING id, email, name, default_account_id, created_at::TEXT
		`

		var user UserProfileResponse
		var defaultAccountID *string
		var createdAt string

		err := pool.QueryRow(ctx, query, req.Name, userID).Scan(
			&user.ID,
			&user.Email,
			&user.Name,
			&defaultAccountID,
			&createdAt,
		)

		if err != nil {
			logger.Error("user.update.failed", "Error actualizando perfil", map[string]interface{}{
				"user_id": userID,
				"error":   err.Error(),
				"ip":      c.ClientIP(),
			})
			c.JSON(http.StatusInternalServerError, gin.H{
				"error":   "Error actualizando perfil",
				"details": err.Error(),
			})
			return
		}

		user.DefaultAccountID = defaultAccountID
		user.CreatedAt = createdAt

		// Log de actualización
		logger.Info("user.profile.updated", "Perfil de usuario actualizado", map[string]interface{}{
			"user_id": userID,
			"ip":      c.ClientIP(),
		})

		c.JSON(http.StatusOK, user)
	}
}
