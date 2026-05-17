package payment_containers

import (
	"net/http"
	"strings"

	"github.com/LorenzoCampos/avaltra/internal/middleware"
	"github.com/LorenzoCampos/avaltra/internal/transactions"
	"github.com/gin-gonic/gin"
)

func CreatePaymentContainer(db querier) gin.HandlerFunc {
	return func(c *gin.Context) {
		accountID, ok := middleware.GetAccountID(c)
		if !ok {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Header X-Account-ID es requerido"})
			return
		}

		var req CreatePaymentContainerRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Datos inválidos", "details": err.Error()})
			return
		}

		req.Name = strings.TrimSpace(req.Name)
		if req.Name == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "El nombre del contenedor no puede estar vacío"})
			return
		}
		if err := transactions.ValidatePaymentContainerKind(req.Kind); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		container, err := scanPaymentContainer(db.QueryRow(c.Request.Context(), `INSERT INTO payment_containers (account_id, institution_id, name, kind, is_active)
			VALUES ($1, $2, $3, $4, true)
			RETURNING id, account_id, institution_id::TEXT, name, kind, is_active, created_at, updated_at`, accountID, req.InstitutionID, req.Name, req.Kind))
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Error creando contenedor de pago", "details": err.Error()})
			return
		}

		c.JSON(http.StatusCreated, container)
	}
}

func CreatePaymentInstrument(db querier) gin.HandlerFunc {
	return func(c *gin.Context) {
		accountID, ok := middleware.GetAccountID(c)
		if !ok {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Header X-Account-ID es requerido"})
			return
		}

		var req CreatePaymentInstrumentRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Datos inválidos", "details": err.Error()})
			return
		}

		req.Name = strings.TrimSpace(req.Name)
		if req.Name == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "El nombre del instrumento no puede estar vacío"})
			return
		}
		backingID, err := parseOptionalUUID(req.BackingContainerID)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "backing_container_id inválido"})
			return
		}
		if err := transactions.ValidatePaymentInstrumentBackingContainer(req.Kind, backingID); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		if exists, err := containerExists(c.Request.Context(), db, accountID, backingID); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Error verificando contenedor respaldatorio", "details": err.Error()})
			return
		} else if !exists {
			c.JSON(http.StatusBadRequest, gin.H{"error": "backing_container_id no pertenece a la cuenta"})
			return
		}

		instrument, err := scanPaymentInstrument(db.QueryRow(c.Request.Context(), `INSERT INTO payment_instruments (account_id, institution_id, backing_container_id, name, kind, is_active)
			VALUES ($1, $2, $3, $4, $5, true)
			RETURNING id, account_id, institution_id::TEXT, backing_container_id::TEXT, name, kind, is_active, created_at, updated_at`, accountID, req.InstitutionID, backingID, req.Name, req.Kind))
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Error creando instrumento de pago", "details": err.Error()})
			return
		}

		c.JSON(http.StatusCreated, instrument)
	}
}
