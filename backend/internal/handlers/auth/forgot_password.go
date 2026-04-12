package auth

import (
	"net/http"
	"strings"

	pkgauth "github.com/LorenzoCampos/avaltra/pkg/auth"
	"github.com/LorenzoCampos/avaltra/pkg/logger"
	"github.com/gin-gonic/gin"
)

// ForgotPasswordRequest representa el JSON para solicitar un reset de contraseña
type ForgotPasswordRequest struct {
	Email string `json:"email" binding:"required,email"`
}

// ForgotPassword maneja el endpoint POST /api/auth/forgot-password
// Siempre retorna 200 para evitar enumeración de emails (anti-enumeration pattern)
func (h *Handler) ForgotPassword(c *gin.Context) {
	var req ForgotPasswordRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Datos inválidos",
			"details": err.Error(),
		})
		return
	}

	// Normalizar email
	req.Email = strings.ToLower(strings.TrimSpace(req.Email))

	ctx := c.Request.Context()

	// Mensaje genérico: siempre el mismo, independientemente de si el usuario existe
	genericResponse := gin.H{"message": "Si el email existe, recibirás instrucciones"}

	// Buscar el usuario por email
	var userID string
	query := "SELECT id FROM users WHERE email = $1"
	err := h.db.Pool.QueryRow(ctx, query, req.Email).Scan(&userID)
	if err != nil {
		// Usuario no encontrado — retornar 200 igual (anti-enumeration)
		c.JSON(http.StatusOK, genericResponse)
		return
	}

	// Generar token
	rawToken, hashedToken, err := pkgauth.GenerateToken()
	if err != nil {
		logger.Error("auth.forgot_password.token_error", "Error generando token de reset", map[string]interface{}{
			"user_id": userID,
			"error":   err.Error(),
		})
		// Aún retornamos 200 para no revelar que el usuario existe
		c.JSON(http.StatusOK, genericResponse)
		return
	}

	// Eliminar tokens de reset previos no usados para este usuario
	deleteQuery := `
		DELETE FROM email_tokens
		WHERE user_id = $1
		  AND token_type = 'password_reset'
		  AND used_at IS NULL
	`
	_, err = h.db.Pool.Exec(ctx, deleteQuery, userID)
	if err != nil {
		logger.Error("auth.forgot_password.delete_tokens_error", "Error eliminando tokens previos", map[string]interface{}{
			"user_id": userID,
			"error":   err.Error(),
		})
		c.JSON(http.StatusOK, genericResponse)
		return
	}

	// Insertar nuevo token con expiración de 1 hora
	insertQuery := `
		INSERT INTO email_tokens (user_id, token_hash, token_type, expires_at)
		VALUES ($1, $2, 'password_reset', NOW() + INTERVAL '1 hour')
	`
	_, err = h.db.Pool.Exec(ctx, insertQuery, userID, hashedToken)
	if err != nil {
		logger.Error("auth.forgot_password.insert_token_error", "Error insertando token de reset", map[string]interface{}{
			"user_id": userID,
			"error":   err.Error(),
		})
		c.JSON(http.StatusOK, genericResponse)
		return
	}

	// Enviar email en goroutine (fire and forget — no bloquea la respuesta)
	emailSender := h.emailSender
	frontendURL := h.config.FrontendURL
	go func() {
		if err := emailSender.SendPasswordResetEmail(req.Email, rawToken, frontendURL); err != nil {
			logger.Error("auth.forgot_password.email_error", "Error enviando email de reset", map[string]interface{}{
				"user_id": userID,
				"email":   req.Email,
				"error":   err.Error(),
			})
		}
	}()

	c.JSON(http.StatusOK, genericResponse)
}
