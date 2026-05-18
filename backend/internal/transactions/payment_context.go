package transactions

import (
	"errors"
	"fmt"

	"github.com/google/uuid"
)

var (
	ErrSplitPaymentNotSupported = errors.New("split-payment-not-supported")
	ErrBackingContainerRequired = errors.New("backing-container-required")
)

var paymentContainerKindCatalog = map[string]struct{}{
	"bank":   {},
	"wallet": {},
	"cash":   {},
	"other":  {},
}

var paymentInstrumentKindCatalog = map[string]struct{}{
	"debit_card":  {},
	"credit_card": {},
	"transfer":    {},
	"cash":        {},
	"other":       {},
}

type PaymentAssociationInput struct {
	ContainerID   *uuid.UUID
	InstrumentID  *uuid.UUID
	ContainerIDs  []uuid.UUID
	InstrumentIDs []uuid.UUID
}

func IsValidPaymentContainerKind(value string) bool {
	_, ok := paymentContainerKindCatalog[value]
	return ok
}

func IsValidPaymentInstrumentKind(value string) bool {
	_, ok := paymentInstrumentKindCatalog[value]
	return ok
}

func ValidatePaymentContainerKind(value string) error {
	if !IsValidPaymentContainerKind(value) {
		return fmt.Errorf("payment container kind must be one of bank, wallet, cash, other")
	}
	return nil
}

func ValidatePaymentInstrumentBackingContainer(kind string, backingContainerID *uuid.UUID) error {
	if !IsValidPaymentInstrumentKind(kind) {
		return fmt.Errorf("payment instrument kind must be one of debit_card, credit_card, transfer, cash, other")
	}
	if (kind == "credit_card" || kind == "debit_card") && backingContainerID == nil {
		return ErrBackingContainerRequired
	}
	return nil
}

func RejectSplitPaymentPayload(input PaymentAssociationInput) error {
	if len(input.ContainerIDs) > 1 || len(input.InstrumentIDs) > 1 {
		return ErrSplitPaymentNotSupported
	}
	return nil
}
