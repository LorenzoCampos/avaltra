package auth

import (
	"net/http"
	"strings"

	pkgauth "github.com/LorenzoCampos/avaltra/pkg/auth"
	"github.com/LorenzoCampos/avaltra/pkg/logger"
	"github.com/gin-gonic/gin"
)

// ResendVerificationRequest representa el JSON para reenviar el email de verificación
type ResendVerificationRequest struct {
	Email string `json:"email" binding:"required,email"`
}

// ResendVerification maneja el endpoint POST /api/auth/resend-verification
// Siempre retorna 200 para evitar enumeración de emails (anti-enumeration pattern)
func (h *Handler) ResendVerification(c *gin.Context) {
	var req ResendVerificationRequest

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
	genericResponse := gin.H{"message": "Si el email existe y no está verificado, recibirás un email"}

	// Buscar usuario por email — debe existir y NO estar ya verificado
	var userID string
	var emailVerified bool
	query := "SELECT id, email_verified FROM users WHERE email = $1"
	err := h.db.Pool.QueryRow(ctx, query, req.Email).Scan(&userID, &emailVerified)
	if err != nil {
		// Usuario no encontrado — retornar 200 igual (anti-enumeration)
		c.JSON(http.StatusOK, genericResponse)
		return
	}

	// Si el email ya está verificado, retornar 200 igual (anti-enumeration)
	if emailVerified {
		c.JSON(http.StatusOK, genericResponse)
		return
	}

	// Eliminar tokens de verificación previos no usados para este usuario
	deleteQuery := `
		DELETE FROM email_tokens
		WHERE user_id = $1
		  AND token_type = 'verification'
		  AND used_at IS NULL
	`
	_, err = h.db.Pool.Exec(ctx, deleteQuery, userID)
	if err != nil {
		logger.Error("auth.resend_verification.delete_tokens_error", "Error eliminando tokens previos", map[string]interface{}{
			"user_id": userID,
			"error":   err.Error(),
		})
		c.JSON(http.StatusOK, genericResponse)
		return
	}

	// Generar nuevo token de verificación
	rawToken, hashedToken, err := pkgauth.GenerateToken()
	if err != nil {
		logger.Error("auth.resend_verification.token_error", "Error generando token de verificación", map[string]interface{}{
			"user_id": userID,
			"error":   err.Error(),
		})
		c.JSON(http.StatusOK, genericResponse)
		return
	}

	// Insertar nuevo token con expiración de 24 horas
	insertQuery := `
		INSERT INTO email_tokens (user_id, token_hash, token_type, expires_at)
		VALUES ($1, $2, 'verification', NOW() + INTERVAL '24 hours')
	`
	_, err = h.db.Pool.Exec(ctx, insertQuery, userID, hashedToken)
	if err != nil {
		logger.Error("auth.resend_verification.insert_token_error", "Error insertando token de verificación", map[string]interface{}{
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
		if err := emailSender.SendVerificationEmail(req.Email, rawToken, frontendURL); err != nil {
			logger.Error("auth.resend_verification.email_error", "Error enviando email de verificación", map[string]interface{}{
				"user_id": userID,
				"email":   req.Email,
				"error":   err.Error(),
			})
		}
	}()

	c.JSON(http.StatusOK, genericResponse)
}
