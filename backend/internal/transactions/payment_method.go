package transactions

import (
	"encoding/json"
	"fmt"
)

var paymentMethodCatalog = map[string]struct{}{
	"cash":           {},
	"bank_transfer":  {},
	"debit_card":     {},
	"credit_card":    {},
	"digital_wallet": {},
	"other":          {},
}

func IsValidPaymentMethod(value string) bool {
	_, ok := paymentMethodCatalog[value]
	return ok
}

func ValidateOptionalPaymentMethod(value *string) error {
	if value == nil {
		return nil
	}
	if !IsValidPaymentMethod(*value) {
		return fmt.Errorf("payment_method must be one of cash, bank_transfer, debit_card, credit_card, digital_wallet, other")
	}
	return nil
}

func ResolvePaymentMethodUpdate(_ *string, field NullableStringField) (bool, *string, error) {
	if !field.Set {
		return false, nil, nil
	}
	if !field.Valid {
		return true, nil, nil
	}
	if err := ValidateOptionalPaymentMethod(&field.Value); err != nil {
		return false, nil, err
	}
	return true, &field.Value, nil
}

type NullableStringField struct {
	Set   bool
	Valid bool
	Value string
}

func (f *NullableStringField) UnmarshalJSON(data []byte) error {
	f.Set = true
	if string(data) == "null" {
		f.Valid = false
		f.Value = ""
		return nil
	}

	if err := json.Unmarshal(data, &f.Value); err != nil {
		return err
	}

	f.Valid = true
	return nil
}
