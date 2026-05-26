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
	testExpenseAccountID      = "11111111-1111-1111-1111-111111111111"
	testExpenseID             = "22222222-2222-2222-2222-222222222222"
	testExpenseContainerID    = "55555555-5555-5555-5555-555555555555"
	testExpenseInstrumentID   = "66666666-6666-6666-6666-666666666666"
	testExpenseAltContainerID = "77777777-7777-7777-7777-777777777777"
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
			body:              `{"description":"Supermercado","amount":25000,"currency":"ARS","date":"2026-01-16","payment_method":"cash","source_container_id":"` + testExpenseContainerID + `"}`,
			expectStatus:      http.StatusCreated,
			expectedMethod:    "cash",
			expectDB:          true,
			expectedInsertArg: stringPtr("cash"),
		},
		{
			name:              "omitted field stores null",
			body:              `{"description":"Supermercado","amount":25000,"currency":"ARS","date":"2026-01-16","source_container_id":"` + testExpenseContainerID + `"}`,
			expectStatus:      http.StatusCreated,
			expectedMethod:    nil,
			expectDB:          true,
			expectedInsertArg: (*string)(nil),
		},
		{
			name:              "explicit null stores null",
			body:              `{"description":"Supermercado","amount":25000,"currency":"ARS","date":"2026-01-16","payment_method":null,"source_container_id":"` + testExpenseContainerID + `"}`,
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
				mock.ExpectQuery(`SELECT EXISTS\(SELECT 1 FROM payment_containers`).
					WithArgs(testExpenseContainerID, testExpenseAccountID).
					WillReturnRows(mock.NewRows([]string{"exists"}).AddRow(true))
				mock.ExpectQuery(`SELECT currency FROM accounts WHERE id = \$1`).
					WithArgs(testExpenseAccountID).
					WillReturnRows(mock.NewRows([]string{"currency"}).AddRow("ARS"))

				mock.ExpectQuery(regexp.QuoteMeta(`INSERT INTO expenses (
			account_id, family_member_id, category_id, description,
			amount, currency, exchange_rate, amount_in_primary_currency,
			expense_type, date, end_date, payment_method, source_container_id, source_instrument_id
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
		RETURNING id, created_at`)).
					WithArgs(testExpenseAccountID, nilString, nilString, "Supermercado", 25000.0, "ARS", 1.0, 25000.0, "one-time", "2026-01-16", nilString, tt.expectedInsertArg, stringPtr(testExpenseContainerID), nilString).
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

func TestCreateExpensePaymentContextScenarios(t *testing.T) {
	gin.SetMode(gin.TestMode)

	createdAt := time.Date(2026, time.January, 16, 10, 0, 0, 0, time.UTC)

	tests := []struct {
		name                       string
		body                       string
		expectStatus               int
		expectDB                   bool
		expectInstrumentValidation bool
		expectedInstrument         any
	}{
		{
			name:                       "normalized refs are validated stored and returned",
			body:                       `{"description":"Supermercado","amount":25000,"currency":"ARS","date":"2026-01-16","payment_method":"cash","source_container_id":"` + testExpenseContainerID + `","source_instrument_id":"` + testExpenseInstrumentID + `"}`,
			expectStatus:               http.StatusCreated,
			expectDB:                   true,
			expectInstrumentValidation: true,
			expectedInstrument:         testExpenseInstrumentID,
		},
		{
			name:               "place-only container is validated stored and returned without instrument",
			body:               `{"description":"Supermercado","amount":25000,"currency":"ARS","date":"2026-01-16","payment_method":"cash","source_container_id":"` + testExpenseContainerID + `"}`,
			expectStatus:       http.StatusCreated,
			expectDB:           true,
			expectedInstrument: nil,
		},
		{
			name:         "inactive or foreign container is rejected",
			body:         `{"description":"Supermercado","amount":25000,"currency":"ARS","date":"2026-01-16","source_container_id":"` + testExpenseContainerID + `"}`,
			expectStatus: http.StatusBadRequest,
			expectDB:     false,
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
				mock.ExpectQuery(`SELECT EXISTS\(SELECT 1 FROM payment_containers`).
					WithArgs(testExpenseContainerID, testExpenseAccountID).
					WillReturnRows(mock.NewRows([]string{"exists"}).AddRow(true))
				if tt.expectInstrumentValidation {
					mock.ExpectQuery(`SELECT backing_container_id FROM payment_instruments`).
						WithArgs(testExpenseInstrumentID, testExpenseAccountID).
						WillReturnRows(mock.NewRows([]string{"backing_container_id"}).AddRow(stringPtr(testExpenseContainerID)))
				}
				mock.ExpectQuery(`SELECT currency FROM accounts WHERE id = \$1`).
					WithArgs(testExpenseAccountID).
					WillReturnRows(mock.NewRows([]string{"currency"}).AddRow("ARS"))
				mock.ExpectQuery(regexp.QuoteMeta(`INSERT INTO expenses (
			account_id, family_member_id, category_id, description,
			amount, currency, exchange_rate, amount_in_primary_currency,
			expense_type, date, end_date, payment_method, source_container_id, source_instrument_id
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
		RETURNING id, created_at`)).
					WithArgs(testExpenseAccountID, nilString, nilString, "Supermercado", 25000.0, "ARS", 1.0, 25000.0, "one-time", "2026-01-16", nilString, stringPtr("cash"), stringPtr(testExpenseContainerID), paymentMethodRowValue(tt.expectedInstrument)).
					WillReturnRows(mock.NewRows([]string{"id", "created_at"}).AddRow(testExpenseID, createdAt))
			} else {
				mock.ExpectQuery(`SELECT EXISTS\(SELECT 1 FROM payment_containers`).
					WithArgs(testExpenseContainerID, testExpenseAccountID).
					WillReturnRows(mock.NewRows([]string{"exists"}).AddRow(false))
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
				if got := response["source_container_id"]; got != testExpenseContainerID {
					t.Fatalf("source_container_id = %#v, want %#v", got, testExpenseContainerID)
				}
				if got := response["source_instrument_id"]; got != tt.expectedInstrument {
					t.Fatalf("source_instrument_id = %#v, want %#v", got, tt.expectedInstrument)
				}
			}
			if err := mock.ExpectationsWereMet(); err != nil {
				t.Fatalf("mock expectations: %v", err)
			}
		})
	}
}

func TestCreateExpenseRequiresSourceContainerForOneTime(t *testing.T) {
	gin.SetMode(gin.TestMode)

	mock, err := pgxmock.NewPool()
	if err != nil {
		t.Fatalf("pgxmock.NewPool() error = %v", err)
	}
	defer mock.Close()

	recorder := httptest.NewRecorder()
	router := expenseTestRouter(createExpenseHandler(mock))
	req := httptest.NewRequest(http.MethodPost, "/expenses", bytes.NewBufferString(`{"description":"Supermercado","amount":25000,"currency":"ARS","date":"2026-01-16"}`))
	req.Header.Set("Content-Type", "application/json")
	router.ServeHTTP(recorder, req)

	if recorder.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, want %d, body = %s", recorder.Code, http.StatusBadRequest, recorder.Body.String())
	}
	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("mock expectations: %v", err)
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
				mock.ExpectQuery(`SELECT EXISTS\(`).
					WithArgs(testExpenseID, testExpenseAccountID).
					WillReturnRows(mock.NewRows([]string{"exists"}).AddRow(true))
				mock.ExpectQuery(`UPDATE expenses SET`).
					WithArgs(nilString, nilString, nilString, nilFloat, nilString, nilString, nilString, nilString, testExpenseID, testExpenseAccountID, nilFloat, nilFloat, tt.expectedSetArg, tt.expectedValueArg, false, nilString, false, nilString).
					WillReturnRows(mock.NewRows([]string{"id", "account_id", "family_member_id", "category_id", "description", "amount", "currency", "exchange_rate", "amount_in_primary_currency", "expense_type", "date", "end_date", "payment_method", "source_container_id", "source_instrument_id", "created_at"}).AddRow(testExpenseID, testExpenseAccountID, nil, nil, "Supermercado", 25000.0, "ARS", 1.0, 25000.0, "one-time", &transactionDate, nil, paymentMethodRowValue(tt.expectedMethod), nil, nil, createdAt))
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

func TestUpdateExpensePaymentContextScenarios(t *testing.T) {
	gin.SetMode(gin.TestMode)

	transactionDate := time.Date(2026, time.January, 16, 0, 0, 0, 0, time.UTC)
	createdAt := time.Date(2026, time.January, 16, 10, 0, 0, 0, time.UTC)

	tests := []struct {
		name                  string
		body                  string
		expectStatus          int
		expectedExpenseType   any
		expectedContainerSet  bool
		expectedContainer     any
		expectedInstrumentSet bool
		expectedInstrument    any
		returnedContainer     any
		returnedInstrument    any
	}{
		{
			name:                  "valid refs replace current refs",
			body:                  `{"source_container_id":"` + testExpenseContainerID + `","source_instrument_id":"` + testExpenseInstrumentID + `"}`,
			expectStatus:          http.StatusOK,
			expectedExpenseType:   (*string)(nil),
			expectedContainerSet:  true,
			expectedContainer:     stringPtr(testExpenseContainerID),
			expectedInstrumentSet: true,
			expectedInstrument:    stringPtr(testExpenseInstrumentID),
			returnedContainer:     testExpenseContainerID,
			returnedInstrument:    testExpenseInstrumentID,
		},
		{
			name:                  "explicit null clears refs when changing to recurring",
			body:                  `{"expense_type":"recurring","source_container_id":null,"source_instrument_id":null}`,
			expectStatus:          http.StatusOK,
			expectedExpenseType:   stringPtr("recurring"),
			expectedContainerSet:  true,
			expectedContainer:     (*string)(nil),
			expectedInstrumentSet: true,
			expectedInstrument:    (*string)(nil),
			returnedContainer:     nil,
			returnedInstrument:    nil,
		},
		{
			name:                  "place-only save clears legacy instrument ref",
			body:                  `{"source_container_id":"` + testExpenseAltContainerID + `"}`,
			expectStatus:          http.StatusOK,
			expectedExpenseType:   (*string)(nil),
			expectedContainerSet:  true,
			expectedContainer:     stringPtr(testExpenseAltContainerID),
			expectedInstrumentSet: true,
			expectedInstrument:    (*string)(nil),
			returnedContainer:     testExpenseAltContainerID,
			returnedInstrument:    nil,
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

			if expectedContainer, ok := tt.expectedContainer.(*string); ok && expectedContainer != nil {
				expectedContainerValue := *expectedContainer
				mock.ExpectQuery(`SELECT EXISTS\(SELECT 1 FROM payment_containers`).
					WithArgs(expectedContainerValue, testExpenseAccountID).
					WillReturnRows(mock.NewRows([]string{"exists"}).AddRow(true))
			}
			if expectedInstrument, ok := tt.expectedInstrument.(*string); ok && expectedInstrument != nil {
				expectedInstrumentValue := *expectedInstrument
				mock.ExpectQuery(`SELECT backing_container_id FROM payment_instruments`).
					WithArgs(expectedInstrumentValue, testExpenseAccountID).
					WillReturnRows(mock.NewRows([]string{"backing_container_id"}).AddRow(tt.expectedContainer))
			}

			mock.ExpectQuery(`UPDATE expenses SET`).
				WithArgs(nilString, nilString, nilString, nilFloat, nilString, tt.expectedExpenseType, nilString, nilString, testExpenseID, testExpenseAccountID, nilFloat, nilFloat, false, nilString, tt.expectedContainerSet, tt.expectedContainer, tt.expectedInstrumentSet, tt.expectedInstrument).
				WillReturnRows(mock.NewRows([]string{"id", "account_id", "family_member_id", "category_id", "description", "amount", "currency", "exchange_rate", "amount_in_primary_currency", "expense_type", "date", "end_date", "payment_method", "source_container_id", "source_instrument_id", "created_at"}).AddRow(testExpenseID, testExpenseAccountID, nil, nil, "Supermercado", 25000.0, "ARS", 1.0, 25000.0, "one-time", &transactionDate, nil, nil, paymentMethodRowValue(tt.returnedContainer), paymentMethodRowValue(tt.returnedInstrument), createdAt))

			recorder := httptest.NewRecorder()
			router := expenseTestRouter(updateExpenseHandler(mock))
			req := httptest.NewRequest(http.MethodPut, "/expenses/"+testExpenseID, bytes.NewBufferString(tt.body))
			req.Header.Set("Content-Type", "application/json")
			router.ServeHTTP(recorder, req)

			if recorder.Code != tt.expectStatus {
				t.Fatalf("status = %d, want %d, body = %s", recorder.Code, tt.expectStatus, recorder.Body.String())
			}
			var response map[string]any
			if err := json.Unmarshal(recorder.Body.Bytes(), &response); err != nil {
				t.Fatalf("json.Unmarshal() error = %v", err)
			}
			if got := response["source_container_id"]; got != tt.returnedContainer {
				t.Fatalf("source_container_id = %#v, want %#v", got, tt.returnedContainer)
			}
			if got := response["source_instrument_id"]; got != tt.returnedInstrument {
				t.Fatalf("source_instrument_id = %#v, want %#v", got, tt.returnedInstrument)
			}
			if err := mock.ExpectationsWereMet(); err != nil {
				t.Fatalf("mock expectations: %v", err)
			}
		})
	}
}

func TestUpdateExpenseRequiresActiveSourceContainerForOneTime(t *testing.T) {
	gin.SetMode(gin.TestMode)

	tests := []struct {
		name          string
		body          string
		expectDBCheck bool
	}{
		{
			name: "explicit null source container is rejected",
			body: `{"source_container_id":null,"source_instrument_id":null}`,
		},
		{
			name:          "omitted source container is rejected when existing place is missing or inactive",
			body:          `{}`,
			expectDBCheck: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mock, err := pgxmock.NewPool()
			if err != nil {
				t.Fatalf("pgxmock.NewPool() error = %v", err)
			}
			defer mock.Close()

			mock.ExpectQuery(`SELECT expense_type, amount, currency, exchange_rate, amount_in_primary_currency, date::TEXT, deleted_at\s+FROM expenses WHERE id = \$1 AND account_id = \$2`).
				WithArgs(testExpenseID, testExpenseAccountID).
				WillReturnRows(mock.NewRows([]string{"expense_type", "amount", "currency", "exchange_rate", "amount_in_primary_currency", "date", "deleted_at"}).AddRow("one-time", 25000.0, "ARS", 1.0, 25000.0, "2026-01-16", nil))
			if tt.expectDBCheck {
				mock.ExpectQuery(`SELECT EXISTS\(`).
					WithArgs(testExpenseID, testExpenseAccountID).
					WillReturnRows(mock.NewRows([]string{"exists"}).AddRow(false))
			}

			recorder := httptest.NewRecorder()
			router := expenseTestRouter(updateExpenseHandler(mock))
			req := httptest.NewRequest(http.MethodPut, "/expenses/"+testExpenseID, bytes.NewBufferString(tt.body))
			req.Header.Set("Content-Type", "application/json")
			router.ServeHTTP(recorder, req)

			if recorder.Code != http.StatusBadRequest {
				t.Fatalf("status = %d, want %d, body = %s", recorder.Code, http.StatusBadRequest, recorder.Body.String())
			}
			if err := mock.ExpectationsWereMet(); err != nil {
				t.Fatalf("mock expectations: %v", err)
			}
		})
	}
}

func TestUpdateExpensePaymentContextLegacyInstrumentCompatibility(t *testing.T) {
	gin.SetMode(gin.TestMode)

	tests := []struct {
		name             string
		body             string
		expectContainer  bool
		expectInstrument bool
	}{
		{
			name:            "place-only container change skips existing legacy instrument validation",
			body:            `{"source_container_id":"` + testExpenseAltContainerID + `"}`,
			expectContainer: true,
		},
		{
			name:             "changed instrument is rejected when existing container does not match its backing container",
			body:             `{"source_instrument_id":"` + testExpenseInstrumentID + `"}`,
			expectInstrument: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mock, err := pgxmock.NewPool()
			if err != nil {
				t.Fatalf("pgxmock.NewPool() error = %v", err)
			}
			defer mock.Close()

			mock.ExpectQuery(`SELECT expense_type, amount, currency, exchange_rate, amount_in_primary_currency, date::TEXT, deleted_at\s+FROM expenses WHERE id = \$1 AND account_id = \$2`).
				WithArgs(testExpenseID, testExpenseAccountID).
				WillReturnRows(mock.NewRows([]string{"expense_type", "amount", "currency", "exchange_rate", "amount_in_primary_currency", "date", "deleted_at"}).AddRow("one-time", 25000.0, "ARS", 1.0, 25000.0, "2026-01-16", nil))

			if tt.expectContainer {
				mock.ExpectQuery(`SELECT EXISTS\(SELECT 1 FROM payment_containers`).
					WithArgs(testExpenseAltContainerID, testExpenseAccountID).
					WillReturnRows(mock.NewRows([]string{"exists"}).AddRow(true))
			}
			if tt.expectInstrument {
				mock.ExpectQuery(`SELECT backing_container_id FROM payment_instruments`).
					WithArgs(testExpenseInstrumentID, testExpenseAccountID).
					WillReturnRows(mock.NewRows([]string{"backing_container_id"}).AddRow(stringPtr(testExpenseAltContainerID)))
			}

			if tt.expectInstrument {
				mock.ExpectQuery(`SELECT source_container_id, source_instrument_id FROM expenses`).
					WithArgs(testExpenseID, testExpenseAccountID).
					WillReturnRows(mock.NewRows([]string{"source_container_id", "source_instrument_id"}).AddRow(stringPtr(testExpenseContainerID), stringPtr(testExpenseInstrumentID)))
				mock.ExpectQuery(`SELECT backing_container_id FROM payment_instruments`).
					WithArgs(testExpenseInstrumentID, testExpenseAccountID).
					WillReturnRows(mock.NewRows([]string{"backing_container_id"}).AddRow(stringPtr(testExpenseAltContainerID)))
			} else {
				mock.ExpectQuery(`UPDATE expenses SET`).
					WithArgs((*string)(nil), (*string)(nil), (*string)(nil), (*float64)(nil), (*string)(nil), (*string)(nil), (*string)(nil), (*string)(nil), testExpenseID, testExpenseAccountID, (*float64)(nil), (*float64)(nil), false, (*string)(nil), true, stringPtr(testExpenseAltContainerID), true, (*string)(nil)).
					WillReturnRows(mock.NewRows([]string{"id", "account_id", "family_member_id", "category_id", "description", "amount", "currency", "exchange_rate", "amount_in_primary_currency", "expense_type", "date", "end_date", "payment_method", "source_container_id", "source_instrument_id", "created_at"}).AddRow(testExpenseID, testExpenseAccountID, nil, nil, "Supermercado", 25000.0, "ARS", 1.0, 25000.0, "one-time", &time.Time{}, nil, nil, stringPtr(testExpenseAltContainerID), nil, time.Time{}))
			}

			recorder := httptest.NewRecorder()
			router := expenseTestRouter(updateExpenseHandler(mock))
			req := httptest.NewRequest(http.MethodPut, "/expenses/"+testExpenseID, bytes.NewBufferString(tt.body))
			req.Header.Set("Content-Type", "application/json")
			router.ServeHTTP(recorder, req)

			wantStatus := http.StatusOK
			if tt.expectInstrument {
				wantStatus = http.StatusBadRequest
			}
			if recorder.Code != wantStatus {
				t.Fatalf("status = %d, want %d, body = %s", recorder.Code, wantStatus, recorder.Body.String())
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
				WillReturnRows(mock.NewRows([]string{"id", "account_id", "family_member_id", "category_id", "category_name", "description", "amount", "currency", "exchange_rate", "amount_in_primary_currency", "expense_type", "date", "end_date", "payment_method", "source_container_id", "source_instrument_id", "created_at"}).AddRow(testExpenseID, testExpenseAccountID, nil, nil, nil, "Supermercado", 25000.0, "ARS", 1.0, 25000.0, "one-time", &transactionDate, nil, tt.paymentMethod, nil, nil, createdAt))

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
		name                 string
		paymentMethod        any
		expectedMethod       any
		expectedDisplayLabel any
	}{
		{name: "returns value when present", paymentMethod: stringPtr("bank_transfer"), expectedMethod: "bank_transfer", expectedDisplayLabel: "Bank transfer"},
		{name: "returns null when absent", paymentMethod: nil, expectedMethod: nil, expectedDisplayLabel: nil},
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
				WillReturnRows(mock.NewRows([]string{"id", "family_member_id", "category_id", "category_name", "description", "amount", "currency", "exchange_rate", "amount_in_primary_currency", "expense_type", "date", "end_date", "payment_method", "source_container_id", "source_instrument_id", "container_name", "container_type", "instrument_name", "instrument_type", "created_at"}).AddRow(testExpenseID, nil, nil, nil, "Supermercado", 25000.0, "ARS", 1.0, 25000.0, "one-time", &transactionDate, nil, tt.paymentMethod, nil, nil, nil, nil, nil, nil, createdAt))

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
			if tt.expectedDisplayLabel == nil {
				if got := response.Expenses[0]["payment_context"]; got != nil {
					t.Fatalf("payment_context = %#v, want nil", got)
				}
			} else {
				contextValue, ok := response.Expenses[0]["payment_context"].(map[string]any)
				if !ok {
					t.Fatalf("payment_context = %#v, want object", response.Expenses[0]["payment_context"])
				}
				if got := contextValue["display_label"]; got != tt.expectedDisplayLabel {
					t.Fatalf("payment_context.display_label = %#v, want %#v", got, tt.expectedDisplayLabel)
				}
			}

			if err := mock.ExpectationsWereMet(); err != nil {
				t.Fatalf("mock expectations: %v", err)
			}
		})
	}
}

func TestListExpensesPaymentContextUsesEffectivePlaceBeforeLegacyMethod(t *testing.T) {
	gin.SetMode(gin.TestMode)

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
		WillReturnRows(mock.NewRows([]string{"id", "family_member_id", "category_id", "category_name", "description", "amount", "currency", "exchange_rate", "amount_in_primary_currency", "expense_type", "date", "end_date", "payment_method", "source_container_id", "source_instrument_id", "container_name", "container_type", "instrument_name", "instrument_type", "created_at"}).
			AddRow(testExpenseID, nil, nil, nil, "Supermercado", 25000.0, "ARS", 1.0, 25000.0, "one-time", &transactionDate, nil, stringPtr("cash"), stringPtr(testExpenseContainerID), stringPtr(testExpenseInstrumentID), stringPtr("Cuenta sueldo"), stringPtr("bank"), stringPtr("Visa debito"), stringPtr("debit_card"), createdAt))

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
	contextValue, ok := response.Expenses[0]["payment_context"].(map[string]any)
	if !ok {
		t.Fatalf("payment_context = %#v, want object", response.Expenses[0]["payment_context"])
	}
	if got := contextValue["container_name"]; got != "Cuenta sueldo" {
		t.Fatalf("payment_context.container_name = %#v, want Cuenta sueldo", got)
	}
	if got := contextValue["display_label"]; got != "Cuenta sueldo" {
		t.Fatalf("payment_context.display_label = %#v, want Cuenta sueldo", got)
	}
	if got := contextValue["legacy_payment_method"]; got != "cash" {
		t.Fatalf("payment_context.legacy_payment_method = %#v, want cash", got)
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("mock expectations: %v", err)
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
