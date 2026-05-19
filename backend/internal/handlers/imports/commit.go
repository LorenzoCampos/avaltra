package imports

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type importStore interface {
	queryStore
	Begin(ctx context.Context) (pgx.Tx, error)
}

type rowQueryer interface {
	QueryRow(ctx context.Context, sql string, args ...any) pgx.Row
}

func CommitExcelTemplate(db *pgxpool.Pool) gin.HandlerFunc {
	return commitHandler(db)
}

func commitHandler(db importStore) gin.HandlerFunc {
	return func(c *gin.Context) {
		accountID, exists := c.Get("account_id")
		if !exists {
			c.JSON(http.StatusBadRequest, gin.H{"error": "account_id not found in context"})
			return
		}
		currency := c.PostForm("currency")
		if !isSupportedCurrency(currency) {
			c.JSON(http.StatusBadRequest, gin.H{"error": "currency must be one of ARS, USD, EUR"})
			return
		}

		var decisions commitDecisions
		if err := json.Unmarshal([]byte(c.PostForm("decisions")), &decisions); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid decisions payload"})
			return
		}
		if decisions.CategoryMap == nil {
			decisions.CategoryMap = map[string]string{}
		}

		workbook, err := readWorkbookUpload(c)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		rows, err := parseWorkbook(workbook)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		catalog, err := loadCategoryCatalog(c.Request.Context(), db, accountID.(string))
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to load categories"})
			return
		}

		approved := make(map[string]struct{}, len(decisions.ApprovedRowIDs))
		for _, rowID := range decisions.ApprovedRowIDs {
			approved[rowID] = struct{}{}
		}

		response := CommitResponse{Skipped: CommitSkippedSummary{ByReason: make(map[string]int)}}
		pendingRows := make([]PreviewRow, 0)
		for _, row := range rows {
			previewRow := classifyParsedRow(row, catalog)
			if previewRow.Classification != rowClassificationImportable {
				response.Skipped.Total++
				for _, reason := range previewRow.ReasonCodes {
					response.Skipped.ByReason[reason]++
				}
				continue
			}
			if _, ok := approved[previewRow.RowID]; !ok {
				response.Skipped.Total++
				response.Skipped.ByReason["not_approved"]++
				continue
			}
			if previewRow.CategoryMappingStatus == categoryMappingStatusRequired {
				categoryID := resolveDecisionCategoryID(decisions.CategoryMap, *previewRow.NormalizedType, derefString(previewRow.RawCategory))
				if categoryID == "" {
					c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("missing category mapping for %s", derefString(previewRow.RawCategory))})
					return
				}
				option, ok := catalog.visibleByID[categoryID]
				if !ok || option.Type != *previewRow.NormalizedType {
					c.JSON(http.StatusBadRequest, gin.H{"error": "category mapping type mismatch"})
					return
				}
				previewRow.SuggestedCategoryID = &option.ID
				previewRow.SuggestedCategoryName = &option.Name
				previewRow.CategoryMappingStatus = categoryMappingStatusResolved
			}
			pendingRows = append(pendingRows, previewRow)
		}

		tx, err := db.Begin(c.Request.Context())
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to begin transaction"})
			return
		}
		defer tx.Rollback(c.Request.Context())

		for _, row := range pendingRows {
			exchangeRate, amountInPrimary, err := resolveImportAmounts(c.Request.Context(), tx, accountID.(string), currency, *row.Amount, mustParseDate(*row.Date))
			if err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
				return
			}
			created, err := insertImportedRow(c.Request.Context(), tx, accountID.(string), currency, exchangeRate, amountInPrimary, row)
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to persist imported rows"})
				return
			}
			if !created {
				response.Skipped.Total++
				response.Skipped.ByReason["duplicate_import"]++
				continue
			}
			if *row.NormalizedType == normalizedTypeExpense {
				response.Created.Expense++
			} else {
				response.Created.Income++
			}
		}

		if err := tx.Commit(c.Request.Context()); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to commit import"})
			return
		}

		c.JSON(http.StatusOK, response)
	}
}

func resolveDecisionCategoryID(categoryMap map[string]string, normalizedTypeValue normalizedType, rawCategory string) string {
	for _, key := range categoryMappingLookupKeys(normalizedTypeValue, rawCategory) {
		if categoryID := categoryMap[key]; categoryID != "" {
			return categoryID
		}
	}
	return ""
}

func resolveImportAmounts(ctx context.Context, db rowQueryer, accountID, currency string, amount float64, date time.Time) (float64, float64, error) {
	var primaryCurrency string
	if err := db.QueryRow(ctx, `SELECT currency FROM accounts WHERE id = $1`, accountID).Scan(&primaryCurrency); err != nil {
		return 0, 0, fmt.Errorf("failed to get account currency")
	}
	if primaryCurrency == currency {
		return 1, amount, nil
	}

	var exchangeRate float64
	if err := db.QueryRow(ctx, `SELECT rate FROM exchange_rates WHERE from_currency = $1 AND to_currency = $2 AND rate_date = $3 ORDER BY created_at DESC LIMIT 1`, currency, primaryCurrency, date.Format("2006-01-02")).Scan(&exchangeRate); err != nil {
		return 0, 0, fmt.Errorf("missing exchange rate for %s", date.Format("2006-01-02"))
	}
	return exchangeRate, amount * exchangeRate, nil
}

func insertImportedRow(ctx context.Context, tx pgx.Tx, accountID, currency string, exchangeRate, amountInPrimary float64, row PreviewRow) (bool, error) {
	date := mustParseDate(*row.Date).Format("2006-01-02")
	fingerprint := importedRowFingerprint(accountID, currency, row)
	var createdID string
	switch *row.NormalizedType {
	case normalizedTypeExpense:
		err := tx.QueryRow(ctx, `INSERT INTO expenses (
			account_id, category_id, description, amount, currency, exchange_rate, amount_in_primary_currency, expense_type, date, payment_method, source_container_id, source_instrument_id, import_fingerprint
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
		ON CONFLICT (import_fingerprint) WHERE import_fingerprint IS NOT NULL DO NOTHING
		RETURNING id`, accountID, row.SuggestedCategoryID, row.Description, *row.Amount, currency, exchangeRate, amountInPrimary, "one-time", date, row.PaymentMethod, row.SourceContainerID, row.SourceInstrumentID, fingerprint).Scan(&createdID)
		if err == pgx.ErrNoRows {
			return false, nil
		}
		return err == nil, err
	case normalizedTypeIncome:
		err := tx.QueryRow(ctx, `INSERT INTO incomes (
			account_id, category_id, description, amount, currency, exchange_rate, amount_in_primary_currency, income_type, date, payment_method, destination_container_id, destination_instrument_id, import_fingerprint
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
		ON CONFLICT (import_fingerprint) WHERE import_fingerprint IS NOT NULL DO NOTHING
		RETURNING id`, accountID, row.SuggestedCategoryID, row.Description, *row.Amount, currency, exchangeRate, amountInPrimary, "one-time", date, row.PaymentMethod, row.DestinationContainerID, row.DestinationInstrumentID, fingerprint).Scan(&createdID)
		if err == pgx.ErrNoRows {
			return false, nil
		}
		return err == nil, err
	default:
		return false, fmt.Errorf("unsupported normalized type")
	}
}

func importedRowFingerprint(accountID, currency string, row PreviewRow) string {
	categoryID := derefString(row.SuggestedCategoryID)
	paymentMethod := derefString(row.PaymentMethod)
	date := derefString(row.Date)
	sourceRowID := row.RowID
	if sourceRowID == "" && row.Sheet != "" && row.SheetRow > 0 {
		sourceRowID = fmt.Sprintf("%s:%d", row.Sheet, row.SheetRow)
	}
	amount := 0.0
	if row.Amount != nil {
		amount = *row.Amount
	}
	token := fmt.Sprintf("%s|%s|%s|%s|%s|%s|%.2f|%s|%s", accountID, sourceRowID, *row.NormalizedType, currency, date, row.Description, amount, categoryID, paymentMethod)
	sum := sha256.Sum256([]byte(token))
	return hex.EncodeToString(sum[:])
}

func mustParseDate(value string) time.Time {
	parsed, _ := time.Parse("2006-01-02", value)
	return parsed
}
