package imports

import (
	"bytes"
	"encoding/json"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/pashagolub/pgxmock/v5"
)

func TestPreviewExcelTemplateClassifiesRowsWithoutWriting(t *testing.T) {
	gin.SetMode(gin.TestMode)

	workbook := newTemplateWorkbook(t, templateWorkbookOptions{
		januarySheetName: "Enero ",
		rows: []templateRow{
			{sheet: "Enero ", row: 8, dateValue: 5, description: "Supermercado", amount: 1500, txType: "Egreso", paymentMethod: "Efectivo", category: "Comida"},
			{sheet: "Enero ", row: 9, dateValue: 6, description: "Sueldo", amount: 200000, txType: "Ingreso", paymentMethod: "Transferencia", category: "Bonus"},
			{sheet: "Enero ", row: 10, dateValue: 7, description: "Ahorro sobre", amount: 2000, txType: "Ahorro", paymentMethod: "Efectivo", category: "Ahorro"},
			{sheet: "Enero ", row: 11, dateValue: 8, description: "Compra rara", amount: 500, txType: "Egreso", paymentMethod: "Crypto", category: "Comida"},
			{sheet: "Enero ", row: 12, dateValue: "fecha rota", description: "Taxi", amount: 450, txType: "Egreso", paymentMethod: "", category: "Traslado"},
			{sheet: "Enero ", row: 13, dateValue: 9, description: "", amount: 600, txType: "Egreso", paymentMethod: "", category: "Comida"},
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
		WillReturnRows(mock.NewRows([]string{"id", "name"}).AddRow("cash-container", "Efectivo"))
	mock.ExpectQuery(`FROM payment_instruments`).
		WithArgs(testImportAccountID).
		WillReturnRows(mock.NewRows([]string{"id", "name", "backing_container_id"}))

	recorder := httptest.NewRecorder()
	router := importTestRouter(previewHandler(mock))

	req := newMultipartImportRequest(t, "/imports/excel-template/preview", workbook, map[string]string{"currency": "ARS"})
	router.ServeHTTP(recorder, req)

	if recorder.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d, body = %s", recorder.Code, http.StatusOK, recorder.Body.String())
	}

	var response PreviewResponse
	if err := json.Unmarshal(recorder.Body.Bytes(), &response); err != nil {
		t.Fatalf("json.Unmarshal() error = %v", err)
	}

	if response.Summary.Importable != 2 || response.Summary.Invalid != 3 || response.Summary.Excluded != 1 {
		t.Fatalf("summary = %+v, want importable=2 invalid=3 excluded=1", response.Summary)
	}

	if len(response.Importable) != 2 {
		t.Fatalf("len(importable) = %d, want 2", len(response.Importable))
	}
	if response.Importable[0].CategoryMappingStatus != categoryMappingStatusResolved {
		t.Fatalf("first importable category status = %q, want %q", response.Importable[0].CategoryMappingStatus, categoryMappingStatusResolved)
	}
	if response.Importable[0].SourceContainerID == nil || *response.Importable[0].SourceContainerID != "cash-container" {
		t.Fatalf("first importable source_container_id = %v, want cash-container", response.Importable[0].SourceContainerID)
	}
	if response.Importable[0].PaymentMethod == nil || *response.Importable[0].PaymentMethod != "cash" {
		t.Fatalf("first importable payment_method = %v, want legacy cash alias preserved", response.Importable[0].PaymentMethod)
	}
	if response.Importable[1].CategoryMappingStatus != categoryMappingStatusRequired {
		t.Fatalf("second importable category status = %q, want %q", response.Importable[1].CategoryMappingStatus, categoryMappingStatusRequired)
	}
	if len(response.CategoryMappings.Income) != 1 {
		t.Fatalf("len(category_mappings.income) = %d, want 1", len(response.CategoryMappings.Income))
	}
	if response.CategoryMappings.Income[0].SourceCategory != "Bonus" {
		t.Fatalf("income mapping source_category = %q, want %q", response.CategoryMappings.Income[0].SourceCategory, "Bonus")
	}
	if response.CategoryMappings.Income[0].MappingKey != "income:Bonus" {
		t.Fatalf("income mapping key = %q, want %q", response.CategoryMappings.Income[0].MappingKey, "income:Bonus")
	}
	if response.CategoryMappings.Income[0].MappingStatus != categoryMappingStatusRequired {
		t.Fatalf("income mapping status = %q, want %q", response.CategoryMappings.Income[0].MappingStatus, categoryMappingStatusRequired)
	}
	if len(response.Excluded) != 1 || response.Excluded[0].ReasonCodes[0] != "unsupported_type_ahorro" {
		t.Fatalf("excluded = %+v, want ahorro exclusion", response.Excluded)
	}
	if len(response.Invalid) != 3 {
		t.Fatalf("len(invalid) = %d, want 3", len(response.Invalid))
	}

	invalidByRowID := map[string]PreviewRow{}
	for _, row := range response.Invalid {
		invalidByRowID[row.RowID] = row
	}
	if !equalStringSlice(invalidByRowID["enero:11"].ReasonCodes, []string{"unsupported_payment_method"}) {
		t.Fatalf("invalid enero:11 = %+v, want unsupported payment method", invalidByRowID["enero:11"])
	}
	if !equalStringSlice(invalidByRowID["enero:12"].ReasonCodes, []string{"invalid_date"}) {
		t.Fatalf("invalid enero:12 = %+v, want invalid_date", invalidByRowID["enero:12"])
	}
	if invalidByRowID["enero:12"].PaymentMethod != nil {
		t.Fatalf("invalid enero:12 payment_method = %v, want nil for blank MEDIO", invalidByRowID["enero:12"].PaymentMethod)
	}
	if !equalStringSlice(invalidByRowID["enero:13"].ReasonCodes, []string{"missing_description"}) {
		t.Fatalf("invalid enero:13 = %+v, want missing_description", invalidByRowID["enero:13"])
	}

	var raw map[string]any
	if err := json.Unmarshal(recorder.Body.Bytes(), &raw); err != nil {
		t.Fatalf("json.Unmarshal(raw) error = %v", err)
	}
	incomeMappings := raw["category_mappings"].(map[string]any)["income"].([]any)
	firstIncomeMapping := incomeMappings[0].(map[string]any)
	if _, ok := firstIncomeMapping["mapping_status"]; !ok {
		t.Fatalf("income mapping JSON = %#v, want mapping_status key", firstIncomeMapping)
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("mock expectations: %v", err)
	}
}

func TestResolveImportPaymentContextOnlyAttachesDeterministicMatches(t *testing.T) {
	containerID := "container-1"
	instrumentID := "instrument-1"
	backingID := "backing-1"
	catalog := paymentContextCatalog{byLookupKey: map[string][]paymentContextRef{
		"efectivo": {{ContainerID: &containerID}},
		"visa":     {{ContainerID: &backingID, InstrumentID: &instrumentID}},
		"banco": {
			{ContainerID: stringPtr("bank-1")},
			{ContainerID: stringPtr("bank-2")},
		},
	}}

	container, instrument := resolveImportPaymentContext("Visa", catalog)
	if container == nil || *container != backingID || instrument == nil || *instrument != instrumentID {
		t.Fatalf("resolveImportPaymentContext(Visa) = (%v, %v), want backed instrument", container, instrument)
	}

	container, instrument = resolveImportPaymentContext("Banco", catalog)
	if container != nil || instrument != nil {
		t.Fatalf("resolveImportPaymentContext(Banco) = (%v, %v), want nil for ambiguous match", container, instrument)
	}

	container, instrument = resolveImportPaymentContext("Crypto", catalog)
	if container != nil || instrument != nil {
		t.Fatalf("resolveImportPaymentContext(Crypto) = (%v, %v), want nil for unknown match", container, instrument)
	}
}

const testImportAccountID = "55555555-5555-5555-5555-555555555555"

func importTestRouter(handler gin.HandlerFunc) *gin.Engine {
	router := gin.New()
	router.Use(func(c *gin.Context) {
		c.Set("account_id", testImportAccountID)
		c.Next()
	})
	router.POST("/imports/excel-template/preview", handler)
	router.POST("/imports/excel-template/commit", handler)
	return router
}

func newMultipartImportRequest(t *testing.T, target string, workbook []byte, fields map[string]string) *http.Request {
	t.Helper()

	var body bytes.Buffer
	writer := multipart.NewWriter(&body)

	part, err := writer.CreateFormFile("file", "template.xlsx")
	if err != nil {
		t.Fatalf("CreateFormFile() error = %v", err)
	}
	if _, err := part.Write(workbook); err != nil {
		t.Fatalf("part.Write() error = %v", err)
	}

	for key, value := range fields {
		if err := writer.WriteField(key, value); err != nil {
			t.Fatalf("WriteField(%q) error = %v", key, err)
		}
	}

	if err := writer.Close(); err != nil {
		t.Fatalf("writer.Close() error = %v", err)
	}

	req := httptest.NewRequest(http.MethodPost, target, &body)
	req.Header.Set("Content-Type", writer.FormDataContentType())
	return req
}

func expectEmptyImportPaymentContextCatalog(mock pgxmock.PgxPoolIface) {
	mock.ExpectQuery(`FROM payment_containers`).
		WithArgs(testImportAccountID).
		WillReturnRows(mock.NewRows([]string{"id", "name"}))
	mock.ExpectQuery(`FROM payment_instruments`).
		WithArgs(testImportAccountID).
		WillReturnRows(mock.NewRows([]string{"id", "name", "backing_container_id"}))
}

func nilStringPtr() *string {
	return nil
}
