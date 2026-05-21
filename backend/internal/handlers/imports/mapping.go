package imports

import (
	"context"
	"fmt"
	"strings"

	"github.com/jackc/pgx/v5"
)

var paymentMethodAliases = map[string]string{
	"efectivo":      "cash",
	"transferencia": "bank_transfer",
	"debito":        "debit_card",
	"credito":       "credit_card",
	"mercado pago":  "digital_wallet",
	"mp":            "digital_wallet",
}

type queryStore interface {
	Query(ctx context.Context, sql string, args ...any) (pgx.Rows, error)
	QueryRow(ctx context.Context, sql string, args ...any) pgx.Row
}

func resolvePaymentMethodAlias(raw string) (*string, error) {
	normalized := normalizeLookupKey(raw)
	if normalized == "" {
		return nil, nil
	}
	value, ok := paymentMethodAliases[normalized]
	if !ok {
		return nil, fmt.Errorf("unsupported payment method")
	}
	return &value, nil
}

func classifyParsedRow(row parsedWorkbookRow, catalog categoryCatalog) PreviewRow {
	response := PreviewRow{
		RowID:                 row.RowID,
		Sheet:                 row.SheetName,
		SheetRow:              row.SheetRow,
		Description:           row.Description,
		CategoryMappingStatus: categoryMappingStatusNotApplicable,
		ReasonCodes:           make([]string, 0),
	}

	if row.DateValid {
		formatted := row.Date.Format("2006-01-02")
		response.Date = &formatted
	}
	if !row.Blank {
		amount := row.Amount
		response.Amount = &amount
	}
	if trimmed := strings.TrimSpace(row.RawCategory); trimmed != "" {
		response.RawCategory = &trimmed
	}
	if trimmed := strings.TrimSpace(row.RawPaymentMethod); trimmed != "" {
		response.RawPaymentMethod = &trimmed
	}

	normalizedTypeValue, typeReason := resolveNormalizedType(row.RawType)
	if normalizedTypeValue != nil {
		response.NormalizedType = normalizedTypeValue
	}
	if typeReason == "unsupported_type_ahorro" {
		response.Classification = rowClassificationExcluded
		response.ReasonCodes = append(response.ReasonCodes, typeReason)
		return response
	}
	if typeReason != "" {
		response.ReasonCodes = append(response.ReasonCodes, typeReason)
	}

	if !row.DateValid {
		response.ReasonCodes = append(response.ReasonCodes, "invalid_date")
	}
	if strings.TrimSpace(row.Description) == "" {
		response.ReasonCodes = append(response.ReasonCodes, "missing_description")
	}
	if !row.AmountValid {
		response.ReasonCodes = append(response.ReasonCodes, "invalid_amount")
	}

	paymentMethod, err := resolvePaymentMethodAlias(row.RawPaymentMethod)
	if err != nil {
		response.ReasonCodes = append(response.ReasonCodes, "unsupported_payment_method")
	} else {
		response.PaymentMethod = paymentMethod
	}
	if normalizedTypeValue != nil {
		containerID, instrumentID := resolveImportPaymentContext(row.RawPaymentMethod, catalog.paymentContexts)
		switch *normalizedTypeValue {
		case normalizedTypeExpense:
			response.SourceContainerID = containerID
			response.SourceInstrumentID = instrumentID
		case normalizedTypeIncome:
			response.DestinationContainerID = containerID
			response.DestinationInstrumentID = instrumentID
		}
	}

	option, status, mappingKey := resolveCategory(row.RawCategory, normalizedTypeValue, catalog)
	response.CategoryMappingStatus = status
	if mappingKey != "" {
		response.MappingKey = &mappingKey
	}
	if option != nil {
		response.SuggestedCategoryID = &option.ID
		response.SuggestedCategoryName = &option.Name
	}

	if len(response.ReasonCodes) > 0 {
		response.Classification = rowClassificationInvalid
		return response
	}
	response.Classification = rowClassificationImportable
	return response
}

func resolveNormalizedType(raw string) (*normalizedType, string) {
	switch normalizeLookupKey(raw) {
	case "egreso":
		value := normalizedTypeExpense
		return &value, ""
	case "ingreso":
		value := normalizedTypeIncome
		return &value, ""
	case "ahorro":
		return nil, "unsupported_type_ahorro"
	default:
		return nil, "unsupported_type"
	}
}

func resolveCategory(raw string, normalizedTypeValue *normalizedType, catalog categoryCatalog) (*categoryOption, categoryMappingStatus, string) {
	if normalizedTypeValue == nil {
		return nil, categoryMappingStatusNotApplicable, ""
	}
	trimmed := strings.TrimSpace(raw)
	if trimmed == "" {
		return nil, categoryMappingStatusNotApplicable, ""
	}
	lookupKey := normalizeLookupKey(trimmed)
	mappingKey := buildCategoryMappingKey(*normalizedTypeValue, trimmed)

	var option categoryOption
	var ok bool
	switch *normalizedTypeValue {
	case normalizedTypeExpense:
		option, ok = catalog.expenseByName[lookupKey]
	case normalizedTypeIncome:
		option, ok = catalog.incomeByName[lookupKey]
	}
	if !ok {
		return nil, categoryMappingStatusRequired, mappingKey
	}
	return &option, categoryMappingStatusResolved, mappingKey
}

func loadCategoryCatalog(ctx context.Context, db queryStore, accountID string) (categoryCatalog, error) {
	catalog := categoryCatalog{
		expenseByName: make(map[string]categoryOption),
		incomeByName:  make(map[string]categoryOption),
		visibleByID:   make(map[string]categoryOption),
	}

	if err := loadCategoryType(ctx, db, accountID, "expense_categories", normalizedTypeExpense, catalog.expenseByName, catalog.visibleByID); err != nil {
		return categoryCatalog{}, err
	}
	if err := loadCategoryType(ctx, db, accountID, "income_categories", normalizedTypeIncome, catalog.incomeByName, catalog.visibleByID); err != nil {
		return categoryCatalog{}, err
	}
	paymentContexts, err := loadPaymentContextCatalog(ctx, db, accountID)
	if err != nil {
		return categoryCatalog{}, err
	}
	catalog.paymentContexts = paymentContexts
	return catalog, nil
}

func loadCategoryType(ctx context.Context, db queryStore, accountID, table string, normalizedTypeValue normalizedType, byName map[string]categoryOption, byID map[string]categoryOption) error {
	query := fmt.Sprintf(`SELECT id, name FROM %s WHERE account_id IS NULL OR account_id = $1`, table)
	rows, err := db.Query(ctx, query, accountID)
	if err != nil {
		return err
	}
	defer rows.Close()

	for rows.Next() {
		var option categoryOption
		option.Type = normalizedTypeValue
		if err := rows.Scan(&option.ID, &option.Name); err != nil {
			return err
		}
		byName[normalizeLookupKey(option.Name)] = option
		byID[option.ID] = option
	}
	return rows.Err()
}

func buildCategoryMappingKey(normalizedTypeValue normalizedType, rawCategory string) string {
	return string(normalizedTypeValue) + ":" + strings.TrimSpace(rawCategory)
}

func loadPaymentContextCatalog(ctx context.Context, db queryStore, accountID string) (paymentContextCatalog, error) {
	catalog := paymentContextCatalog{byLookupKey: make(map[string][]paymentContextRef)}

	containerRows, err := db.Query(ctx, `
		SELECT id, name
		FROM payment_containers
		WHERE account_id = $1 AND is_active = true
	`, accountID)
	if err != nil {
		return paymentContextCatalog{}, err
	}
	defer containerRows.Close()

	for containerRows.Next() {
		var id, name string
		if err := containerRows.Scan(&id, &name); err != nil {
			return paymentContextCatalog{}, err
		}
		containerID := id
		catalog.add(name, paymentContextRef{ContainerID: &containerID})
	}
	if err := containerRows.Err(); err != nil {
		return paymentContextCatalog{}, err
	}

	return catalog, nil
}

func (catalog paymentContextCatalog) add(raw string, ref paymentContextRef) {
	key := normalizeLookupKey(raw)
	if key == "" {
		return
	}
	catalog.byLookupKey[key] = append(catalog.byLookupKey[key], ref)
}

func resolveImportPaymentContext(raw string, catalog paymentContextCatalog) (*string, *string) {
	key := normalizeLookupKey(raw)
	if key == "" || catalog.byLookupKey == nil {
		return nil, nil
	}
	matches := catalog.byLookupKey[key]
	if len(matches) != 1 {
		return nil, nil
	}
	if matches[0].InstrumentID != nil {
		return nil, nil
	}
	return matches[0].ContainerID, matches[0].InstrumentID
}

func categoryMappingLookupKeys(normalizedTypeValue normalizedType, rawCategory string) []string {
	trimmed := strings.TrimSpace(rawCategory)
	if trimmed == "" {
		return nil
	}

	typedKey := buildCategoryMappingKey(normalizedTypeValue, trimmed)
	legacyKey := string(normalizedTypeValue) + "::" + normalizeLookupKey(trimmed)
	if typedKey == legacyKey {
		return []string{typedKey}
	}
	return []string{typedKey, legacyKey}
}

func normalizeLookupKey(value string) string {
	replacer := strings.NewReplacer("á", "a", "é", "e", "í", "i", "ó", "o", "ú", "u", "ü", "u")
	return strings.ToLower(strings.TrimSpace(replacer.Replace(value)))
}
