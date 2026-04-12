package auth

import (
	"net/http"

	pkgauth "github.com/LorenzoCampos/avaltra/pkg/auth"
	"github.com/LorenzoCampos/avaltra/pkg/logger"
	"github.com/gin-gonic/gin"
)

// ResetPasswordRequest representa el JSON para resetear la contraseña
type ResetPasswordRequest struct {
	Token    string `json:"token" binding:"required"`
	Password string `json:"password" binding:"required,min=8"`
}

// ResetPassword maneja el endpoint POST /api/auth/reset-password
func (h *Handler) ResetPassword(c *gin.Context) {
	var req ResetPasswordRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Datos inválidos",
			"details": err.Error(),
		})
		return
	}

	ctx := c.Request.Context()

	// Hashear el token recibido para comparar contra la DB
	hashedToken := pkgauth.HashToken(req.Token)

	// Buscar el token en email_tokens — debe ser de tipo password_reset,
	// no usado y no expirado
	var tokenID, userID string
	lookupQuery := `
		SELECT id, user_id
		FROM email_tokens
		WHERE token_hash = $1
		  AND token_type = 'password_reset'
		  AND used_at IS NULL
		  AND expires_at > NOW()
	`
	err := h.db.Pool.QueryRow(ctx, lookupQuery, hashedToken).Scan(&tokenID, &userID)
	if err != nil {
		logger.Security("auth.reset_password.invalid_token", "Intento de reset con token inválido o expirado", map[string]interface{}{
			"ip": c.ClientIP(),
		})
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Token inválido o expirado",
		})
		return
	}

	// Hashear la nueva contraseña con bcrypt
	passwordHash, err := pkgauth.HashPassword(req.Password)
	if err != nil {
		logger.Error("auth.reset_password.hash_error", "Error hasheando contraseña", map[string]interface{}{
			"user_id": userID,
			"error":   err.Error(),
		})
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Error procesando la contraseña",
		})
		return
	}

	// Actualizar la contraseña del usuario
	updateQuery := "UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2"
	_, err = h.db.Pool.Exec(ctx, updateQuery, passwordHash, userID)
	if err != nil {
		logger.Error("auth.reset_password.update_error", "Error actualizando contraseña", map[string]interface{}{
			"user_id": userID,
			"error":   err.Error(),
		})
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Error actualizando la contraseña",
		})
		return
	}

	// Marcar el token como usado
	markUsedQuery := "UPDATE email_tokens SET used_at = NOW() WHERE id = $1"
	_, err = h.db.Pool.Exec(ctx, markUsedQuery, tokenID)
	if err != nil {
		// No crítico — la contraseña ya fue cambiada; solo logueamos
		logger.Error("auth.reset_password.mark_used_error", "Error marcando token como usado", map[string]interface{}{
			"token_id": tokenID,
			"user_id":  userID,
			"error":    err.Error(),
		})
	}

	logger.Security("auth.reset_password.success", "Contraseña reseteada exitosamente", map[string]interface{}{
		"user_id": userID,
		"ip":      c.ClientIP(),
	})

	c.JSON(http.StatusOK, gin.H{"message": "Contraseña actualizada"})
}
