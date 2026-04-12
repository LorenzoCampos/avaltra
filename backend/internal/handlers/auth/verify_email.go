package auth

import (
	"net/http"

	pkgauth "github.com/LorenzoCampos/avaltra/pkg/auth"
	"github.com/LorenzoCampos/avaltra/pkg/logger"
	"github.com/gin-gonic/gin"
)

// VerifyEmailRequest representa el JSON para verificar el email
type VerifyEmailRequest struct {
	Token string `json:"token" binding:"required"`
}

// VerifyEmail maneja el endpoint POST /api/auth/verify-email
func (h *Handler) VerifyEmail(c *gin.Context) {
	var req VerifyEmailRequest

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

	// Buscar el token en email_tokens — debe ser de tipo verification,
	// no usado y no expirado
	var tokenID, userID string
	lookupQuery := `
		SELECT id, user_id
		FROM email_tokens
		WHERE token_hash = $1
		  AND token_type = 'verification'
		  AND used_at IS NULL
		  AND expires_at > NOW()
	`
	err := h.db.Pool.QueryRow(ctx, lookupQuery, hashedToken).Scan(&tokenID, &userID)
	if err != nil {
		logger.Security("auth.verify_email.invalid_token", "Intento de verificación con token inválido o expirado", map[string]interface{}{
			"ip": c.ClientIP(),
		})
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Token inválido o expirado",
		})
		return
	}

	// Marcar el email como verificado
	updateQuery := "UPDATE users SET email_verified = true, updated_at = NOW() WHERE id = $1"
	_, err = h.db.Pool.Exec(ctx, updateQuery, userID)
	if err != nil {
		logger.Error("auth.verify_email.update_error", "Error actualizando email_verified", map[string]interface{}{
			"user_id": userID,
			"error":   err.Error(),
		})
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Error verificando el email",
		})
		return
	}

	// Marcar el token como usado
	markUsedQuery := "UPDATE email_tokens SET used_at = NOW() WHERE id = $1"
	_, err = h.db.Pool.Exec(ctx, markUsedQuery, tokenID)
	if err != nil {
		// No crítico — el email ya fue marcado como verificado; solo logueamos
		logger.Error("auth.verify_email.mark_used_error", "Error marcando token como usado", map[string]interface{}{
			"token_id": tokenID,
			"user_id":  userID,
			"error":    err.Error(),
		})
	}

	logger.Security("auth.verify_email.success", "Email verificado exitosamente", map[string]interface{}{
		"user_id": userID,
		"ip":      c.ClientIP(),
	})

	c.JSON(http.StatusOK, gin.H{"message": "Email verificado"})
}
