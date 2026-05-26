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
	testIncomeAccountID      = "33333333-3333-3333-3333-333333333333"
	testIncomeID             = "44444444-4444-4444-4444-444444444444"
	testIncomeContainerID    = "77777777-7777-7777-7777-777777777777"
	testIncomeInstrumentID   = "88888888-8888-8888-8888-888888888888"
	testIncomeAltContainerID = "99999999-9999-9999-9999-999999999999"
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
			body:              `{"description":"Sueldo","amount":200000,"currency":"ARS","date":"2026-01-20","payment_method":"bank_transfer","destination_container_id":"` + testIncomeContainerID + `"}`,
			expectStatus:      http.StatusCreated,
			expectedMethod:    "bank_transfer",
			expectDB:          true,
			expectedInsertArg: stringPtr("bank_transfer"),
		},
		{
			name:              "omitted field stores null",
			body:              `{"description":"Sueldo","amount":200000,"currency":"ARS","date":"2026-01-20","destination_container_id":"` + testIncomeContainerID + `"}`,
			expectStatus:      http.StatusCreated,
			expectedMethod:    nil,
			expectDB:          true,
			expectedInsertArg: (*string)(nil),
		},
		{
			name:              "explicit null stores null",
			body:              `{"description":"Sueldo","amount":200000,"currency":"ARS","date":"2026-01-20","payment_method":null,"destination_container_id":"` + testIncomeContainerID + `"}`,
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
				mock.ExpectQuery(`SELECT EXISTS\(SELECT 1 FROM payment_containers`).
					WithArgs(testIncomeContainerID, testIncomeAccountID).
					WillReturnRows(mock.NewRows([]string{"exists"}).AddRow(true))
				mock.ExpectQuery(`SELECT currency FROM accounts WHERE id = \$1`).
					WithArgs(testIncomeAccountID).
					WillReturnRows(mock.NewRows([]string{"currency"}).AddRow("ARS"))

				mock.ExpectQuery(regexp.QuoteMeta(`INSERT INTO incomes (
			account_id, family_member_id, category_id, description,
			amount, currency, exchange_rate, amount_in_primary_currency,
			income_type, date, end_date, payment_method, destination_container_id, destination_instrument_id
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
		RETURNING id, created_at`)).
					WithArgs(testIncomeAccountID, nilString, nilString, "Sueldo", 200000.0, "ARS", 1.0, 200000.0, "one-time", "2026-01-20", nilString, tt.expectedInsertArg, stringPtr(testIncomeContainerID), nilString).
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

func TestCreateIncomePaymentContextScenarios(t *testing.T) {
	gin.SetMode(gin.TestMode)

	createdAt := time.Date(2026, time.January, 20, 10, 0, 0, 0, time.UTC)

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
			body:                       `{"description":"Sueldo","amount":200000,"currency":"ARS","date":"2026-01-20","payment_method":"bank_transfer","destination_container_id":"` + testIncomeContainerID + `","destination_instrument_id":"` + testIncomeInstrumentID + `"}`,
			expectStatus:               http.StatusCreated,
			expectDB:                   true,
			expectInstrumentValidation: true,
			expectedInstrument:         testIncomeInstrumentID,
		},
		{
			name:               "place-only container is validated stored and returned without instrument",
			body:               `{"description":"Sueldo","amount":200000,"currency":"ARS","date":"2026-01-20","payment_method":"bank_transfer","destination_container_id":"` + testIncomeContainerID + `"}`,
			expectStatus:       http.StatusCreated,
			expectDB:           true,
			expectedInstrument: nil,
		},
		{
			name:         "missing container is rejected before instrument validation",
			body:         `{"description":"Sueldo","amount":200000,"currency":"ARS","date":"2026-01-20","destination_instrument_id":"` + testIncomeInstrumentID + `"}`,
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
					WithArgs(testIncomeContainerID, testIncomeAccountID).
					WillReturnRows(mock.NewRows([]string{"exists"}).AddRow(true))
				if tt.expectInstrumentValidation {
					mock.ExpectQuery(`SELECT backing_container_id FROM payment_instruments`).
						WithArgs(testIncomeInstrumentID, testIncomeAccountID).
						WillReturnRows(mock.NewRows([]string{"backing_container_id"}).AddRow(stringPtr(testIncomeContainerID)))
				}
				mock.ExpectQuery(`SELECT currency FROM accounts WHERE id = \$1`).
					WithArgs(testIncomeAccountID).
					WillReturnRows(mock.NewRows([]string{"currency"}).AddRow("ARS"))
				mock.ExpectQuery(regexp.QuoteMeta(`INSERT INTO incomes (
			account_id, family_member_id, category_id, description,
			amount, currency, exchange_rate, amount_in_primary_currency,
			income_type, date, end_date, payment_method, destination_container_id, destination_instrument_id
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
		RETURNING id, created_at`)).
					WithArgs(testIncomeAccountID, nilString, nilString, "Sueldo", 200000.0, "ARS", 1.0, 200000.0, "one-time", "2026-01-20", nilString, stringPtr("bank_transfer"), stringPtr(testIncomeContainerID), paymentMethodRowValue(tt.expectedInstrument)).
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
				if got := response["destination_container_id"]; got != testIncomeContainerID {
					t.Fatalf("destination_container_id = %#v, want %#v", got, testIncomeContainerID)
				}
				if got := response["destination_instrument_id"]; got != tt.expectedInstrument {
					t.Fatalf("destination_instrument_id = %#v, want %#v", got, tt.expectedInstrument)
				}
			}
			if err := mock.ExpectationsWereMet(); err != nil {
				t.Fatalf("mock expectations: %v", err)
			}
		})
	}
}

func TestCreateIncomeRequiresDestinationContainerForOneTime(t *testing.T) {
	gin.SetMode(gin.TestMode)

	mock, err := pgxmock.NewPool()
	if err != nil {
		t.Fatalf("pgxmock.NewPool() error = %v", err)
	}
	defer mock.Close()

	recorder := httptest.NewRecorder()
	router := incomeTestRouter(createIncomeHandler(mock))
	req := httptest.NewRequest(http.MethodPost, "/incomes", bytes.NewBufferString(`{"description":"Sueldo","amount":200000,"currency":"ARS","date":"2026-01-20"}`))
	req.Header.Set("Content-Type", "application/json")
	router.ServeHTTP(recorder, req)

	if recorder.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, want %d, body = %s", recorder.Code, http.StatusBadRequest, recorder.Body.String())
	}
	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("mock expectations: %v", err)
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
				mock.ExpectQuery(`SELECT EXISTS\(`).
					WithArgs(testIncomeID, testIncomeAccountID).
					WillReturnRows(mock.NewRows([]string{"exists"}).AddRow(true))
				mock.ExpectQuery(`UPDATE incomes SET`).
					WithArgs(nilString, nilString, nilString, nilFloat, nilString, nilString, nilString, nilString, testIncomeID, testIncomeAccountID, nilFloat, nilFloat, tt.expectedSetArg, tt.expectedValueArg, false, nilString, false, nilString).
					WillReturnRows(mock.NewRows([]string{"id", "account_id", "family_member_id", "category_id", "description", "amount", "currency", "exchange_rate", "amount_in_primary_currency", "income_type", "date", "end_date", "payment_method", "destination_container_id", "destination_instrument_id", "created_at"}).AddRow(testIncomeID, testIncomeAccountID, nil, nil, "Sueldo", 200000.0, "ARS", 1.0, 200000.0, "one-time", &transactionDate, nil, paymentMethodRowValue(tt.expectedMethod), nil, nil, createdAt))
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

func TestUpdateIncomePaymentContextScenarios(t *testing.T) {
	gin.SetMode(gin.TestMode)

	transactionDate := time.Date(2026, time.January, 20, 0, 0, 0, 0, time.UTC)
	createdAt := time.Date(2026, time.January, 20, 10, 0, 0, 0, time.UTC)

	tests := []struct {
		name                  string
		body                  string
		expectStatus          int
		expectedIncomeType    any
		expectedContainerSet  bool
		expectedContainer     any
		expectedInstrumentSet bool
		expectedInstrument    any
		returnedContainer     any
		returnedInstrument    any
	}{
		{
			name:                  "valid refs replace current refs",
			body:                  `{"destination_container_id":"` + testIncomeContainerID + `","destination_instrument_id":"` + testIncomeInstrumentID + `"}`,
			expectStatus:          http.StatusOK,
			expectedIncomeType:    (*string)(nil),
			expectedContainerSet:  true,
			expectedContainer:     stringPtr(testIncomeContainerID),
			expectedInstrumentSet: true,
			expectedInstrument:    stringPtr(testIncomeInstrumentID),
			returnedContainer:     testIncomeContainerID,
			returnedInstrument:    testIncomeInstrumentID,
		},
		{
			name:                  "explicit null clears refs when changing to recurring",
			body:                  `{"income_type":"recurring","destination_container_id":null,"destination_instrument_id":null}`,
			expectStatus:          http.StatusOK,
			expectedIncomeType:    stringPtr("recurring"),
			expectedContainerSet:  true,
			expectedContainer:     (*string)(nil),
			expectedInstrumentSet: true,
			expectedInstrument:    (*string)(nil),
			returnedContainer:     nil,
			returnedInstrument:    nil,
		},
		{
			name:                  "place-only save clears legacy instrument ref",
			body:                  `{"destination_container_id":"` + testIncomeAltContainerID + `"}`,
			expectStatus:          http.StatusOK,
			expectedIncomeType:    (*string)(nil),
			expectedContainerSet:  true,
			expectedContainer:     stringPtr(testIncomeAltContainerID),
			expectedInstrumentSet: true,
			expectedInstrument:    (*string)(nil),
			returnedContainer:     testIncomeAltContainerID,
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

			mock.ExpectQuery(`SELECT income_type, amount, currency, exchange_rate, amount_in_primary_currency, date::TEXT, deleted_at\s+FROM incomes WHERE id = \$1 AND account_id = \$2`).
				WithArgs(testIncomeID, testIncomeAccountID).
				WillReturnRows(mock.NewRows([]string{"income_type", "amount", "currency", "exchange_rate", "amount_in_primary_currency", "date", "deleted_at"}).AddRow("one-time", 200000.0, "ARS", 1.0, 200000.0, "2026-01-20", nil))

			if expectedContainer, ok := tt.expectedContainer.(*string); ok && expectedContainer != nil {
				expectedContainerValue := *expectedContainer
				mock.ExpectQuery(`SELECT EXISTS\(SELECT 1 FROM payment_containers`).
					WithArgs(expectedContainerValue, testIncomeAccountID).
					WillReturnRows(mock.NewRows([]string{"exists"}).AddRow(true))
			}
			if expectedInstrument, ok := tt.expectedInstrument.(*string); ok && expectedInstrument != nil {
				expectedInstrumentValue := *expectedInstrument
				mock.ExpectQuery(`SELECT backing_container_id FROM payment_instruments`).
					WithArgs(expectedInstrumentValue, testIncomeAccountID).
					WillReturnRows(mock.NewRows([]string{"backing_container_id"}).AddRow(tt.expectedContainer))
			}

			mock.ExpectQuery(`UPDATE incomes SET`).
				WithArgs(nilString, nilString, nilString, nilFloat, nilString, tt.expectedIncomeType, nilString, nilString, testIncomeID, testIncomeAccountID, nilFloat, nilFloat, false, nilString, tt.expectedContainerSet, tt.expectedContainer, tt.expectedInstrumentSet, tt.expectedInstrument).
				WillReturnRows(mock.NewRows([]string{"id", "account_id", "family_member_id", "category_id", "description", "amount", "currency", "exchange_rate", "amount_in_primary_currency", "income_type", "date", "end_date", "payment_method", "destination_container_id", "destination_instrument_id", "created_at"}).AddRow(testIncomeID, testIncomeAccountID, nil, nil, "Sueldo", 200000.0, "ARS", 1.0, 200000.0, "one-time", &transactionDate, nil, nil, paymentMethodRowValue(tt.returnedContainer), paymentMethodRowValue(tt.returnedInstrument), createdAt))

			recorder := httptest.NewRecorder()
			router := incomeTestRouter(updateIncomeHandler(mock))
			req := httptest.NewRequest(http.MethodPut, "/incomes/"+testIncomeID, bytes.NewBufferString(tt.body))
			req.Header.Set("Content-Type", "application/json")
			router.ServeHTTP(recorder, req)

			if recorder.Code != tt.expectStatus {
				t.Fatalf("status = %d, want %d, body = %s", recorder.Code, tt.expectStatus, recorder.Body.String())
			}
			var response map[string]any
			if err := json.Unmarshal(recorder.Body.Bytes(), &response); err != nil {
				t.Fatalf("json.Unmarshal() error = %v", err)
			}
			if got := response["destination_container_id"]; got != tt.returnedContainer {
				t.Fatalf("destination_container_id = %#v, want %#v", got, tt.returnedContainer)
			}
			if got := response["destination_instrument_id"]; got != tt.returnedInstrument {
				t.Fatalf("destination_instrument_id = %#v, want %#v", got, tt.returnedInstrument)
			}
			if err := mock.ExpectationsWereMet(); err != nil {
				t.Fatalf("mock expectations: %v", err)
			}
		})
	}
}

func TestUpdateIncomeRequiresActiveDestinationContainerForOneTime(t *testing.T) {
	gin.SetMode(gin.TestMode)

	tests := []struct {
		name          string
		body          string
		expectDBCheck bool
	}{
		{
			name: "explicit null destination container is rejected",
			body: `{"destination_container_id":null,"destination_instrument_id":null}`,
		},
		{
			name:          "omitted destination container is rejected when existing place is missing or inactive",
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

			mock.ExpectQuery(`SELECT income_type, amount, currency, exchange_rate, amount_in_primary_currency, date::TEXT, deleted_at\s+FROM incomes WHERE id = \$1 AND account_id = \$2`).
				WithArgs(testIncomeID, testIncomeAccountID).
				WillReturnRows(mock.NewRows([]string{"income_type", "amount", "currency", "exchange_rate", "amount_in_primary_currency", "date", "deleted_at"}).AddRow("one-time", 200000.0, "ARS", 1.0, 200000.0, "2026-01-20", nil))
			if tt.expectDBCheck {
				mock.ExpectQuery(`SELECT EXISTS\(`).
					WithArgs(testIncomeID, testIncomeAccountID).
					WillReturnRows(mock.NewRows([]string{"exists"}).AddRow(false))
			}

			recorder := httptest.NewRecorder()
			router := incomeTestRouter(updateIncomeHandler(mock))
			req := httptest.NewRequest(http.MethodPut, "/incomes/"+testIncomeID, bytes.NewBufferString(tt.body))
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

func TestUpdateIncomePaymentContextLegacyInstrumentCompatibility(t *testing.T) {
	gin.SetMode(gin.TestMode)

	tests := []struct {
		name             string
		body             string
		expectContainer  bool
		expectInstrument bool
	}{
		{
			name:            "place-only container change skips existing legacy instrument validation",
			body:            `{"destination_container_id":"` + testIncomeAltContainerID + `"}`,
			expectContainer: true,
		},
		{
			name:             "changed instrument is rejected when existing container does not match its backing container",
			body:             `{"destination_instrument_id":"` + testIncomeInstrumentID + `"}`,
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

			mock.ExpectQuery(`SELECT income_type, amount, currency, exchange_rate, amount_in_primary_currency, date::TEXT, deleted_at\s+FROM incomes WHERE id = \$1 AND account_id = \$2`).
				WithArgs(testIncomeID, testIncomeAccountID).
				WillReturnRows(mock.NewRows([]string{"income_type", "amount", "currency", "exchange_rate", "amount_in_primary_currency", "date", "deleted_at"}).AddRow("one-time", 200000.0, "ARS", 1.0, 200000.0, "2026-01-20", nil))

			if tt.expectContainer {
				mock.ExpectQuery(`SELECT EXISTS\(SELECT 1 FROM payment_containers`).
					WithArgs(testIncomeAltContainerID, testIncomeAccountID).
					WillReturnRows(mock.NewRows([]string{"exists"}).AddRow(true))
			}
			if tt.expectInstrument {
				mock.ExpectQuery(`SELECT backing_container_id FROM payment_instruments`).
					WithArgs(testIncomeInstrumentID, testIncomeAccountID).
					WillReturnRows(mock.NewRows([]string{"backing_container_id"}).AddRow(stringPtr(testIncomeAltContainerID)))
			}

			if tt.expectInstrument {
				mock.ExpectQuery(`SELECT destination_container_id, destination_instrument_id FROM incomes`).
					WithArgs(testIncomeID, testIncomeAccountID).
					WillReturnRows(mock.NewRows([]string{"destination_container_id", "destination_instrument_id"}).AddRow(stringPtr(testIncomeContainerID), stringPtr(testIncomeInstrumentID)))
				mock.ExpectQuery(`SELECT backing_container_id FROM payment_instruments`).
					WithArgs(testIncomeInstrumentID, testIncomeAccountID).
					WillReturnRows(mock.NewRows([]string{"backing_container_id"}).AddRow(stringPtr(testIncomeAltContainerID)))
			} else {
				mock.ExpectQuery(`UPDATE incomes SET`).
					WithArgs((*string)(nil), (*string)(nil), (*string)(nil), (*float64)(nil), (*string)(nil), (*string)(nil), (*string)(nil), (*string)(nil), testIncomeID, testIncomeAccountID, (*float64)(nil), (*float64)(nil), false, (*string)(nil), true, stringPtr(testIncomeAltContainerID), true, (*string)(nil)).
					WillReturnRows(mock.NewRows([]string{"id", "account_id", "family_member_id", "category_id", "description", "amount", "currency", "exchange_rate", "amount_in_primary_currency", "income_type", "date", "end_date", "payment_method", "destination_container_id", "destination_instrument_id", "created_at"}).AddRow(testIncomeID, testIncomeAccountID, nil, nil, "Sueldo", 200000.0, "ARS", 1.0, 200000.0, "one-time", &time.Time{}, nil, nil, stringPtr(testIncomeAltContainerID), nil, time.Time{}))
			}

			recorder := httptest.NewRecorder()
			router := incomeTestRouter(updateIncomeHandler(mock))
			req := httptest.NewRequest(http.MethodPut, "/incomes/"+testIncomeID, bytes.NewBufferString(tt.body))
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
				WillReturnRows(mock.NewRows([]string{"id", "account_id", "family_member_id", "category_id", "category_name", "description", "amount", "currency", "exchange_rate", "amount_in_primary_currency", "income_type", "date", "end_date", "payment_method", "destination_container_id", "destination_instrument_id", "created_at"}).AddRow(testIncomeID, testIncomeAccountID, nil, nil, nil, "Sueldo", 200000.0, "ARS", 1.0, 200000.0, "one-time", &transactionDate, nil, tt.paymentMethod, nil, nil, createdAt))

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
		name                 string
		paymentMethod        any
		expectedMethod       any
		expectedDisplayLabel any
	}{
		{name: "returns value when present", paymentMethod: stringPtr("cash"), expectedMethod: "cash", expectedDisplayLabel: "Cash"},
		{name: "returns null when absent", paymentMethod: nil, expectedMethod: nil, expectedDisplayLabel: nil},
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
				WillReturnRows(mock.NewRows([]string{"id", "family_member_id", "category_id", "category_name", "description", "amount", "currency", "exchange_rate", "amount_in_primary_currency", "income_type", "date", "end_date", "payment_method", "destination_container_id", "destination_instrument_id", "container_name", "container_type", "instrument_name", "instrument_type", "created_at"}).AddRow(testIncomeID, nil, nil, nil, "Sueldo", 200000.0, "ARS", 1.0, 200000.0, "one-time", &transactionDate, nil, tt.paymentMethod, nil, nil, nil, nil, nil, nil, createdAt))

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
			if tt.expectedDisplayLabel == nil {
				if got := response.Incomes[0]["payment_context"]; got != nil {
					t.Fatalf("payment_context = %#v, want nil", got)
				}
			} else {
				contextValue, ok := response.Incomes[0]["payment_context"].(map[string]any)
				if !ok {
					t.Fatalf("payment_context = %#v, want object", response.Incomes[0]["payment_context"])
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

func TestListIncomesPaymentContextUsesEffectivePlaceBeforeLegacyMethod(t *testing.T) {
	gin.SetMode(gin.TestMode)

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
		WillReturnRows(mock.NewRows([]string{"id", "family_member_id", "category_id", "category_name", "description", "amount", "currency", "exchange_rate", "amount_in_primary_currency", "income_type", "date", "end_date", "payment_method", "destination_container_id", "destination_instrument_id", "container_name", "container_type", "instrument_name", "instrument_type", "created_at"}).
			AddRow(testIncomeID, nil, nil, nil, "Sueldo", 200000.0, "ARS", 1.0, 200000.0, "one-time", &transactionDate, nil, stringPtr("bank_transfer"), stringPtr(testIncomeContainerID), stringPtr(testIncomeInstrumentID), stringPtr("Caja ahorro"), stringPtr("bank"), stringPtr("Alias sueldo"), stringPtr("transfer"), createdAt))

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
	contextValue, ok := response.Incomes[0]["payment_context"].(map[string]any)
	if !ok {
		t.Fatalf("payment_context = %#v, want object", response.Incomes[0]["payment_context"])
	}
	if got := contextValue["container_name"]; got != "Caja ahorro" {
		t.Fatalf("payment_context.container_name = %#v, want Caja ahorro", got)
	}
	if got := contextValue["display_label"]; got != "Caja ahorro" {
		t.Fatalf("payment_context.display_label = %#v, want Caja ahorro", got)
	}
	if got := contextValue["legacy_payment_method"]; got != "bank_transfer" {
		t.Fatalf("payment_context.legacy_payment_method = %#v, want bank_transfer", got)
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("mock expectations: %v", err)
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
