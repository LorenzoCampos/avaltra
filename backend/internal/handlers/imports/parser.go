package imports

import (
	"bytes"
	"fmt"
	"strconv"
	"strings"
	"time"

	"github.com/xuri/excelize/v2"
)

var supportedMonths = []string{"enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"}

var monthNumberByName = map[string]time.Month{
	"enero":      time.January,
	"febrero":    time.February,
	"marzo":      time.March,
	"abril":      time.April,
	"mayo":       time.May,
	"junio":      time.June,
	"julio":      time.July,
	"agosto":     time.August,
	"septiembre": time.September,
	"octubre":    time.October,
	"noviembre":  time.November,
	"diciembre":  time.December,
}

var requiredHeaders = map[string]string{
	"B7": "FECHA",
	"C7": "CONCEPTO",
	"D7": "IMPORTE",
	"E7": "TIPO",
	"F7": "MEDIO",
	"G7": "CATEGORIA",
}

func parseWorkbook(workbook []byte) ([]parsedWorkbookRow, error) {
	file, err := excelize.OpenReader(bytes.NewReader(workbook))
	if err != nil {
		return nil, fmt.Errorf("invalid workbook: %w", err)
	}
	defer file.Close()

	sheetsByMonth := make(map[string]string, len(supportedMonths))
	for _, sheetName := range file.GetSheetList() {
		normalized := normalizeMonthName(sheetName)
		if _, ok := monthNumberByName[normalized]; ok {
			sheetsByMonth[normalized] = sheetName
		}
	}

	for _, month := range supportedMonths {
		sheetName, ok := sheetsByMonth[month]
		if !ok {
			return nil, fmt.Errorf("missing required month sheet %q", month)
		}
		if err := validateSheetContract(file, sheetName, month); err != nil {
			return nil, err
		}
	}

	rows := make([]parsedWorkbookRow, 0)
	for _, month := range supportedMonths {
		sheetName := sheetsByMonth[month]
		sheetRows, err := parseSheetRows(file, sheetName, month)
		if err != nil {
			return nil, err
		}
		rows = append(rows, sheetRows...)
	}

	return rows, nil
}

func validateSheetContract(file *excelize.File, sheetName, expectedMonth string) error {
	monthLabel, err := file.GetCellValue(sheetName, "C3")
	if err != nil {
		return fmt.Errorf("read month label %s!C3: %w", sheetName, err)
	}
	if normalizeMonthName(monthLabel) != expectedMonth {
		return fmt.Errorf("sheet %q has unexpected month label %q", sheetName, monthLabel)
	}

	yearValue, err := file.GetCellValue(sheetName, "C4")
	if err != nil {
		return fmt.Errorf("read year %s!C4: %w", sheetName, err)
	}
	if strings.TrimSpace(yearValue) != "2026" {
		return fmt.Errorf("sheet %q has unsupported year %q", sheetName, yearValue)
	}

	for cell, expected := range requiredHeaders {
		value, err := file.GetCellValue(sheetName, cell)
		if err != nil {
			return fmt.Errorf("read header %s!%s: %w", sheetName, cell, err)
		}
		if strings.TrimSpace(value) != expected {
			return fmt.Errorf("sheet %q has invalid header %s", sheetName, cell)
		}
	}

	return nil
}

func parseSheetRows(file *excelize.File, sheetName, normalizedMonth string) ([]parsedWorkbookRow, error) {
	rows := make([]parsedWorkbookRow, 0, 102)
	for rowNumber := 8; rowNumber <= 109; rowNumber++ {
		parsedRow, err := parseSheetRow(file, sheetName, normalizedMonth, rowNumber)
		if err != nil {
			return nil, err
		}
		if parsedRow.Blank {
			continue
		}
		rows = append(rows, parsedRow)
	}
	return rows, nil
}

func parseSheetRow(file *excelize.File, sheetName, normalizedMonth string, rowNumber int) (parsedWorkbookRow, error) {
	dateValue, err := file.GetCellValue(sheetName, fmt.Sprintf("B%d", rowNumber))
	if err != nil {
		return parsedWorkbookRow{}, err
	}
	description, err := file.GetCellValue(sheetName, fmt.Sprintf("C%d", rowNumber))
	if err != nil {
		return parsedWorkbookRow{}, err
	}
	amountValue, err := file.GetCellValue(sheetName, fmt.Sprintf("D%d", rowNumber))
	if err != nil {
		return parsedWorkbookRow{}, err
	}
	rawType, err := file.GetCellValue(sheetName, fmt.Sprintf("E%d", rowNumber))
	if err != nil {
		return parsedWorkbookRow{}, err
	}
	rawPaymentMethod, err := file.GetCellValue(sheetName, fmt.Sprintf("F%d", rowNumber))
	if err != nil {
		return parsedWorkbookRow{}, err
	}
	rawCategory, err := file.GetCellValue(sheetName, fmt.Sprintf("G%d", rowNumber))
	if err != nil {
		return parsedWorkbookRow{}, err
	}

	if isBlankImportRow(dateValue, description, amountValue, rawType, rawPaymentMethod, rawCategory) {
		return parsedWorkbookRow{Blank: true}, nil
	}

	parsedDate, dateValid := parseWorkbookDate(file, sheetName, rowNumber, normalizedMonth)
	amount, amountValid := parseWorkbookAmount(strings.TrimSpace(amountValue))

	return parsedWorkbookRow{
		RowID:            fmt.Sprintf("%s:%d", normalizedMonth, rowNumber),
		SheetName:        sheetName,
		NormalizedSheet:  normalizedMonth,
		SheetRow:         rowNumber,
		Date:             parsedDate,
		Description:      strings.TrimSpace(description),
		Amount:           amount,
		RawType:          strings.TrimSpace(rawType),
		RawPaymentMethod: strings.TrimSpace(rawPaymentMethod),
		RawCategory:      strings.TrimSpace(rawCategory),
		DateValid:        dateValid,
		AmountValid:      amountValid && amount > 0,
	}, nil
}

func parseWorkbookDate(file *excelize.File, sheetName string, rowNumber int, normalizedMonth string) (time.Time, bool) {
	cell := fmt.Sprintf("B%d", rowNumber)
	raw, err := file.GetCellValue(sheetName, cell)
	if err != nil {
		return time.Time{}, false
	}
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return time.Time{}, false
	}

	rawCellValue, err := file.GetCellValue(sheetName, cell, excelize.Options{RawCellValue: true})
	if err == nil {
		rawCellValue = strings.TrimSpace(rawCellValue)
		if numericValue, parseErr := strconv.ParseFloat(rawCellValue, 64); parseErr == nil && numericValue > 31 {
			parsed, excelErr := excelize.ExcelDateToTime(numericValue, false)
			if excelErr == nil {
				return parsed.UTC(), true
			}
		}
	}

	layouts := []string{"2006-01-02 15:04:05", time.RFC3339, "2006-01-02", "01-02-06", "01/02/2006", "1/2/2006"}
	for _, layout := range layouts {
		if parsed, err := time.Parse(layout, raw); err == nil {
			return parsed.UTC(), true
		}
	}

	if numericValue, err := strconv.ParseFloat(raw, 64); err == nil {
		if numericValue > 31 {
			parsed, err := excelize.ExcelDateToTime(numericValue, false)
			if err == nil {
				return parsed.UTC(), true
			}
		}
	}

	day, err := strconv.Atoi(raw)
	if err != nil || day <= 0 || day > 31 {
		return time.Time{}, false
	}
	date := time.Date(2026, monthNumberByName[normalizedMonth], day, 0, 0, 0, 0, time.UTC)
	if date.Month() != monthNumberByName[normalizedMonth] {
		return time.Time{}, false
	}
	return date, true
}

func parseWorkbookAmount(raw string) (float64, bool) {
	if raw == "" {
		return 0, false
	}
	parsed, err := strconv.ParseFloat(strings.ReplaceAll(raw, ",", "."), 64)
	if err != nil {
		return 0, false
	}
	return parsed, true
}

func isBlankImportRow(values ...string) bool {
	for _, value := range values {
		if strings.TrimSpace(value) != "" {
			return false
		}
	}
	return true
}

func normalizeMonthName(value string) string {
	return normalizeLookupKey(value)
}
