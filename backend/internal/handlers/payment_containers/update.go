package payment_containers

import (
	"context"
	"errors"
	"net/http"
	"strings"

	"github.com/LorenzoCampos/avaltra/internal/middleware"
	"github.com/LorenzoCampos/avaltra/internal/transactions"
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5"
)

func UpdatePaymentContainer(db querier) gin.HandlerFunc {
	return func(c *gin.Context) {
		accountID, ok := middleware.GetAccountID(c)
		if !ok {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Header X-Account-ID es requerido"})
			return
		}

		var req UpdatePaymentContainerRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Datos inválidos", "details": err.Error()})
			return
		}
		if req.Name.Set && req.Name.Value != nil {
			trimmed := strings.TrimSpace(*req.Name.Value)
			if trimmed == "" {
				c.JSON(http.StatusBadRequest, gin.H{"error": "El nombre del contenedor no puede estar vacío"})
				return
			}
			req.Name.Value = &trimmed
		}
		if req.Kind.Set && req.Kind.Value != nil {
			if err := transactions.ValidatePaymentContainerKind(*req.Kind.Value); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
				return
			}
		}

		container, err := scanPaymentContainer(db.QueryRow(c.Request.Context(), `UPDATE payment_containers
			SET name = COALESCE($1, name), kind = COALESCE($2, kind), institution_id = CASE WHEN $3 THEN $4 ELSE institution_id END, is_active = COALESCE($5, is_active), updated_at = NOW()
			WHERE id = $6 AND account_id = $7
			RETURNING id, account_id, institution_id::TEXT, name, kind, is_active, created_at, updated_at`, req.Name.Value, req.Kind.Value, req.InstitutionID.Set, req.InstitutionID.Value, req.IsActive, c.Param("id"), accountID))
		if err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				c.JSON(http.StatusNotFound, gin.H{"error": "Contenedor de pago no encontrado"})
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Error actualizando contenedor de pago", "details": err.Error()})
			return
		}
		c.JSON(http.StatusOK, container)
	}
}

func UpdatePaymentInstrument(db querier) gin.HandlerFunc {
	return func(c *gin.Context) {
		accountID, ok := middleware.GetAccountID(c)
		if !ok {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Header X-Account-ID es requerido"})
			return
		}

		var req UpdatePaymentInstrumentRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Datos inválidos", "details": err.Error()})
			return
		}
		if req.Name.Set && req.Name.Value != nil {
			trimmed := strings.TrimSpace(*req.Name.Value)
			if trimmed == "" {
				c.JSON(http.StatusBadRequest, gin.H{"error": "El nombre del instrumento no puede estar vacío"})
				return
			}
			req.Name.Value = &trimmed
		}
		kind := ""
		if req.Kind.Set && req.Kind.Value != nil {
			kind = *req.Kind.Value
			if err := transactions.ValidatePaymentInstrumentBackingContainer(kind, nil); err != nil {
				if errors.Is(err, transactions.ErrBackingContainerRequired) && req.BackingContainerID.Set {
					// The explicit backing_container_id below decides whether this card update is valid.
				} else {
					c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
					return
				}
			}
		}
		var backingID any
		if req.BackingContainerID.Set {
			parsedBackingID, err := parseOptionalUUID(req.BackingContainerID.Value)
			if err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "backing_container_id inválido"})
				return
			}
			backingID = parsedBackingID
			if kind == "" && parsedBackingID == nil {
				currentKind, err := paymentInstrumentKind(c.Request.Context(), db, c.Param("id"), accountID)
				if err != nil {
					if errors.Is(err, pgx.ErrNoRows) {
						c.JSON(http.StatusNotFound, gin.H{"error": "Instrumento de pago no encontrado"})
						return
					}
					c.JSON(http.StatusInternalServerError, gin.H{"error": "Error verificando instrumento de pago", "details": err.Error()})
					return
				}
				kind = currentKind
			}
			if kind != "" {
				if err := transactions.ValidatePaymentInstrumentBackingContainer(kind, parsedBackingID); err != nil {
					c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
					return
				}
			}
			if exists, err := containerExists(c.Request.Context(), db, accountID, parsedBackingID); err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Error verificando contenedor respaldatorio", "details": err.Error()})
				return
			} else if !exists {
				c.JSON(http.StatusBadRequest, gin.H{"error": "backing_container_id no pertenece a la cuenta"})
				return
			}
		}

		instrument, err := scanPaymentInstrument(db.QueryRow(c.Request.Context(), `UPDATE payment_instruments
			SET name = COALESCE($1, name), kind = COALESCE($2, kind), institution_id = CASE WHEN $3 THEN $4 ELSE institution_id END, backing_container_id = CASE WHEN $5 THEN $6 ELSE backing_container_id END, is_active = COALESCE($7, is_active), updated_at = NOW()
			WHERE id = $8 AND account_id = $9
			RETURNING id, account_id, institution_id::TEXT, backing_container_id::TEXT, name, kind, is_active, created_at, updated_at`, req.Name.Value, req.Kind.Value, req.InstitutionID.Set, req.InstitutionID.Value, req.BackingContainerID.Set, backingID, req.IsActive, c.Param("id"), accountID))
		if err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				c.JSON(http.StatusNotFound, gin.H{"error": "Instrumento de pago no encontrado"})
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Error actualizando instrumento de pago", "details": err.Error()})
			return
		}
		c.JSON(http.StatusOK, instrument)
	}
}

func paymentInstrumentKind(ctx context.Context, db querier, instrumentID string, accountID string) (string, error) {
	var kind string
	err := db.QueryRow(ctx, `SELECT kind FROM payment_instruments WHERE id = $1 AND account_id = $2`, instrumentID, accountID).Scan(&kind)
	return kind, err
}
