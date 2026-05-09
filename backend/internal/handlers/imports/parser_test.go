package imports

import (
	"bytes"
	"testing"
	"time"

	"github.com/xuri/excelize/v2"
)

func TestParseWorkbookSupportsTrimmedMonthSheetsAndDateFormats(t *testing.T) {
	workbook := newTemplateWorkbook(t, templateWorkbookOptions{
		januarySheetName: "Enero ",
		rows: []templateRow{
			{sheet: "Enero ", row: 8, dateValue: 5, description: "Supermercado", amount: 1500, txType: "Egreso", paymentMethod: "Efectivo", category: "Comida"},
			{sheet: "Enero ", row: 9, dateValue: time.Date(2026, time.January, 6, 0, 0, 0, 0, time.UTC), description: "Sueldo", amount: 200000, txType: "Ingreso", paymentMethod: "Transferencia", category: "Salario"},
		},
	})

	rows, err := parseWorkbook(workbook)
	if err != nil {
		t.Fatalf("parseWorkbook() error = %v", err)
	}

	if len(rows) != 2 {
		t.Fatalf("len(rows) = %d, want 2", len(rows))
	}

	if rows[0].RowID != "enero:8" {
		t.Fatalf("rows[0].RowID = %q, want %q", rows[0].RowID, "enero:8")
	}
	if rows[0].SheetName != "Enero " {
		t.Fatalf("rows[0].SheetName = %q, want %q", rows[0].SheetName, "Enero ")
	}
	if got := rows[0].Date.Format("2006-01-02"); got != "2026-01-05" {
		t.Fatalf("rows[0].Date = %q, want %q", got, "2026-01-05")
	}
	if got := rows[1].Date.Format("2006-01-02"); got != "2026-01-06" {
		t.Fatalf("rows[1].Date = %q, want %q", got, "2026-01-06")
	}
}

func TestParseWorkbookRejectsUnsupportedWorkbookStructure(t *testing.T) {
	t.Run("missing month sheet", func(t *testing.T) {
		workbook := newTemplateWorkbook(t, templateWorkbookOptions{
			skipMonths: map[string]bool{"Febrero": true},
		})

		_, err := parseWorkbook(workbook)
		if err == nil {
			t.Fatal("parseWorkbook() error = nil, want validation error")
		}
	})

	t.Run("changed required header", func(t *testing.T) {
		workbook := newTemplateWorkbook(t, templateWorkbookOptions{
			headerOverrides: map[string]string{"C7": "DESCRIPCION"},
		})

		_, err := parseWorkbook(workbook)
		if err == nil {
			t.Fatal("parseWorkbook() error = nil, want validation error")
		}
	})
}

func TestResolvePaymentMethodAlias(t *testing.T) {
	tests := []struct {
		name    string
		raw     string
		want    *string
		wantErr bool
	}{
		{name: "cash alias", raw: " Efectivo ", want: stringPtr("cash")},
		{name: "wallet alias", raw: "mp", want: stringPtr("digital_wallet")},
		{name: "blank becomes nil", raw: "   ", want: nil},
		{name: "unknown alias fails", raw: "crypto", wantErr: true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := resolvePaymentMethodAlias(tt.raw)
			if tt.wantErr {
				if err == nil {
					t.Fatal("resolvePaymentMethodAlias() error = nil, want error")
				}
				return
			}

			if err != nil {
				t.Fatalf("resolvePaymentMethodAlias() error = %v", err)
			}

			if !equalStringPtr(got, tt.want) {
				t.Fatalf("resolvePaymentMethodAlias() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestClassifyParsedRow(t *testing.T) {
	catalog := categoryCatalog{
		expenseByName: map[string]categoryOption{
			normalizeLookupKey("Comida"): {ID: "expense-cat", Name: "Comida", Type: normalizedTypeExpense},
		},
		incomeByName: map[string]categoryOption{
			normalizeLookupKey("Salario"): {ID: "income-cat", Name: "Salario", Type: normalizedTypeIncome},
		},
	}

	tests := []struct {
		name                 string
		row                  parsedWorkbookRow
		wantClassification   rowClassification
		wantNormalizedType   *normalizedType
		wantReasonCodes      []string
		wantCategoryStatus   categoryMappingStatus
		wantSuggestedCatID   *string
		wantPaymentMethod    *string
	}{
		{
			name: "egreso importable with resolved category",
			row: parsedWorkbookRow{RowID: "enero:8", SheetName: "Enero ", SheetRow: 8, Date: time.Date(2026, 1, 5, 0, 0, 0, 0, time.UTC), Description: "Supermercado", Amount: 1500, RawType: "Egreso", RawPaymentMethod: "Debito", RawCategory: "Comida", DateValid: true, AmountValid: true},
			wantClassification: rowClassificationImportable,
			wantNormalizedType: normalizedTypePtr(normalizedTypeExpense),
			wantCategoryStatus: categoryMappingStatusResolved,
			wantSuggestedCatID: stringPtr("expense-cat"),
			wantPaymentMethod:  stringPtr("debit_card"),
		},
		{
			name: "ingreso importable with required mapping",
			row: parsedWorkbookRow{RowID: "enero:9", SheetName: "Enero ", SheetRow: 9, Date: time.Date(2026, 1, 6, 0, 0, 0, 0, time.UTC), Description: "Freelance", Amount: 90000, RawType: "Ingreso", RawPaymentMethod: "Transferencia", RawCategory: "Freelance", DateValid: true, AmountValid: true},
			wantClassification: rowClassificationImportable,
			wantNormalizedType: normalizedTypePtr(normalizedTypeIncome),
			wantCategoryStatus: categoryMappingStatusRequired,
			wantPaymentMethod:  stringPtr("bank_transfer"),
		},
		{
			name: "ahorro excluded",
			row: parsedWorkbookRow{RowID: "enero:10", SheetName: "Enero ", SheetRow: 10, Date: time.Date(2026, 1, 7, 0, 0, 0, 0, time.UTC), Description: "Meta", Amount: 2000, RawType: "Ahorro", RawPaymentMethod: "Efectivo", RawCategory: "Ahorro", DateValid: true, AmountValid: true},
			wantClassification: rowClassificationExcluded,
			wantReasonCodes:    []string{"unsupported_type_ahorro"},
			wantCategoryStatus: categoryMappingStatusNotApplicable,
		},
		{
			name: "invalid amount and unknown payment method",
			row: parsedWorkbookRow{RowID: "enero:11", SheetName: "Enero ", SheetRow: 11, Date: time.Date(2026, 1, 8, 0, 0, 0, 0, time.UTC), Description: "Compra", Amount: 0, RawType: "Egreso", RawPaymentMethod: "Crypto", RawCategory: "Comida", DateValid: true, AmountValid: false},
			wantClassification: rowClassificationInvalid,
			wantNormalizedType: normalizedTypePtr(normalizedTypeExpense),
			wantReasonCodes:    []string{"invalid_amount", "unsupported_payment_method"},
			wantCategoryStatus: categoryMappingStatusResolved,
			wantSuggestedCatID: stringPtr("expense-cat"),
		},
		{
			name: "missing description invalid even when other fields are valid",
			row: parsedWorkbookRow{RowID: "enero:12", SheetName: "Enero ", SheetRow: 12, Date: time.Date(2026, 1, 9, 0, 0, 0, 0, time.UTC), Description: "", Amount: 3200, RawType: "Egreso", RawPaymentMethod: "", RawCategory: "Comida", DateValid: true, AmountValid: true},
			wantClassification: rowClassificationInvalid,
			wantNormalizedType: normalizedTypePtr(normalizedTypeExpense),
			wantReasonCodes:    []string{"missing_description"},
			wantCategoryStatus: categoryMappingStatusResolved,
			wantSuggestedCatID: stringPtr("expense-cat"),
			wantPaymentMethod:  nil,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := classifyParsedRow(tt.row, catalog)

			if got.Classification != tt.wantClassification {
				t.Fatalf("Classification = %q, want %q", got.Classification, tt.wantClassification)
			}
			if !equalNormalizedTypePtr(got.NormalizedType, tt.wantNormalizedType) {
				t.Fatalf("NormalizedType = %v, want %v", got.NormalizedType, tt.wantNormalizedType)
			}
			if got.CategoryMappingStatus != tt.wantCategoryStatus {
				t.Fatalf("CategoryMappingStatus = %q, want %q", got.CategoryMappingStatus, tt.wantCategoryStatus)
			}
			if !equalStringPtr(got.SuggestedCategoryID, tt.wantSuggestedCatID) {
				t.Fatalf("SuggestedCategoryID = %v, want %v", got.SuggestedCategoryID, tt.wantSuggestedCatID)
			}
			if !equalStringPtr(got.PaymentMethod, tt.wantPaymentMethod) {
				t.Fatalf("PaymentMethod = %v, want %v", got.PaymentMethod, tt.wantPaymentMethod)
			}
			if !equalStringSlice(got.ReasonCodes, tt.wantReasonCodes) {
				t.Fatalf("ReasonCodes = %v, want %v", got.ReasonCodes, tt.wantReasonCodes)
			}
		})
	}
}

type templateWorkbookOptions struct {
	januarySheetName string
	skipMonths       map[string]bool
	headerOverrides  map[string]string
	rows             []templateRow
}

type templateRow struct {
	sheet         string
	row           int
	dateValue     any
	description   string
	amount        float64
	txType        string
	paymentMethod string
	category      string
}

func newTemplateWorkbook(t *testing.T, opts templateWorkbookOptions) []byte {
	t.Helper()

	file := excelize.NewFile()
	defaultSheet := file.GetSheetName(0)
	monthNames := []string{"Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"}
	if opts.skipMonths == nil {
		opts.skipMonths = map[string]bool{}
	}

	for index, month := range monthNames {
		if opts.skipMonths[month] {
			continue
		}

		sheetName := month
		if month == "Enero" && opts.januarySheetName != "" {
			sheetName = opts.januarySheetName
		}

		if index == 0 {
			file.SetSheetName(defaultSheet, sheetName)
		} else {
			file.NewSheet(sheetName)
		}

		setWorkbookHeaders(t, file, sheetName, month, opts.headerOverrides)
	}

	for _, row := range opts.rows {
		file.SetCellValue(row.sheet, cellAddress(t, "B", row.row), row.dateValue)
		file.SetCellValue(row.sheet, cellAddress(t, "C", row.row), row.description)
		file.SetCellValue(row.sheet, cellAddress(t, "D", row.row), row.amount)
		file.SetCellValue(row.sheet, cellAddress(t, "E", row.row), row.txType)
		file.SetCellValue(row.sheet, cellAddress(t, "F", row.row), row.paymentMethod)
		file.SetCellValue(row.sheet, cellAddress(t, "G", row.row), row.category)
	}

	var buffer bytes.Buffer
	if err := file.Write(&buffer); err != nil {
		t.Fatalf("file.Write() error = %v", err)
	}

	return buffer.Bytes()
}

func setWorkbookHeaders(t *testing.T, file *excelize.File, sheetName, month string, headerOverrides map[string]string) {
	t.Helper()

	file.SetCellValue(sheetName, "C3", month)
	file.SetCellValue(sheetName, "C4", 2026)

	headers := map[string]string{
		"B7": "FECHA",
		"C7": "CONCEPTO",
		"D7": "IMPORTE",
		"E7": "TIPO",
		"F7": "MEDIO",
		"G7": "CATEGORIA",
	}
	for cell, override := range headerOverrides {
		headers[cell] = override
	}
	for cell, value := range headers {
		file.SetCellValue(sheetName, cell, value)
	}
}

func cellAddress(t *testing.T, column string, row int) string {
	t.Helper()

	address, err := excelize.JoinCellName(column, row)
	if err != nil {
		t.Fatalf("JoinCellName() error = %v", err)
	}
	return address
}

func stringPtr(value string) *string {
	return &value
}

func normalizedTypePtr(value normalizedType) *normalizedType {
	return &value
}

func equalStringPtr(left, right *string) bool {
	if left == nil || right == nil {
		return left == right
	}
	return *left == *right
}

func equalNormalizedTypePtr(left, right *normalizedType) bool {
	if left == nil || right == nil {
		return left == right
	}
	return *left == *right
}

func equalStringSlice(left, right []string) bool {
	if len(left) != len(right) {
		return false
	}
	for index := range left {
		if left[index] != right[index] {
			return false
		}
	}
	return true
}
