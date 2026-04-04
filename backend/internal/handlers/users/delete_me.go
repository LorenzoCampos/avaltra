package users

import (
	"net/http"

	"github.com/LorenzoCampos/avaltra/internal/middleware"
	"github.com/LorenzoCampos/avaltra/pkg/logger"
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	"golang.org/x/crypto/bcrypt"
)

// DeleteMeRequest representa la request para eliminar cuenta
type DeleteMeRequest struct {
	Password     string `json:"password" binding:"required"`
	Confirmation string `json:"confirmation" binding:"required"` // Debe ser exactamente "DELETE"
}

// DeleteMe maneja DELETE /api/users/me
// Elimina la cuenta del usuario y TODOS sus datos asociados
// DANGER ZONE: Esta acción NO se puede deshacer
func DeleteMe(pool *pgxpool.Pool) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Obtener user_id del contexto
		userID, exists := middleware.GetUserID(c)
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": "Usuario no autenticado",
			})
			return
		}

		var req DeleteMeRequest

		// Validar JSON
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"error":   "Datos inválidos",
				"details": err.Error(),
			})
			return
		}

		// Verificar que la confirmación sea exactamente "DELETE"
		if req.Confirmation != "DELETE" {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "Para confirmar, debes escribir exactamente 'DELETE'",
			})
			return
		}

		ctx := c.Request.Context()

		// Obtener password hash actual de la DB
		var passwordHash string
		var email string
		query := `SELECT password_hash, email FROM users WHERE id = $1`

		err := pool.QueryRow(ctx, query, userID).Scan(&passwordHash, &email)
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{
				"error": "Usuario no encontrado",
			})
			return
		}

		// Verificar que la contraseña sea correcta
		err = bcrypt.CompareHashAndPassword([]byte(passwordHash), []byte(req.Password))
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": "Contraseña incorrecta",
			})
			return
		}

		// ELIMINAR USUARIO (CASCADE eliminará todas las cuentas y datos relacionados)
		// Gracias a las foreign keys con ON DELETE CASCADE en la DB
		deleteQuery := `DELETE FROM users WHERE id = $1`

		_, err = pool.Exec(ctx, deleteQuery, userID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error":   "Error eliminando cuenta",
				"details": err.Error(),
			})
			return
		}

		// Log de eliminación (antes de que se borre el user)
		logger.Info("user.deleted", "Usuario eliminó su cuenta", map[string]interface{}{
			"user_id": userID,
			"email":   email,
			"ip":      c.ClientIP(),
		})

		c.JSON(http.StatusOK, gin.H{
			"message": "Tu cuenta y todos tus datos han sido eliminados exitosamente",
		})
	}
}
