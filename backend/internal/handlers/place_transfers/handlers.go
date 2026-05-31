package place_transfers

import (
	"context"
	"database/sql"
	"errors"
	"net/http"
	"strings"
	"time"

	"github.com/LorenzoCampos/avaltra/internal/middleware"
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5"
)

func CreatePlaceTransfer(db querier) gin.HandlerFunc {
	return func(c *gin.Context) {
		accountID, ok := middleware.GetAccountID(c)
		if !ok {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Header X-Account-ID es requerido"})
			return
		}

		var req CreatePlaceTransferRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Datos inválidos", "details": err.Error()})
			return
		}

		transferDate, err := validateCreateRequest(req)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		if err := validateActivePlaces(c.Request.Context(), db, accountID, req.SourceContainerID, req.DestinationContainerID); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		transfer, err := scanPlaceTransfer(db.QueryRow(c.Request.Context(), `INSERT INTO place_transfers (account_id, source_container_id, destination_container_id, amount, currency, date, note)
			VALUES ($1, $2, $3, $4, $5, $6, $7)
			RETURNING id, account_id,
				source_container_id, (SELECT name FROM payment_containers WHERE id = source_container_id) AS source_container_name,
				destination_container_id, (SELECT name FROM payment_containers WHERE id = destination_container_id) AS destination_container_name,
				amount, currency, date, note, created_at, updated_at`, accountID, req.SourceContainerID, req.DestinationContainerID, req.Amount, accountCurrencyARS, transferDate, normalizedNote(req.Note)))
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Error creando transferencia entre lugares", "details": err.Error()})
			return
		}

		c.JSON(http.StatusCreated, transfer)
	}
}

func ListPlaceTransfers(db querier) gin.HandlerFunc {
	return func(c *gin.Context) {
		accountID, ok := middleware.GetAccountID(c)
		if !ok {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Header X-Account-ID es requerido"})
			return
		}

		rows, err := db.Query(c.Request.Context(), `SELECT pt.id, pt.account_id,
			pt.source_container_id, source.name AS source_container_name,
			pt.destination_container_id, destination.name AS destination_container_name,
			pt.amount, pt.currency, pt.date, pt.note, pt.created_at, pt.updated_at
			FROM place_transfers pt
			JOIN payment_containers source ON source.id = pt.source_container_id
			JOIN payment_containers destination ON destination.id = pt.destination_container_id
			WHERE pt.account_id = $1 AND pt.deleted_at IS NULL
			ORDER BY pt.date DESC, pt.created_at DESC`, accountID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Error obteniendo transferencias entre lugares", "details": err.Error()})
			return
		}
		defer rows.Close()

		transfers := []PlaceTransferResponse{}
		for rows.Next() {
			transfer, err := scanPlaceTransfer(rows)
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Error leyendo transferencias entre lugares", "details": err.Error()})
				return
			}
			transfers = append(transfers, transfer)
		}
		if err := rows.Err(); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Error procesando transferencias entre lugares", "details": err.Error()})
			return
		}

		c.JSON(http.StatusOK, gin.H{"place_transfers": transfers, "count": len(transfers)})
	}
}

func CancelPlaceTransfer(db querier) gin.HandlerFunc {
	return func(c *gin.Context) {
		accountID, ok := middleware.GetAccountID(c)
		if !ok {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Header X-Account-ID es requerido"})
			return
		}

		transferID := strings.TrimSpace(c.Param("id"))
		if transferID == "" {
			c.JSON(http.StatusNotFound, gin.H{"error": "Transferencia entre lugares no encontrada"})
			return
		}

		var response CancelPlaceTransferResponse
		err := db.QueryRow(c.Request.Context(), `UPDATE place_transfers
			SET deleted_at = COALESCE(deleted_at, NOW()), updated_at = NOW()
			WHERE id = $1 AND account_id = $2
			RETURNING id, 'canceled', deleted_at`, transferID, accountID).
			Scan(&response.ID, &response.Status, &response.CanceledAt)
		if errors.Is(err, pgx.ErrNoRows) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Transferencia entre lugares no encontrada"})
			return
		}
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Error cancelando transferencia entre lugares", "details": err.Error()})
			return
		}

		c.JSON(http.StatusOK, response)
	}
}

func validateCreateRequest(req CreatePlaceTransferRequest) (time.Time, error) {
	if strings.TrimSpace(req.SourceContainerID) == "" {
		return time.Time{}, errors.New("source-place-required")
	}
	if strings.TrimSpace(req.DestinationContainerID) == "" {
		return time.Time{}, errors.New("destination-place-required")
	}
	if req.SourceContainerID == req.DestinationContainerID {
		return time.Time{}, errors.New("source-destination-must-differ")
	}
	if req.Currency != nil && strings.TrimSpace(*req.Currency) != "" && strings.TrimSpace(*req.Currency) != accountCurrencyARS {
		return time.Time{}, errors.New("currency-mismatch-not-supported")
	}
	if req.Amount <= 0 {
		return time.Time{}, errors.New("amount-must-be-positive")
	}
	date, err := time.Parse("2006-01-02", strings.TrimSpace(req.Date))
	if err != nil {
		return time.Time{}, errors.New("date-required")
	}
	return date, nil
}

func validateActivePlaces(ctx context.Context, db querier, accountID, sourceID, destinationID string) error {
	var count int
	err := db.QueryRow(ctx, `SELECT COUNT(*) FROM payment_containers WHERE account_id = $1 AND is_active = true AND id IN ($2, $3)`, accountID, sourceID, destinationID).Scan(&count)
	if err != nil {
		return err
	}
	if count != 2 {
		return errors.New("invalid-place-account")
	}
	return nil
}

func scanPlaceTransfer(row interface{ Scan(dest ...any) error }) (PlaceTransferResponse, error) {
	var transfer PlaceTransferResponse
	var note sql.NullString
	err := row.Scan(&transfer.ID, &transfer.AccountID, &transfer.SourceContainerID, &transfer.SourceContainerName, &transfer.DestinationContainerID, &transfer.DestinationContainerName, &transfer.Amount, &transfer.Currency, &transfer.Date, &note, &transfer.CreatedAt, &transfer.UpdatedAt)
	if note.Valid {
		transfer.Note = &note.String
	}
	return transfer, err
}

func normalizedNote(note *string) *string {
	if note == nil {
		return nil
	}
	trimmed := strings.TrimSpace(*note)
	if trimmed == "" {
		return nil
	}
	return &trimmed
}
