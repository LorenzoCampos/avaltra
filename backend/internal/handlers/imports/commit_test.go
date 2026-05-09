package imports

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"regexp"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/pashagolub/pgxmock/v5"
)

func TestCommitExcelTemplateRejectsMissingCategoryMapping(t *testing.T) {
	gin.SetMode(gin.TestMode)

	workbook := newTemplateWorkbook(t, templateWorkbookOptions{
		januarySheetName: "Enero ",
		rows: []templateRow{{sheet: "Enero ", row: 8, dateValue: 5, description: "Bonus", amount: 100000, txType: "Ingreso", paymentMethod: "Transferencia", category: "Bonus"}},
	})

	mock, err := pgxmock.NewPool()
	if err != nil {
		t.Fatalf("pgxmock.NewPool() error = %v", err)
	}
	defer mock.Close()

	mock.ExpectQuery(`FROM expense_categories`).
		WithArgs(testImportAccountID).
		WillReturnRows(mock.NewRows([]string{"id", "name"}).AddRow("expense-services", "Servicios destino"))
	mock.ExpectQuery(`FROM income_categories`).
		WithArgs(testImportAccountID).
		WillReturnRows(mock.NewRows([]string{"id", "name"}).AddRow("income-services", "Servicios ingreso"))

	recorder := httptest.NewRecorder()
	router := importTestRouter(commitHandler(mock))

	decisions := `{"approved_row_ids":["enero:8"],"category_map":{}}`
	req := newMultipartImportRequest(t, "/imports/excel-template/commit", workbook, map[string]string{"currency": "ARS", "decisions": decisions})
	router.ServeHTTP(recorder, req)

	if recorder.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, want %d, body = %s", recorder.Code, http.StatusBadRequest, recorder.Body.String())
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("mock expectations: %v", err)
	}
}

func TestCommitExcelTemplatePersistsApprovedRowsInOneTransaction(t *testing.T) {
	gin.SetMode(gin.TestMode)

	workbook := newTemplateWorkbook(t, templateWorkbookOptions{
		januarySheetName: "Enero ",
		rows: []templateRow{
			{sheet: "Enero ", row: 8, dateValue: 5, description: "Supermercado", amount: 1500, txType: "Egreso", paymentMethod: "Efectivo", category: "Comida"},
			{sheet: "Enero ", row: 9, dateValue: 6, description: "Sueldo", amount: 200000, txType: "Ingreso", paymentMethod: "Transferencia", category: "Salario"},
			{sheet: "Enero ", row: 10, dateValue: 7, description: "Ahorro sobre", amount: 2000, txType: "Ahorro", paymentMethod: "Efectivo", category: "Ahorro"},
		},
	})

	mock, err := pgxmock.NewPool()
	if err != nil {
		t.Fatalf("pgxmock.NewPool() error = %v", err)
	}
	defer mock.Close()

	mock.ExpectQuery(`FROM expense_categories`).
		WithArgs(testImportAccountID).
		WillReturnRows(mock.NewRows([]string{"id", "name"}).AddRow("expense-cat", "Comida"))
	mock.ExpectQuery(`FROM income_categories`).
		WithArgs(testImportAccountID).
		WillReturnRows(mock.NewRows([]string{"id", "name"}).AddRow("income-cat", "Salario"))
	mock.ExpectBegin()
	mock.ExpectQuery(`SELECT currency FROM accounts WHERE id = \$1`).
		WithArgs(testImportAccountID).
		WillReturnRows(mock.NewRows([]string{"currency"}).AddRow("ARS"))
	mock.ExpectQuery(regexp.QuoteMeta(`INSERT INTO expenses (
			account_id, category_id, description, amount, currency, exchange_rate, amount_in_primary_currency, expense_type, date, payment_method
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
		RETURNING id`)).
		WithArgs(testImportAccountID, stringPtr("expense-cat"), "Supermercado", 1500.0, "ARS", 1.0, 1500.0, "one-time", "2026-01-05", stringPtr("cash")).
		WillReturnRows(mock.NewRows([]string{"id"}).AddRow("expense-created"))
	mock.ExpectQuery(`SELECT currency FROM accounts WHERE id = \$1`).
		WithArgs(testImportAccountID).
		WillReturnRows(mock.NewRows([]string{"currency"}).AddRow("ARS"))
	mock.ExpectQuery(regexp.QuoteMeta(`INSERT INTO incomes (
			account_id, category_id, description, amount, currency, exchange_rate, amount_in_primary_currency, income_type, date, payment_method
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
		RETURNING id`)).
		WithArgs(testImportAccountID, stringPtr("income-cat"), "Sueldo", 200000.0, "ARS", 1.0, 200000.0, "one-time", "2026-01-06", stringPtr("bank_transfer")).
		WillReturnRows(mock.NewRows([]string{"id"}).AddRow("income-created"))
	mock.ExpectCommit()

	recorder := httptest.NewRecorder()
	router := importTestRouter(commitHandler(mock))

	decisions := `{"approved_row_ids":["enero:8","enero:9"],"category_map":{}}`
	req := newMultipartImportRequest(t, "/imports/excel-template/commit", workbook, map[string]string{"currency": "ARS", "decisions": decisions})
	router.ServeHTTP(recorder, req)

	if recorder.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d, body = %s", recorder.Code, http.StatusOK, recorder.Body.String())
	}

	var raw map[string]any
	if err := json.Unmarshal(recorder.Body.Bytes(), &raw); err != nil {
		t.Fatalf("json.Unmarshal() error = %v", err)
	}

	created := raw["created"].(map[string]any)
	if created["expense"] != float64(1) || created["income"] != float64(1) {
		t.Fatalf("created = %#v, want expense=1 income=1", created)
	}
	skipped := raw["skipped"].(map[string]any)
	if skipped["total"] != float64(1) {
		t.Fatalf("skipped.total = %#v, want 1", skipped["total"])
	}
	byReason := skipped["by_reason"].(map[string]any)
	if byReason["unsupported_type_ahorro"] != float64(1) {
		t.Fatalf("skipped.by_reason = %#v, want ahorro=1", byReason)
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("mock expectations: %v", err)
	}
}

func TestCommitExcelTemplateAcceptsTypedCategoryMapKeysForSharedLabels(t *testing.T) {
	gin.SetMode(gin.TestMode)

	workbook := newTemplateWorkbook(t, templateWorkbookOptions{
		januarySheetName: "Enero ",
		rows: []templateRow{
			{sheet: "Enero ", row: 8, dateValue: 5, description: "Luz", amount: 1500, txType: "Egreso", paymentMethod: "Efectivo", category: "Servicios"},
			{sheet: "Enero ", row: 9, dateValue: 6, description: "Reintegro", amount: 2000, txType: "Ingreso", paymentMethod: "Transferencia", category: "Servicios"},
		},
	})

	mock, err := pgxmock.NewPool()
	if err != nil {
		t.Fatalf("pgxmock.NewPool() error = %v", err)
	}
	defer mock.Close()

	mock.ExpectQuery(`FROM expense_categories`).
		WithArgs(testImportAccountID).
		WillReturnRows(mock.NewRows([]string{"id", "name"}).AddRow("expense-services", "Servicios hogar"))
	mock.ExpectQuery(`FROM income_categories`).
		WithArgs(testImportAccountID).
		WillReturnRows(mock.NewRows([]string{"id", "name"}).AddRow("income-services", "Servicios reintegro"))
	mock.ExpectBegin()
	mock.ExpectQuery(`SELECT currency FROM accounts WHERE id = \$1`).
		WithArgs(testImportAccountID).
		WillReturnRows(mock.NewRows([]string{"currency"}).AddRow("ARS"))
	mock.ExpectQuery(regexp.QuoteMeta(`INSERT INTO expenses (
			account_id, category_id, description, amount, currency, exchange_rate, amount_in_primary_currency, expense_type, date, payment_method
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
		RETURNING id`)).
		WithArgs(testImportAccountID, stringPtr("expense-services"), "Luz", 1500.0, "ARS", 1.0, 1500.0, "one-time", "2026-01-05", stringPtr("cash")).
		WillReturnRows(mock.NewRows([]string{"id"}).AddRow("expense-created"))
	mock.ExpectQuery(`SELECT currency FROM accounts WHERE id = \$1`).
		WithArgs(testImportAccountID).
		WillReturnRows(mock.NewRows([]string{"currency"}).AddRow("ARS"))
	mock.ExpectQuery(regexp.QuoteMeta(`INSERT INTO incomes (
			account_id, category_id, description, amount, currency, exchange_rate, amount_in_primary_currency, income_type, date, payment_method
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
		RETURNING id`)).
		WithArgs(testImportAccountID, stringPtr("income-services"), "Reintegro", 2000.0, "ARS", 1.0, 2000.0, "one-time", "2026-01-06", stringPtr("bank_transfer")).
		WillReturnRows(mock.NewRows([]string{"id"}).AddRow("income-created"))
	mock.ExpectCommit()

	recorder := httptest.NewRecorder()
	router := importTestRouter(commitHandler(mock))

	decisions := `{"approved_row_ids":["enero:8","enero:9"],"category_map":{"expense:Servicios":"expense-services","income:Servicios":"income-services"}}`
	req := newMultipartImportRequest(t, "/imports/excel-template/commit", workbook, map[string]string{"currency": "ARS", "decisions": decisions})
	router.ServeHTTP(recorder, req)

	if recorder.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d, body = %s", recorder.Code, http.StatusOK, recorder.Body.String())
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("mock expectations: %v", err)
	}
}

func TestResolveImportAmountsUsesAccountPrimaryCurrency(t *testing.T) {
	date := time.Date(2026, time.January, 5, 0, 0, 0, 0, time.UTC)
	mock, err := pgxmock.NewPool()
	if err != nil {
		t.Fatalf("pgxmock.NewPool() error = %v", err)
	}
	defer mock.Close()

	mock.ExpectQuery(`SELECT currency FROM accounts WHERE id = \$1`).
		WithArgs(testImportAccountID).
		WillReturnRows(mock.NewRows([]string{"currency"}).AddRow("ARS"))

	exchangeRate, amountInPrimary, err := resolveImportAmounts(t.Context(), mock, testImportAccountID, "ARS", 1500, date)
	if err != nil {
		t.Fatalf("resolveImportAmounts() error = %v", err)
	}
	if exchangeRate != 1 || amountInPrimary != 1500 {
		t.Fatalf("resolveImportAmounts() = (%v, %v), want (1, 1500)", exchangeRate, amountInPrimary)
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("mock expectations: %v", err)
	}
}
