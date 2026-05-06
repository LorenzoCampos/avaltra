package expenses

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"regexp"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/pashagolub/pgxmock/v5"
)

const (
	testExpenseAccountID = "11111111-1111-1111-1111-111111111111"
	testExpenseID        = "22222222-2222-2222-2222-222222222222"
)

func TestCreateExpensePaymentMethodScenarios(t *testing.T) {
	gin.SetMode(gin.TestMode)

	createdAt := time.Date(2026, time.January, 16, 10, 0, 0, 0, time.UTC)

	tests := []struct {
		name              string
		body              string
		expectStatus      int
		expectedMethod    any
		expectDB          bool
		expectedInsertArg any
	}{
		{
			name:              "valid value is stored and returned",
			body:              `{"description":"Supermercado","amount":25000,"currency":"ARS","date":"2026-01-16","payment_method":"cash"}`,
			expectStatus:      http.StatusCreated,
			expectedMethod:    "cash",
			expectDB:          true,
			expectedInsertArg: stringPtr("cash"),
		},
		{
			name:              "omitted field stores null",
			body:              `{"description":"Supermercado","amount":25000,"currency":"ARS","date":"2026-01-16"}`,
			expectStatus:      http.StatusCreated,
			expectedMethod:    nil,
			expectDB:          true,
			expectedInsertArg: (*string)(nil),
		},
		{
			name:              "explicit null stores null",
			body:              `{"description":"Supermercado","amount":25000,"currency":"ARS","date":"2026-01-16","payment_method":null}`,
			expectStatus:      http.StatusCreated,
			expectedMethod:    nil,
			expectDB:          true,
			expectedInsertArg: (*string)(nil),
		},
		{
			name:           "invalid value is rejected",
			body:           `{"description":"Supermercado","amount":25000,"currency":"ARS","date":"2026-01-16","payment_method":"crypto"}`,
			expectStatus:   http.StatusBadRequest,
			expectedMethod: nil,
			expectDB:       false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mock, err := pgxmock.NewPool()
			if err != nil {
				t.Fatalf("pgxmock.NewPool() error = %v", err)
			}
			defer mock.Close()

			var nilString *string

			if tt.expectDB {
				mock.ExpectQuery(`SELECT currency FROM accounts WHERE id = \$1`).
					WithArgs(testExpenseAccountID).
					WillReturnRows(mock.NewRows([]string{"currency"}).AddRow("ARS"))

				mock.ExpectQuery(regexp.QuoteMeta(`INSERT INTO expenses (
			account_id, family_member_id, category_id, description, 
			amount, currency, exchange_rate, amount_in_primary_currency,
			expense_type, date, end_date, payment_method
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
		RETURNING id, created_at`)).
					WithArgs(testExpenseAccountID, nilString, nilString, "Supermercado", 25000.0, "ARS", 1.0, 25000.0, "one-time", "2026-01-16", nilString, tt.expectedInsertArg).
					WillReturnRows(mock.NewRows([]string{"id", "created_at"}).AddRow(testExpenseID, createdAt))
			}

			recorder := httptest.NewRecorder()
			router := expenseTestRouter(createExpenseHandler(mock))

			req := httptest.NewRequest(http.MethodPost, "/expenses", bytes.NewBufferString(tt.body))
			req.Header.Set("Content-Type", "application/json")

			router.ServeHTTP(recorder, req)

			if recorder.Code != tt.expectStatus {
				t.Fatalf("status = %d, want %d, body = %s", recorder.Code, tt.expectStatus, recorder.Body.String())
			}

			if tt.expectStatus == http.StatusCreated {
				var response map[string]any
				if err := json.Unmarshal(recorder.Body.Bytes(), &response); err != nil {
					t.Fatalf("json.Unmarshal() error = %v", err)
				}
				if got := response["payment_method"]; got != tt.expectedMethod {
					t.Fatalf("payment_method = %#v, want %#v", got, tt.expectedMethod)
				}
			}

			if err := mock.ExpectationsWereMet(); err != nil {
				t.Fatalf("mock expectations: %v", err)
			}
		})
	}
}

func TestUpdateExpensePaymentMethodScenarios(t *testing.T) {
	gin.SetMode(gin.TestMode)

	transactionDate := time.Date(2026, time.January, 16, 0, 0, 0, 0, time.UTC)
	createdAt := time.Date(2026, time.January, 16, 10, 0, 0, 0, time.UTC)

	tests := []struct {
		name             string
		body             string
		expectStatus     int
		expectedMethod   any
		expectedSetArg   bool
		expectedValueArg any
	}{
		{
			name:             "omitted field keeps current value",
			body:             `{}`,
			expectStatus:     http.StatusOK,
			expectedMethod:   "credit_card",
			expectedSetArg:   false,
			expectedValueArg: (*string)(nil),
		},
		{
			name:             "explicit null clears current value",
			body:             `{"payment_method":null}`,
			expectStatus:     http.StatusOK,
			expectedMethod:   nil,
			expectedSetArg:   true,
			expectedValueArg: (*string)(nil),
		},
		{
			name:             "valid value replaces current value",
			body:             `{"payment_method":"cash"}`,
			expectStatus:     http.StatusOK,
			expectedMethod:   "cash",
			expectedSetArg:   true,
			expectedValueArg: stringPtr("cash"),
		},
		{
			name:           "invalid value is rejected",
			body:           `{"payment_method":"crypto"}`,
			expectStatus:   http.StatusBadRequest,
			expectedMethod: nil,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mock, err := pgxmock.NewPool()
			if err != nil {
				t.Fatalf("pgxmock.NewPool() error = %v", err)
			}
			defer mock.Close()

			var nilString *string
			var nilFloat *float64

			mock.ExpectQuery(`SELECT expense_type, amount, currency, exchange_rate, amount_in_primary_currency, date::TEXT, deleted_at\s+FROM expenses WHERE id = \$1 AND account_id = \$2`).
				WithArgs(testExpenseID, testExpenseAccountID).
				WillReturnRows(mock.NewRows([]string{"expense_type", "amount", "currency", "exchange_rate", "amount_in_primary_currency", "date", "deleted_at"}).AddRow("one-time", 25000.0, "ARS", 1.0, 25000.0, "2026-01-16", nil))

			if tt.expectStatus == http.StatusOK {
				mock.ExpectQuery(`UPDATE expenses SET`).
					WithArgs(nilString, nilString, nilString, nilFloat, nilString, nilString, nilString, nilString, testExpenseID, testExpenseAccountID, nilFloat, nilFloat, tt.expectedSetArg, tt.expectedValueArg).
					WillReturnRows(mock.NewRows([]string{"id", "account_id", "family_member_id", "category_id", "description", "amount", "currency", "exchange_rate", "amount_in_primary_currency", "expense_type", "date", "end_date", "payment_method", "created_at"}).AddRow(testExpenseID, testExpenseAccountID, nil, nil, "Supermercado", 25000.0, "ARS", 1.0, 25000.0, "one-time", &transactionDate, nil, paymentMethodRowValue(tt.expectedMethod), createdAt))
			}

			recorder := httptest.NewRecorder()
			router := expenseTestRouter(updateExpenseHandler(mock))

			req := httptest.NewRequest(http.MethodPut, "/expenses/"+testExpenseID, bytes.NewBufferString(tt.body))
			req.Header.Set("Content-Type", "application/json")

			router.ServeHTTP(recorder, req)

			if recorder.Code != tt.expectStatus {
				t.Fatalf("status = %d, want %d, body = %s", recorder.Code, tt.expectStatus, recorder.Body.String())
			}

			if tt.expectStatus == http.StatusOK {
				var response map[string]any
				if err := json.Unmarshal(recorder.Body.Bytes(), &response); err != nil {
					t.Fatalf("json.Unmarshal() error = %v", err)
				}
				if got := response["payment_method"]; got != tt.expectedMethod {
					t.Fatalf("payment_method = %#v, want %#v", got, tt.expectedMethod)
				}
			}

			if err := mock.ExpectationsWereMet(); err != nil {
				t.Fatalf("mock expectations: %v", err)
			}
		})
	}
}

func TestGetExpenseIncludesPaymentMethod(t *testing.T) {
	gin.SetMode(gin.TestMode)

	tests := []struct {
		name           string
		paymentMethod  any
		expectedMethod any
	}{
		{name: "returns value when present", paymentMethod: stringPtr("debit_card"), expectedMethod: "debit_card"},
		{name: "returns null when absent", paymentMethod: nil, expectedMethod: nil},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mock, err := pgxmock.NewPool()
			if err != nil {
				t.Fatalf("pgxmock.NewPool() error = %v", err)
			}
			defer mock.Close()

			transactionDate := time.Date(2026, time.January, 16, 0, 0, 0, 0, time.UTC)
			createdAt := time.Date(2026, time.January, 16, 10, 0, 0, 0, time.UTC)

			mock.ExpectQuery(`SELECT e.id, e.account_id, e.family_member_id, e.category_id,`).
				WithArgs(testExpenseID, testExpenseAccountID).
				WillReturnRows(mock.NewRows([]string{"id", "account_id", "family_member_id", "category_id", "category_name", "description", "amount", "currency", "exchange_rate", "amount_in_primary_currency", "expense_type", "date", "end_date", "payment_method", "created_at"}).AddRow(testExpenseID, testExpenseAccountID, nil, nil, nil, "Supermercado", 25000.0, "ARS", 1.0, 25000.0, "one-time", &transactionDate, nil, tt.paymentMethod, createdAt))

			recorder := httptest.NewRecorder()
			router := expenseTestRouter(getExpenseHandler(mock))

			req := httptest.NewRequest(http.MethodGet, "/expenses/"+testExpenseID, nil)
			router.ServeHTTP(recorder, req)

			if recorder.Code != http.StatusOK {
				t.Fatalf("status = %d, want %d, body = %s", recorder.Code, http.StatusOK, recorder.Body.String())
			}

			var response map[string]any
			if err := json.Unmarshal(recorder.Body.Bytes(), &response); err != nil {
				t.Fatalf("json.Unmarshal() error = %v", err)
			}
			if got := response["payment_method"]; got != tt.expectedMethod {
				t.Fatalf("payment_method = %#v, want %#v", got, tt.expectedMethod)
			}

			if err := mock.ExpectationsWereMet(); err != nil {
				t.Fatalf("mock expectations: %v", err)
			}
		})
	}
}

func TestListExpensesIncludesPaymentMethod(t *testing.T) {
	gin.SetMode(gin.TestMode)

	tests := []struct {
		name           string
		paymentMethod  any
		expectedMethod any
	}{
		{name: "returns value when present", paymentMethod: stringPtr("bank_transfer"), expectedMethod: "bank_transfer"},
		{name: "returns null when absent", paymentMethod: nil, expectedMethod: nil},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mock, err := pgxmock.NewPool()
			if err != nil {
				t.Fatalf("pgxmock.NewPool() error = %v", err)
			}
			defer mock.Close()

			transactionDate := time.Date(2026, time.January, 16, 0, 0, 0, 0, time.UTC)
			createdAt := time.Date(2026, time.January, 16, 10, 0, 0, 0, time.UTC)

			mock.ExpectQuery(`SELECT COUNT\(\*\) FROM expenses e WHERE`).
				WithArgs(testExpenseAccountID).
				WillReturnRows(mock.NewRows([]string{"count"}).AddRow(1))

			mock.ExpectQuery(`SELECT e.id, e.family_member_id, e.category_id, ec.name as category_name,`).
				WithArgs(testExpenseAccountID, 20, 0).
				WillReturnRows(mock.NewRows([]string{"id", "family_member_id", "category_id", "category_name", "description", "amount", "currency", "exchange_rate", "amount_in_primary_currency", "expense_type", "date", "end_date", "payment_method", "created_at"}).AddRow(testExpenseID, nil, nil, nil, "Supermercado", 25000.0, "ARS", 1.0, 25000.0, "one-time", &transactionDate, nil, tt.paymentMethod, createdAt))

			recorder := httptest.NewRecorder()
			router := expenseTestRouter(listExpensesHandler(mock))

			req := httptest.NewRequest(http.MethodGet, "/expenses", nil)
			router.ServeHTTP(recorder, req)

			if recorder.Code != http.StatusOK {
				t.Fatalf("status = %d, want %d, body = %s", recorder.Code, http.StatusOK, recorder.Body.String())
			}

			var response struct {
				Expenses []map[string]any `json:"expenses"`
			}
			if err := json.Unmarshal(recorder.Body.Bytes(), &response); err != nil {
				t.Fatalf("json.Unmarshal() error = %v", err)
			}
			if len(response.Expenses) != 1 {
				t.Fatalf("len(expenses) = %d, want 1", len(response.Expenses))
			}
			if got := response.Expenses[0]["payment_method"]; got != tt.expectedMethod {
				t.Fatalf("payment_method = %#v, want %#v", got, tt.expectedMethod)
			}

			if err := mock.ExpectationsWereMet(); err != nil {
				t.Fatalf("mock expectations: %v", err)
			}
		})
	}
}

func expenseTestRouter(handler gin.HandlerFunc) *gin.Engine {
	router := gin.New()
	router.Use(func(c *gin.Context) {
		c.Set("account_id", testExpenseAccountID)
		c.Next()
	})
	router.POST("/expenses", handler)
	router.PUT("/expenses/:id", handler)
	router.GET("/expenses", handler)
	router.GET("/expenses/:id", handler)
	return router
}

func stringPtr(value string) *string {
	return &value
}

func paymentMethodRowValue(value any) any {
	if value == nil {
		return (*string)(nil)
	}
	return stringPtr(value.(string))
}
