package incomes

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
	testIncomeAccountID = "33333333-3333-3333-3333-333333333333"
	testIncomeID        = "44444444-4444-4444-4444-444444444444"
)

func TestCreateIncomePaymentMethodScenarios(t *testing.T) {
	gin.SetMode(gin.TestMode)

	createdAt := time.Date(2026, time.January, 20, 10, 0, 0, 0, time.UTC)

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
			body:              `{"description":"Sueldo","amount":200000,"currency":"ARS","date":"2026-01-20","payment_method":"bank_transfer"}`,
			expectStatus:      http.StatusCreated,
			expectedMethod:    "bank_transfer",
			expectDB:          true,
			expectedInsertArg: stringPtr("bank_transfer"),
		},
		{
			name:              "omitted field stores null",
			body:              `{"description":"Sueldo","amount":200000,"currency":"ARS","date":"2026-01-20"}`,
			expectStatus:      http.StatusCreated,
			expectedMethod:    nil,
			expectDB:          true,
			expectedInsertArg: (*string)(nil),
		},
		{
			name:              "explicit null stores null",
			body:              `{"description":"Sueldo","amount":200000,"currency":"ARS","date":"2026-01-20","payment_method":null}`,
			expectStatus:      http.StatusCreated,
			expectedMethod:    nil,
			expectDB:          true,
			expectedInsertArg: (*string)(nil),
		},
		{
			name:           "invalid value is rejected",
			body:           `{"description":"Sueldo","amount":200000,"currency":"ARS","date":"2026-01-20","payment_method":"crypto"}`,
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
					WithArgs(testIncomeAccountID).
					WillReturnRows(mock.NewRows([]string{"currency"}).AddRow("ARS"))

				mock.ExpectQuery(regexp.QuoteMeta(`INSERT INTO incomes (
			account_id, family_member_id, category_id, description, 
			amount, currency, exchange_rate, amount_in_primary_currency,
			income_type, date, end_date, payment_method
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
		RETURNING id, created_at`)).
					WithArgs(testIncomeAccountID, nilString, nilString, "Sueldo", 200000.0, "ARS", 1.0, 200000.0, "one-time", "2026-01-20", nilString, tt.expectedInsertArg).
					WillReturnRows(mock.NewRows([]string{"id", "created_at"}).AddRow(testIncomeID, createdAt))
			}

			recorder := httptest.NewRecorder()
			router := incomeTestRouter(createIncomeHandler(mock))

			req := httptest.NewRequest(http.MethodPost, "/incomes", bytes.NewBufferString(tt.body))
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

func TestUpdateIncomePaymentMethodScenarios(t *testing.T) {
	gin.SetMode(gin.TestMode)

	transactionDate := time.Date(2026, time.January, 20, 0, 0, 0, 0, time.UTC)
	createdAt := time.Date(2026, time.January, 20, 10, 0, 0, 0, time.UTC)

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
			expectedMethod:   "bank_transfer",
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

			mock.ExpectQuery(`SELECT income_type, amount, currency, exchange_rate, amount_in_primary_currency, date::TEXT, deleted_at\s+FROM incomes WHERE id = \$1 AND account_id = \$2`).
				WithArgs(testIncomeID, testIncomeAccountID).
				WillReturnRows(mock.NewRows([]string{"income_type", "amount", "currency", "exchange_rate", "amount_in_primary_currency", "date", "deleted_at"}).AddRow("one-time", 200000.0, "ARS", 1.0, 200000.0, "2026-01-20", nil))

			if tt.expectStatus == http.StatusOK {
				mock.ExpectQuery(`UPDATE incomes SET`).
					WithArgs(nilString, nilString, nilString, nilFloat, nilString, nilString, nilString, nilString, testIncomeID, testIncomeAccountID, nilFloat, nilFloat, tt.expectedSetArg, tt.expectedValueArg).
					WillReturnRows(mock.NewRows([]string{"id", "account_id", "family_member_id", "category_id", "description", "amount", "currency", "exchange_rate", "amount_in_primary_currency", "income_type", "date", "end_date", "payment_method", "created_at"}).AddRow(testIncomeID, testIncomeAccountID, nil, nil, "Sueldo", 200000.0, "ARS", 1.0, 200000.0, "one-time", &transactionDate, nil, paymentMethodRowValue(tt.expectedMethod), createdAt))
			}

			recorder := httptest.NewRecorder()
			router := incomeTestRouter(updateIncomeHandler(mock))

			req := httptest.NewRequest(http.MethodPut, "/incomes/"+testIncomeID, bytes.NewBufferString(tt.body))
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

func TestGetIncomeIncludesPaymentMethod(t *testing.T) {
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

			transactionDate := time.Date(2026, time.January, 20, 0, 0, 0, 0, time.UTC)
			createdAt := time.Date(2026, time.January, 20, 10, 0, 0, 0, time.UTC)

			mock.ExpectQuery(`SELECT i.id, i.account_id, i.family_member_id, i.category_id,`).
				WithArgs(testIncomeID, testIncomeAccountID).
				WillReturnRows(mock.NewRows([]string{"id", "account_id", "family_member_id", "category_id", "category_name", "description", "amount", "currency", "exchange_rate", "amount_in_primary_currency", "income_type", "date", "end_date", "payment_method", "created_at"}).AddRow(testIncomeID, testIncomeAccountID, nil, nil, nil, "Sueldo", 200000.0, "ARS", 1.0, 200000.0, "one-time", &transactionDate, nil, tt.paymentMethod, createdAt))

			recorder := httptest.NewRecorder()
			router := incomeTestRouter(getIncomeHandler(mock))

			req := httptest.NewRequest(http.MethodGet, "/incomes/"+testIncomeID, nil)
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

func TestListIncomesIncludesPaymentMethod(t *testing.T) {
	gin.SetMode(gin.TestMode)

	tests := []struct {
		name           string
		paymentMethod  any
		expectedMethod any
	}{
		{name: "returns value when present", paymentMethod: stringPtr("cash"), expectedMethod: "cash"},
		{name: "returns null when absent", paymentMethod: nil, expectedMethod: nil},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mock, err := pgxmock.NewPool()
			if err != nil {
				t.Fatalf("pgxmock.NewPool() error = %v", err)
			}
			defer mock.Close()

			transactionDate := time.Date(2026, time.January, 20, 0, 0, 0, 0, time.UTC)
			createdAt := time.Date(2026, time.January, 20, 10, 0, 0, 0, time.UTC)

			mock.ExpectQuery(`SELECT COUNT\(\*\) FROM incomes i WHERE`).
				WithArgs(testIncomeAccountID).
				WillReturnRows(mock.NewRows([]string{"count"}).AddRow(1))

			mock.ExpectQuery(`SELECT i.id, i.family_member_id, i.category_id, ic.name as category_name,`).
				WithArgs(testIncomeAccountID, 20, 0).
				WillReturnRows(mock.NewRows([]string{"id", "family_member_id", "category_id", "category_name", "description", "amount", "currency", "exchange_rate", "amount_in_primary_currency", "income_type", "date", "end_date", "payment_method", "created_at"}).AddRow(testIncomeID, nil, nil, nil, "Sueldo", 200000.0, "ARS", 1.0, 200000.0, "one-time", &transactionDate, nil, tt.paymentMethod, createdAt))

			recorder := httptest.NewRecorder()
			router := incomeTestRouter(listIncomesHandler(mock))

			req := httptest.NewRequest(http.MethodGet, "/incomes", nil)
			router.ServeHTTP(recorder, req)

			if recorder.Code != http.StatusOK {
				t.Fatalf("status = %d, want %d, body = %s", recorder.Code, http.StatusOK, recorder.Body.String())
			}

			var response struct {
				Incomes []map[string]any `json:"incomes"`
			}
			if err := json.Unmarshal(recorder.Body.Bytes(), &response); err != nil {
				t.Fatalf("json.Unmarshal() error = %v", err)
			}
			if len(response.Incomes) != 1 {
				t.Fatalf("len(incomes) = %d, want 1", len(response.Incomes))
			}
			if got := response.Incomes[0]["payment_method"]; got != tt.expectedMethod {
				t.Fatalf("payment_method = %#v, want %#v", got, tt.expectedMethod)
			}

			if err := mock.ExpectationsWereMet(); err != nil {
				t.Fatalf("mock expectations: %v", err)
			}
		})
	}
}

func incomeTestRouter(handler gin.HandlerFunc) *gin.Engine {
	router := gin.New()
	router.Use(func(c *gin.Context) {
		c.Set("account_id", testIncomeAccountID)
		c.Next()
	})
	router.POST("/incomes", handler)
	router.PUT("/incomes/:id", handler)
	router.GET("/incomes", handler)
	router.GET("/incomes/:id", handler)
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
