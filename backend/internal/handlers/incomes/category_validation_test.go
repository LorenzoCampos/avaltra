package incomes

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/pashagolub/pgxmock/v5"
)

const testIncomeCategoryID = "66666666-6666-6666-6666-666666666666"

func TestCreateIncomeRejectsCategoryFromAnotherAccount(t *testing.T) {
	gin.SetMode(gin.TestMode)

	mock, err := pgxmock.NewPool()
	if err != nil {
		t.Fatalf("pgxmock.NewPool() error = %v", err)
	}
	defer mock.Close()

	categoryID := testIncomeCategoryID
	mock.ExpectQuery(`SELECT EXISTS\(`).
		WithArgs(&categoryID, testIncomeAccountID).
		WillReturnRows(mock.NewRows([]string{"exists"}).AddRow(false))

	recorder := httptest.NewRecorder()
	router := incomeTestRouter(createIncomeHandler(mock))

	req := httptest.NewRequest(http.MethodPost, "/incomes", bytes.NewBufferString(`{"description":"Sueldo","amount":200000,"currency":"ARS","date":"2026-01-20","category_id":"`+categoryID+`"}`))
	req.Header.Set("Content-Type", "application/json")

	router.ServeHTTP(recorder, req)

	if recorder.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, want %d, body = %s", recorder.Code, http.StatusBadRequest, recorder.Body.String())
	}
	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("mock expectations: %v", err)
	}
}

func TestUpdateIncomeRejectsCategoryFromAnotherAccount(t *testing.T) {
	gin.SetMode(gin.TestMode)

	mock, err := pgxmock.NewPool()
	if err != nil {
		t.Fatalf("pgxmock.NewPool() error = %v", err)
	}
	defer mock.Close()

	categoryID := testIncomeCategoryID
	mock.ExpectQuery(`SELECT income_type, amount, currency, exchange_rate, amount_in_primary_currency, date::TEXT, deleted_at\s+FROM incomes WHERE id = \$1 AND account_id = \$2`).
		WithArgs(testIncomeID, testIncomeAccountID).
		WillReturnRows(mock.NewRows([]string{"income_type", "amount", "currency", "exchange_rate", "amount_in_primary_currency", "date", "deleted_at"}).AddRow("one-time", 200000.0, "ARS", 1.0, 200000.0, "2026-01-20", nil))
	mock.ExpectQuery(`SELECT EXISTS\(`).
		WithArgs(&categoryID, testIncomeAccountID).
		WillReturnRows(mock.NewRows([]string{"exists"}).AddRow(false))

	recorder := httptest.NewRecorder()
	router := incomeTestRouter(updateIncomeHandler(mock))

	req := httptest.NewRequest(http.MethodPut, "/incomes/"+testIncomeID, bytes.NewBufferString(`{"category_id":"`+categoryID+`"}`))
	req.Header.Set("Content-Type", "application/json")

	router.ServeHTTP(recorder, req)

	if recorder.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, want %d, body = %s", recorder.Code, http.StatusBadRequest, recorder.Body.String())
	}
	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("mock expectations: %v", err)
	}
}

func TestUpdateIncomeAcceptsEURCurrency(t *testing.T) {
	gin.SetMode(gin.TestMode)

	mock, err := pgxmock.NewPool()
	if err != nil {
		t.Fatalf("pgxmock.NewPool() error = %v", err)
	}
	defer mock.Close()

	var nilString *string
	var nilFloat *float64
	transactionDate := time.Date(2026, time.January, 20, 0, 0, 0, 0, time.UTC)
	createdAt := time.Date(2026, time.January, 20, 10, 0, 0, 0, time.UTC)

	mock.ExpectQuery(`SELECT income_type, amount, currency, exchange_rate, amount_in_primary_currency, date::TEXT, deleted_at\s+FROM incomes WHERE id = \$1 AND account_id = \$2`).
		WithArgs(testIncomeID, testIncomeAccountID).
		WillReturnRows(mock.NewRows([]string{"income_type", "amount", "currency", "exchange_rate", "amount_in_primary_currency", "date", "deleted_at"}).AddRow("one-time", 200000.0, "ARS", 1.0, 200000.0, "2026-01-20", nil))
	mock.ExpectQuery(`SELECT currency FROM accounts WHERE id = \$1`).
		WithArgs(testIncomeAccountID).
		WillReturnRows(mock.NewRows([]string{"currency"}).AddRow("ARS"))
	mock.ExpectQuery(`UPDATE incomes SET`).
		WithArgs(nilString, nilString, nilString, nilFloat, pgxmock.AnyArg(), nilString, nilString, nilString, testIncomeID, testIncomeAccountID, pgxmock.AnyArg(), pgxmock.AnyArg(), false, nilString, false, nilString, false, nilString).
		WillReturnRows(mock.NewRows([]string{"id", "account_id", "family_member_id", "category_id", "description", "amount", "currency", "exchange_rate", "amount_in_primary_currency", "income_type", "date", "end_date", "payment_method", "destination_container_id", "destination_instrument_id", "created_at"}).AddRow(testIncomeID, testIncomeAccountID, nil, nil, "Sueldo", 200000.0, "EUR", 1.2, 240000.0, "one-time", &transactionDate, nil, nil, nil, nil, createdAt))

	recorder := httptest.NewRecorder()
	router := incomeTestRouter(updateIncomeHandler(mock))

	req := httptest.NewRequest(http.MethodPut, "/incomes/"+testIncomeID, bytes.NewBufferString(`{"currency":"EUR","amount_in_primary_currency":240000}`))
	req.Header.Set("Content-Type", "application/json")

	router.ServeHTTP(recorder, req)

	if recorder.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d, body = %s", recorder.Code, http.StatusOK, recorder.Body.String())
	}

	var response map[string]any
	if err := json.Unmarshal(recorder.Body.Bytes(), &response); err != nil {
		t.Fatalf("json.Unmarshal() error = %v", err)
	}
	if got := response["currency"]; got != "EUR" {
		t.Fatalf("currency = %#v, want EUR", got)
	}
	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("mock expectations: %v", err)
	}
}
