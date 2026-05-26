package expenses

import (
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/LorenzoCampos/avaltra/internal/transactions"
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
)

type PaymentContext struct {
	ContainerID         *string `json:"container_id"`
	ContainerName       *string `json:"container_name"`
	ContainerType       *string `json:"container_type"`
	InstrumentID        *string `json:"instrument_id"`
	InstrumentName      *string `json:"instrument_name"`
	InstrumentType      *string `json:"instrument_type"`
	LegacyPaymentMethod *string `json:"legacy_payment_method"`
	DisplayLabel        *string `json:"display_label"`
}

type ListExpensesQuery struct {
	DateFrom       string `form:"date_from"`        // YYYY-MM-DD
	DateTo         string `form:"date_to"`          // YYYY-MM-DD
	ExpenseType    string `form:"expense_type"`     // one-time, recurring
	CategoryID     string `form:"category_id"`      // Categoría exacta
	FamilyMemberID string `form:"family_member_id"` // UUID
	SortBy         string `form:"sort_by"`          // date, amount, created_at
	Order          string `form:"order"`            // asc, desc
	Page           int    `form:"page"`             // Página (default: 1)
	Limit          int    `form:"limit"`            // Items por página (default: 20, max: 100)
}

type ExpenseListItem struct {
	ID                      string          `json:"id"`
	FamilyMemberID          *string         `json:"family_member_id,omitempty"`
	CategoryID              *string         `json:"category_id,omitempty"`
	CategoryName            *string         `json:"category_name,omitempty"`
	Description             string          `json:"description"`
	Amount                  float64         `json:"amount"`
	Currency                string          `json:"currency"`
	ExchangeRate            float64         `json:"exchange_rate"`
	AmountInPrimaryCurrency float64         `json:"amount_in_primary_currency"`
	ExpenseType             string          `json:"expense_type"`
	Date                    string          `json:"date"`
	EndDate                 *string         `json:"end_date,omitempty"`
	PaymentMethod           *string         `json:"payment_method"`
	SourceContainerID       *string         `json:"source_container_id"`
	SourceInstrumentID      *string         `json:"source_instrument_id"`
	PaymentContext          *PaymentContext `json:"payment_context"`
	CreatedAt               string          `json:"created_at"`
}

type ListExpensesResponse struct {
	Expenses   []ExpenseListItem `json:"expenses"`
	TotalCount int               `json:"total_count"`
	Page       int               `json:"page"`
	Limit      int               `json:"limit"`
	TotalPages int               `json:"total_pages"`
}

func ListExpenses(db *pgxpool.Pool) gin.HandlerFunc {
	return listExpensesHandler(db)
}

func listExpensesHandler(db expenseStore) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Get account_id from context (set by AccountMiddleware)
		accountID, exists := c.Get("account_id")
		if !exists {
			c.JSON(http.StatusBadRequest, gin.H{"error": "account_id not found in context"})
			return
		}

		// Parse query parameters
		var query ListExpensesQuery
		if err := c.ShouldBindQuery(&query); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		// Set defaults
		if query.Page < 1 {
			query.Page = 1
		}
		if query.Limit < 1 {
			query.Limit = 20
		}
		if query.Limit > 100 {
			query.Limit = 100
		}
		if query.SortBy == "" {
			query.SortBy = "date"
		}
		if query.Order == "" {
			query.Order = "desc"
		}

		// Validate sort_by
		validSortFields := map[string]bool{
			"date":       true,
			"amount":     true,
			"created_at": true,
		}
		if !validSortFields[query.SortBy] {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid sort_by field"})
			return
		}

		// Validate order
		if query.Order != "asc" && query.Order != "desc" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "order must be asc or desc"})
			return
		}

		// Validate dates if provided
		if query.DateFrom != "" {
			if _, err := time.Parse("2006-01-02", query.DateFrom); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "invalid date_from format, use YYYY-MM-DD"})
				return
			}
		}
		if query.DateTo != "" {
			if _, err := time.Parse("2006-01-02", query.DateTo); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "invalid date_to format, use YYYY-MM-DD"})
				return
			}
		}

		// Validate expense_type if provided
		if query.ExpenseType != "" && query.ExpenseType != "one-time" && query.ExpenseType != "recurring" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "expense_type must be one-time or recurring"})
			return
		}

		// Build WHERE clauses dynamically (with table alias e.)
		whereClauses := []string{"e.account_id = $1", "e.deleted_at IS NULL"}
		args := []interface{}{accountID}
		argIndex := 2

		if query.DateFrom != "" {
			whereClauses = append(whereClauses, "e.date >= $"+strconv.Itoa(argIndex))
			args = append(args, query.DateFrom)
			argIndex++
		}

		if query.DateTo != "" {
			whereClauses = append(whereClauses, "e.date <= $"+strconv.Itoa(argIndex))
			args = append(args, query.DateTo)
			argIndex++
		}

		if query.ExpenseType != "" {
			whereClauses = append(whereClauses, "e.expense_type = $"+strconv.Itoa(argIndex))
			args = append(args, query.ExpenseType)
			argIndex++
		}

		if query.CategoryID != "" {
			whereClauses = append(whereClauses, "e.category_id = $"+strconv.Itoa(argIndex))
			args = append(args, query.CategoryID)
			argIndex++
		}

		if query.FamilyMemberID != "" {
			whereClauses = append(whereClauses, "e.family_member_id = $"+strconv.Itoa(argIndex))
			args = append(args, query.FamilyMemberID)
			argIndex++
		}

		whereClause := strings.Join(whereClauses, " AND ")

		// Get total count
		var totalCount int
		countQuery := "SELECT COUNT(*) FROM expenses e WHERE " + whereClause
		err := db.QueryRow(c.Request.Context(), countQuery, args...).Scan(&totalCount)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to count expenses"})
			return
		}

		// Calculate pagination
		totalPages := (totalCount + query.Limit - 1) / query.Limit
		offset := (query.Page - 1) * query.Limit

		// Build main query with JOINs to get category and normalized payment context.
		mainQuery := `
			SELECT e.id, e.family_member_id, e.category_id, ec.name as category_name,
			       e.description, e.amount, e.currency, e.exchange_rate, e.amount_in_primary_currency,
			       e.expense_type, e.date, e.end_date, e.payment_method, e.source_container_id, e.source_instrument_id,
			       pc.name as container_name, pc.kind as container_type, pi.name as instrument_name, pi.kind as instrument_type,
			       e.created_at
			FROM expenses e
			LEFT JOIN expense_categories ec ON e.category_id = ec.id
			LEFT JOIN payment_containers pc ON e.source_container_id = pc.id AND pc.account_id = e.account_id
			LEFT JOIN payment_instruments pi ON e.source_instrument_id = pi.id AND pi.account_id = e.account_id
			WHERE ` + whereClause + `
			ORDER BY e.` + query.SortBy + ` ` + strings.ToUpper(query.Order) + `
			LIMIT $` + strconv.Itoa(argIndex) + ` OFFSET $` + strconv.Itoa(argIndex+1)

		args = append(args, query.Limit, offset)

		// Execute query
		rows, err := db.Query(c.Request.Context(), mainQuery, args...)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch expenses: " + err.Error()})
			return
		}
		defer rows.Close()

		// Parse results
		expenses := []ExpenseListItem{}
		for rows.Next() {
			var expense ExpenseListItem
			var familyMemberID, categoryID, categoryName, paymentMethod, sourceContainerID, sourceInstrumentID *string
			var containerName, containerType, instrumentName, instrumentType *string
			var date, endDate *time.Time
			var createdAt time.Time

			err := rows.Scan(
				&expense.ID,
				&familyMemberID,
				&categoryID,
				&categoryName,
				&expense.Description,
				&expense.Amount,
				&expense.Currency,
				&expense.ExchangeRate,
				&expense.AmountInPrimaryCurrency,
				&expense.ExpenseType,
				&date,
				&endDate,
				&paymentMethod,
				&sourceContainerID,
				&sourceInstrumentID,
				&containerName,
				&containerType,
				&instrumentName,
				&instrumentType,
				&createdAt,
			)
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to parse expense: " + err.Error()})
				return
			}

			expense.FamilyMemberID = familyMemberID
			expense.CategoryID = categoryID
			expense.CategoryName = categoryName
			expense.PaymentMethod = paymentMethod
			expense.SourceContainerID = sourceContainerID
			expense.SourceInstrumentID = sourceInstrumentID
			expense.PaymentContext = buildPaymentContext(sourceContainerID, containerName, containerType, sourceInstrumentID, instrumentName, instrumentType, paymentMethod)

			if date != nil {
				dateStr := date.Format("2006-01-02")
				expense.Date = dateStr
			}

			if endDate != nil {
				endDateStr := endDate.Format("2006-01-02")
				expense.EndDate = &endDateStr
			}

			expense.CreatedAt = createdAt.Format(time.RFC3339)

			expenses = append(expenses, expense)
		}

		// Check for errors during iteration
		if err := rows.Err(); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "error reading expenses"})
			return
		}

		// Build response
		response := ListExpensesResponse{
			Expenses:   expenses,
			TotalCount: totalCount,
			Page:       query.Page,
			Limit:      query.Limit,
			TotalPages: totalPages,
		}

		c.JSON(http.StatusOK, response)
	}
}

func buildPaymentContext(containerID, containerName, containerType, instrumentID, instrumentName, instrumentType, legacyPaymentMethod *string) *PaymentContext {
	if containerID == nil && containerName == nil && instrumentID == nil && instrumentName == nil && legacyPaymentMethod == nil {
		return nil
	}
	displayLabel := legacyPaymentMethod
	if legacyPaymentMethod != nil {
		label := transactions.PaymentMethodLabel(*legacyPaymentMethod)
		displayLabel = &label
	}
	if instrumentName != nil {
		displayLabel = instrumentName
	}
	if containerName != nil {
		displayLabel = containerName
	}
	return &PaymentContext{
		ContainerID:         containerID,
		ContainerName:       containerName,
		ContainerType:       containerType,
		InstrumentID:        instrumentID,
		InstrumentName:      instrumentName,
		InstrumentType:      instrumentType,
		LegacyPaymentMethod: legacyPaymentMethod,
		DisplayLabel:        displayLabel,
	}
}
