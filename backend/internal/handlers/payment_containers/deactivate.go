package payment_containers

import (
	"errors"
	"net/http"

	"github.com/LorenzoCampos/avaltra/internal/middleware"
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5"
)

func DeactivatePaymentContainer(db querier) gin.HandlerFunc {
	return func(c *gin.Context) {
		accountID, ok := middleware.GetAccountID(c)
		if !ok {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Header X-Account-ID es requerido"})
			return
		}
		container, err := scanPaymentContainer(db.QueryRow(c.Request.Context(), `UPDATE payment_containers
			SET is_active = false, updated_at = NOW()
			WHERE id = $1 AND account_id = $2
			RETURNING id, account_id, institution_id::TEXT, name, kind, is_active, created_at, updated_at`, c.Param("id"), accountID))
		if err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				c.JSON(http.StatusNotFound, gin.H{"error": "Contenedor de pago no encontrado"})
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Error desactivando contenedor de pago", "details": err.Error()})
			return
		}
		c.JSON(http.StatusOK, container)
	}
}

func DeactivatePaymentInstrument(db querier) gin.HandlerFunc {
	return func(c *gin.Context) {
		accountID, ok := middleware.GetAccountID(c)
		if !ok {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Header X-Account-ID es requerido"})
			return
		}
		instrument, err := scanPaymentInstrument(db.QueryRow(c.Request.Context(), `UPDATE payment_instruments
			SET is_active = false, updated_at = NOW()
			WHERE id = $1 AND account_id = $2
			RETURNING id, account_id, institution_id::TEXT, backing_container_id::TEXT, name, kind, is_active, created_at, updated_at`, c.Param("id"), accountID))
		if err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				c.JSON(http.StatusNotFound, gin.H{"error": "Instrumento de pago no encontrado"})
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Error desactivando instrumento de pago", "details": err.Error()})
			return
		}
		c.JSON(http.StatusOK, instrument)
	}
}
