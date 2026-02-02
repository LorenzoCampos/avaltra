package users

import (
	"net/http"

	"github.com/LorenzoCampos/bolsillo-claro/internal/middleware"
	"github.com/LorenzoCampos/bolsillo-claro/pkg/logger"
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	"golang.org/x/crypto/bcrypt"
)

// ChangePasswordRequest representa la request para cambiar password
type ChangePasswordRequest struct {
	CurrentPassword string `json:"current_password" binding:"required"`
	NewPassword     string `json:"new_password" binding:"required,min=8"`
}

// ChangePassword maneja PUT /api/users/me/password
// Cambia la contraseña del usuario (requiere contraseña actual)
func ChangePassword(pool *pgxpool.Pool) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Obtener user_id del contexto
		userID, exists := middleware.GetUserID(c)
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": "Usuario no autenticado",
			})
			return
		}

		var req ChangePasswordRequest

		// Validar JSON
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"error":   "Datos inválidos",
				"details": err.Error(),
			})
			return
		}

		ctx := c.Request.Context()

		// Obtener password hash actual de la DB
		var currentPasswordHash string
		query := `SELECT password_hash FROM users WHERE id = $1`

		err := pool.QueryRow(ctx, query, userID).Scan(&currentPasswordHash)
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{
				"error": "Usuario no encontrado",
			})
			return
		}

		// Verificar que la contraseña actual sea correcta
		err = bcrypt.CompareHashAndPassword([]byte(currentPasswordHash), []byte(req.CurrentPassword))
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": "La contraseña actual es incorrecta",
			})
			return
		}

		// Hashear nueva contraseña
		newPasswordHash, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), bcrypt.DefaultCost)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": "Error procesando nueva contraseña",
			})
			return
		}

		// Actualizar contraseña en DB
		updateQuery := `
			UPDATE users 
			SET password_hash = $1, updated_at = NOW()
			WHERE id = $2
		`

		_, err = pool.Exec(ctx, updateQuery, string(newPasswordHash), userID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error":   "Error actualizando contraseña",
				"details": err.Error(),
			})
			return
		}

		// Log de cambio de password (sin datos sensibles)
		logger.Info("user.password.changed", "Contraseña de usuario cambiada", map[string]interface{}{
			"user_id": userID,
			"ip":      c.ClientIP(),
		})

		c.JSON(http.StatusOK, gin.H{
			"message": "Contraseña actualizada exitosamente",
		})
	}
}
