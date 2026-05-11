package expenses

import (
	"bytes"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/pashagolub/pgxmock/v5"
)

const testExpenseCategoryID = "55555555-5555-5555-5555-555555555555"

func TestCreateExpenseRejectsCategoryFromAnotherAccount(t *testing.T) {
	gin.SetMode(gin.TestMode)

	mock, err := pgxmock.NewPool()
	if err != nil {
		t.Fatalf("pgxmock.NewPool() error = %v", err)
	}
	defer mock.Close()

	categoryID := testExpenseCategoryID
	mock.ExpectQuery(`SELECT EXISTS\(`).
		WithArgs(&categoryID, testExpenseAccountID).
		WillReturnRows(mock.NewRows([]string{"exists"}).AddRow(false))

	recorder := httptest.NewRecorder()
	router := expenseTestRouter(createExpenseHandler(mock))

	req := httptest.NewRequest(http.MethodPost, "/expenses", bytes.NewBufferString(`{"description":"Supermercado","amount":25000,"currency":"ARS","date":"2026-01-16","category_id":"`+categoryID+`"}`))
	req.Header.Set("Content-Type", "application/json")

	router.ServeHTTP(recorder, req)

	if recorder.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, want %d, body = %s", recorder.Code, http.StatusBadRequest, recorder.Body.String())
	}
	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("mock expectations: %v", err)
	}
}

func TestUpdateExpenseRejectsCategoryFromAnotherAccount(t *testing.T) {
	gin.SetMode(gin.TestMode)

	mock, err := pgxmock.NewPool()
	if err != nil {
		t.Fatalf("pgxmock.NewPool() error = %v", err)
	}
	defer mock.Close()

	categoryID := testExpenseCategoryID
	mock.ExpectQuery(`SELECT expense_type, amount, currency, exchange_rate, amount_in_primary_currency, date::TEXT, deleted_at\s+FROM expenses WHERE id = \$1 AND account_id = \$2`).
		WithArgs(testExpenseID, testExpenseAccountID).
		WillReturnRows(mock.NewRows([]string{"expense_type", "amount", "currency", "exchange_rate", "amount_in_primary_currency", "date", "deleted_at"}).AddRow("one-time", 25000.0, "ARS", 1.0, 25000.0, "2026-01-16", nil))
	mock.ExpectQuery(`SELECT EXISTS\(`).
		WithArgs(&categoryID, testExpenseAccountID).
		WillReturnRows(mock.NewRows([]string{"exists"}).AddRow(false))

	recorder := httptest.NewRecorder()
	router := expenseTestRouter(updateExpenseHandler(mock))

	req := httptest.NewRequest(http.MethodPut, "/expenses/"+testExpenseID, bytes.NewBufferString(`{"category_id":"`+categoryID+`"}`))
	req.Header.Set("Content-Type", "application/json")

	router.ServeHTTP(recorder, req)

	if recorder.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, want %d, body = %s", recorder.Code, http.StatusBadRequest, recorder.Body.String())
	}
	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("mock expectations: %v", err)
	}
}
