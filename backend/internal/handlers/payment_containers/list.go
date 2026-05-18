package payment_containers

import (
	"net/http"

	"github.com/LorenzoCampos/avaltra/internal/middleware"
	"github.com/gin-gonic/gin"
)

func ListPaymentContainers(db querier) gin.HandlerFunc {
	return func(c *gin.Context) {
		accountID, ok := middleware.GetAccountID(c)
		if !ok {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Header X-Account-ID es requerido"})
			return
		}
		activeOnly := c.Query("include_inactive") != "true"

		rows, err := db.Query(c.Request.Context(), `SELECT id, account_id, institution_id::TEXT, name, kind, is_active, created_at, updated_at
			FROM payment_containers
			WHERE account_id = $1 AND ($2 = false OR is_active = true)
			ORDER BY name ASC`, accountID, activeOnly)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Error obteniendo contenedores de pago", "details": err.Error()})
			return
		}
		defer rows.Close()

		containers := []PaymentContainerResponse{}
		for rows.Next() {
			container, err := scanPaymentContainer(rows)
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Error leyendo contenedores de pago", "details": err.Error()})
				return
			}
			containers = append(containers, container)
		}
		if err := rows.Err(); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Error procesando contenedores de pago", "details": err.Error()})
			return
		}

		c.JSON(http.StatusOK, gin.H{"payment_containers": containers, "count": len(containers)})
	}
}

func ListPaymentInstruments(db querier) gin.HandlerFunc {
	return func(c *gin.Context) {
		accountID, ok := middleware.GetAccountID(c)
		if !ok {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Header X-Account-ID es requerido"})
			return
		}
		activeOnly := c.Query("include_inactive") != "true"

		rows, err := db.Query(c.Request.Context(), `SELECT id, account_id, institution_id::TEXT, backing_container_id::TEXT, name, kind, is_active, created_at, updated_at
			FROM payment_instruments
			WHERE account_id = $1 AND ($2 = false OR is_active = true)
			ORDER BY name ASC`, accountID, activeOnly)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Error obteniendo instrumentos de pago", "details": err.Error()})
			return
		}
		defer rows.Close()

		instruments := []PaymentInstrumentResponse{}
		for rows.Next() {
			instrument, err := scanPaymentInstrument(rows)
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Error leyendo instrumentos de pago", "details": err.Error()})
				return
			}
			instruments = append(instruments, instrument)
		}
		if err := rows.Err(); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Error procesando instrumentos de pago", "details": err.Error()})
			return
		}

		c.JSON(http.StatusOK, gin.H{"payment_instruments": instruments, "count": len(instruments)})
	}
}
