package imports

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"regexp"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5"
	"github.com/pashagolub/pgxmock/v5"
)

func TestCommitExcelTemplateRejectsMissingCategoryMapping(t *testing.T) {
	gin.SetMode(gin.TestMode)

	workbook := newTemplateWorkbook(t, templateWorkbookOptions{
		januarySheetName: "Enero ",
		rows:             []templateRow{{sheet: "Enero ", row: 8, dateValue: 5, description: "Bonus", amount: 100000, txType: "Ingreso", paymentMethod: "Transferencia", category: "Bonus"}},
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
	expectEmptyImportPaymentContextCatalog(mock)

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
	mock.ExpectQuery(`FROM payment_containers`).
		WithArgs(testImportAccountID).
		WillReturnRows(mock.NewRows([]string{"id", "name"}).AddRow("cash-container", "Efectivo").AddRow("bank-container", "Transferencia"))
	mock.ExpectBegin()
	mock.ExpectQuery(`SELECT currency FROM accounts WHERE id = \$1`).
		WithArgs(testImportAccountID).
		WillReturnRows(mock.NewRows([]string{"currency"}).AddRow("ARS"))
	mock.ExpectQuery(regexp.QuoteMeta(`INSERT INTO expenses (
			account_id, category_id, description, amount, currency, exchange_rate, amount_in_primary_currency, expense_type, date, payment_method, source_container_id, source_instrument_id, import_fingerprint
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
		ON CONFLICT (import_fingerprint) WHERE import_fingerprint IS NOT NULL DO NOTHING
		RETURNING id`)).
		WithArgs(testImportAccountID, stringPtr("expense-cat"), "Supermercado", 1500.0, "ARS", 1.0, 1500.0, "one-time", "2026-01-05", stringPtr("cash"), stringPtr("cash-container"), nilStringPtr(), pgxmock.AnyArg()).
		WillReturnRows(mock.NewRows([]string{"id"}).AddRow("expense-created"))
	mock.ExpectQuery(`SELECT currency FROM accounts WHERE id = \$1`).
		WithArgs(testImportAccountID).
		WillReturnRows(mock.NewRows([]string{"currency"}).AddRow("ARS"))
	mock.ExpectQuery(regexp.QuoteMeta(`INSERT INTO incomes (
			account_id, category_id, description, amount, currency, exchange_rate, amount_in_primary_currency, income_type, date, payment_method, destination_container_id, destination_instrument_id, import_fingerprint
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
		ON CONFLICT (import_fingerprint) WHERE import_fingerprint IS NOT NULL DO NOTHING
		RETURNING id`)).
		WithArgs(testImportAccountID, stringPtr("income-cat"), "Sueldo", 200000.0, "ARS", 1.0, 200000.0, "one-time", "2026-01-06", stringPtr("bank_transfer"), stringPtr("bank-container"), nilStringPtr(), pgxmock.AnyArg()).
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
	expectEmptyImportPaymentContextCatalog(mock)
	mock.ExpectBegin()
	mock.ExpectQuery(`SELECT currency FROM accounts WHERE id = \$1`).
		WithArgs(testImportAccountID).
		WillReturnRows(mock.NewRows([]string{"currency"}).AddRow("ARS"))
	mock.ExpectQuery(regexp.QuoteMeta(`INSERT INTO expenses (
			account_id, category_id, description, amount, currency, exchange_rate, amount_in_primary_currency, expense_type, date, payment_method, source_container_id, source_instrument_id, import_fingerprint
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
		ON CONFLICT (import_fingerprint) WHERE import_fingerprint IS NOT NULL DO NOTHING
		RETURNING id`)).
		WithArgs(testImportAccountID, stringPtr("expense-services"), "Luz", 1500.0, "ARS", 1.0, 1500.0, "one-time", "2026-01-05", stringPtr("cash"), nilStringPtr(), nilStringPtr(), pgxmock.AnyArg()).
		WillReturnRows(mock.NewRows([]string{"id"}).AddRow("expense-created"))
	mock.ExpectQuery(`SELECT currency FROM accounts WHERE id = \$1`).
		WithArgs(testImportAccountID).
		WillReturnRows(mock.NewRows([]string{"currency"}).AddRow("ARS"))
	mock.ExpectQuery(regexp.QuoteMeta(`INSERT INTO incomes (
			account_id, category_id, description, amount, currency, exchange_rate, amount_in_primary_currency, income_type, date, payment_method, destination_container_id, destination_instrument_id, import_fingerprint
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
		ON CONFLICT (import_fingerprint) WHERE import_fingerprint IS NOT NULL DO NOTHING
		RETURNING id`)).
		WithArgs(testImportAccountID, stringPtr("income-services"), "Reintegro", 2000.0, "ARS", 1.0, 2000.0, "one-time", "2026-01-06", stringPtr("bank_transfer"), nilStringPtr(), nilStringPtr(), pgxmock.AnyArg()).
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

func TestCommitExcelTemplatePersistsIdenticalRowsFromDifferentSourceRows(t *testing.T) {
	gin.SetMode(gin.TestMode)

	workbook := newTemplateWorkbook(t, templateWorkbookOptions{
		januarySheetName: "Enero ",
		rows: []templateRow{
			{sheet: "Enero ", row: 8, dateValue: 5, description: "Cafe", amount: 1200, txType: "Egreso", paymentMethod: "Efectivo", category: "Comida"},
			{sheet: "Enero ", row: 9, dateValue: 5, description: "Cafe", amount: 1200, txType: "Egreso", paymentMethod: "Efectivo", category: "Comida"},
		},
	})

	mock, err := pgxmock.NewPool()
	if err != nil {
		t.Fatalf("pgxmock.NewPool() error = %v", err)
	}
	defer mock.Close()

	normalized := normalizedTypeExpense
	date := "2026-01-05"
	amount := 1200.0
	firstFingerprint := importedRowFingerprint(testImportAccountID, "ARS", PreviewRow{RowID: "enero:8", NormalizedType: &normalized, Date: &date, Description: "Cafe", Amount: &amount, SuggestedCategoryID: stringPtr("expense-cat"), PaymentMethod: stringPtr("cash")})
	secondFingerprint := importedRowFingerprint(testImportAccountID, "ARS", PreviewRow{RowID: "enero:9", NormalizedType: &normalized, Date: &date, Description: "Cafe", Amount: &amount, SuggestedCategoryID: stringPtr("expense-cat"), PaymentMethod: stringPtr("cash")})
	if firstFingerprint == secondFingerprint {
		t.Fatal("fingerprints for different source rows are equal, want distinct")
	}

	mock.ExpectQuery(`FROM expense_categories`).
		WithArgs(testImportAccountID).
		WillReturnRows(mock.NewRows([]string{"id", "name"}).AddRow("expense-cat", "Comida"))
	mock.ExpectQuery(`FROM income_categories`).
		WithArgs(testImportAccountID).
		WillReturnRows(mock.NewRows([]string{"id", "name"}))
	expectEmptyImportPaymentContextCatalog(mock)
	mock.ExpectBegin()
	for _, expected := range []struct {
		fingerprint string
		createdID   string
	}{
		{fingerprint: firstFingerprint, createdID: "expense-created-1"},
		{fingerprint: secondFingerprint, createdID: "expense-created-2"},
	} {
		mock.ExpectQuery(`SELECT currency FROM accounts WHERE id = \$1`).
			WithArgs(testImportAccountID).
			WillReturnRows(mock.NewRows([]string{"currency"}).AddRow("ARS"))
		mock.ExpectQuery(regexp.QuoteMeta(`INSERT INTO expenses (
			account_id, category_id, description, amount, currency, exchange_rate, amount_in_primary_currency, expense_type, date, payment_method, source_container_id, source_instrument_id, import_fingerprint
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
		ON CONFLICT (import_fingerprint) WHERE import_fingerprint IS NOT NULL DO NOTHING
		RETURNING id`)).
			WithArgs(testImportAccountID, stringPtr("expense-cat"), "Cafe", 1200.0, "ARS", 1.0, 1200.0, "one-time", "2026-01-05", stringPtr("cash"), nilStringPtr(), nilStringPtr(), expected.fingerprint).
			WillReturnRows(mock.NewRows([]string{"id"}).AddRow(expected.createdID))
	}
	mock.ExpectCommit()

	recorder := httptest.NewRecorder()
	router := importTestRouter(commitHandler(mock))

	decisions := `{"approved_row_ids":["enero:8","enero:9"],"category_map":{}}`
	req := newMultipartImportRequest(t, "/imports/excel-template/commit", workbook, map[string]string{"currency": "ARS", "decisions": decisions})
	router.ServeHTTP(recorder, req)

	if recorder.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d, body = %s", recorder.Code, http.StatusOK, recorder.Body.String())
	}

	var response CommitResponse
	if err := json.Unmarshal(recorder.Body.Bytes(), &response); err != nil {
		t.Fatalf("json.Unmarshal() error = %v", err)
	}
	if response.Created.Expense != 2 || response.Skipped.Total != 0 {
		t.Fatalf("response = %+v, want 2 expenses and 0 skipped", response)
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("mock expectations: %v", err)
	}
}

func TestInsertImportedRowSkipsDuplicateFingerprint(t *testing.T) {
	mock, err := pgxmock.NewPool()
	if err != nil {
		t.Fatalf("pgxmock.NewPool() error = %v", err)
	}
	defer mock.Close()

	normalized := normalizedTypeExpense
	date := "2026-01-05"
	amount := 1500.0
	row := PreviewRow{
		NormalizedType:      &normalized,
		Date:                &date,
		Description:         "Supermercado",
		Amount:              &amount,
		SuggestedCategoryID: stringPtr("expense-cat"),
		PaymentMethod:       stringPtr("cash"),
	}

	mock.ExpectBegin()
	tx, err := mock.Begin(t.Context())
	if err != nil {
		t.Fatalf("mock.Begin() error = %v", err)
	}

	mock.ExpectQuery(regexp.QuoteMeta(`INSERT INTO expenses (
			account_id, category_id, description, amount, currency, exchange_rate, amount_in_primary_currency, expense_type, date, payment_method, source_container_id, source_instrument_id, import_fingerprint
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
		ON CONFLICT (import_fingerprint) WHERE import_fingerprint IS NOT NULL DO NOTHING
		RETURNING id`)).
		WithArgs(testImportAccountID, stringPtr("expense-cat"), "Supermercado", 1500.0, "ARS", 1.0, 1500.0, "one-time", "2026-01-05", stringPtr("cash"), nilStringPtr(), nilStringPtr(), pgxmock.AnyArg()).
		WillReturnError(pgx.ErrNoRows)

	created, err := insertImportedRow(t.Context(), tx, testImportAccountID, "ARS", 1, 1500, row)
	if err != nil {
		t.Fatalf("insertImportedRow() error = %v", err)
	}
	if created {
		t.Fatal("insertImportedRow() created = true, want false for duplicate")
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("mock expectations: %v", err)
	}
}

func TestImportedRowFingerprintUsesStableSourceRowIdentity(t *testing.T) {
	normalized := normalizedTypeExpense
	date := "2026-01-05"
	amount := 1500.0
	baseRow := PreviewRow{
		NormalizedType:      &normalized,
		Date:                &date,
		Description:         "Supermercado",
		Amount:              &amount,
		SuggestedCategoryID: stringPtr("expense-cat"),
		PaymentMethod:       stringPtr("cash"),
	}

	tests := []struct {
		name  string
		left  PreviewRow
		right PreviewRow
		equal bool
	}{
		{
			name:  "same source row is idempotent",
			left:  withRowID(baseRow, "enero:8"),
			right: withRowID(baseRow, "enero:8"),
			equal: true,
		},
		{
			name:  "different source rows are distinct",
			left:  withRowID(baseRow, "enero:8"),
			right: withRowID(baseRow, "enero:9"),
			equal: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			left := importedRowFingerprint(testImportAccountID, "ARS", tt.left)
			right := importedRowFingerprint(testImportAccountID, "ARS", tt.right)
			if (left == right) != tt.equal {
				t.Fatalf("fingerprint equality = %v, want %v", left == right, tt.equal)
			}
		})
	}
}

func withRowID(row PreviewRow, rowID string) PreviewRow {
	row.RowID = rowID
	return row
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
