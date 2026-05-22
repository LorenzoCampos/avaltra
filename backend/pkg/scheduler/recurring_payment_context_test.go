package scheduler

import (
	"context"
	"strings"
	"testing"
	"time"

	"github.com/jackc/pgx/v5"
)

func TestGeneratedRecurringExpensePaymentContextKeepsPlaceAndClearsLegacyInstrument(t *testing.T) {
	containerID := "wallet-1"
	instrumentID := "visa-1"
	template := RecurringExpenseTemplate{SourceContainerID: &containerID, SourceInstrumentID: &instrumentID}

	if got := generatedExpenseContainerIDForTemplate(template); got == nil || *got != containerID {
		t.Fatalf("generatedExpenseContainerIDForTemplate() = %v, want %q", got, containerID)
	}
	if got := generatedExpenseInstrumentIDForTemplate(template); got != nil {
		t.Fatalf("generatedExpenseInstrumentIDForTemplate() = %v, want nil", got)
	}
}

func TestGeneratedRecurringIncomePaymentContextKeepsPlaceAndClearsLegacyInstrument(t *testing.T) {
	containerID := "bank-1"
	instrumentID := "debit-1"
	template := RecurringIncomeTemplate{DestinationContainerID: &containerID, DestinationInstrumentID: &instrumentID}

	if got := generatedIncomeContainerIDForTemplate(template); got == nil || *got != containerID {
		t.Fatalf("generatedIncomeContainerIDForTemplate() = %v, want %q", got, containerID)
	}
	if got := generatedIncomeInstrumentIDForTemplate(template); got != nil {
		t.Fatalf("generatedIncomeInstrumentIDForTemplate() = %v, want nil", got)
	}
}

func TestRecurringExpenseGeneratedRowsKeepOriginalPlaceAfterTemplateEdit(t *testing.T) {
	ctx := context.Background()
	db := newRecurringPaymentContextDB(t)
	expenseDateA := time.Date(2026, 5, 1, 0, 0, 0, 0, time.UTC)
	expenseDateB := time.Date(2026, 5, 2, 0, 0, 0, 0, time.UTC)
	containerA := "wallet-1"
	containerB := "bank-2"
	template := RecurringExpenseTemplate{
		ID:                  "recurring-expense-1",
		AccountID:           "account-1",
		Description:         "Rent",
		Amount:              1000,
		Currency:            "ARS",
		SourceContainerID:   &containerA,
		SourceInstrumentID:  stringPtr("legacy-card"),
		RecurrenceFrequency: "daily",
		RecurrenceInterval:  1,
		StartDate:           expenseDateA,
	}

	if err := generateExpenseFromTemplate(db, ctx, template, expenseDateA); err != nil {
		t.Fatalf("generate first expense: %v", err)
	}
	template.SourceContainerID = &containerB
	if err := generateExpenseFromTemplate(db, ctx, template, expenseDateB); err != nil {
		t.Fatalf("generate second expense after template edit: %v", err)
	}

	if len(db.expenses) != 2 {
		t.Fatalf("generated expenses = %d, want 2", len(db.expenses))
	}
	if got := pointerValue(db.expenses[0].containerID); got != containerA {
		t.Fatalf("first generated expense container = %q, want original %q", got, containerA)
	}
	if got := pointerValue(db.expenses[1].containerID); got != containerB {
		t.Fatalf("second generated expense container = %q, want edited %q", got, containerB)
	}
	if db.expenses[0].instrumentID != nil || db.expenses[1].instrumentID != nil {
		t.Fatalf("generated expenses should clear legacy instruments, got first=%v second=%v", db.expenses[0].instrumentID, db.expenses[1].instrumentID)
	}
}

func TestRecurringIncomeGeneratedRowsKeepOriginalPlaceAfterTemplateEdit(t *testing.T) {
	ctx := context.Background()
	db := newRecurringPaymentContextDB(t)
	incomeDateA := time.Date(2026, 5, 1, 0, 0, 0, 0, time.UTC)
	incomeDateB := time.Date(2026, 5, 2, 0, 0, 0, 0, time.UTC)
	containerA := "bank-1"
	containerB := "wallet-2"
	template := RecurringIncomeTemplate{
		ID:                      "recurring-income-1",
		AccountID:               "account-1",
		Description:             "Salary",
		Amount:                  2500,
		Currency:                "ARS",
		DestinationContainerID:  &containerA,
		DestinationInstrumentID: stringPtr("legacy-debit"),
		RecurrenceFrequency:     "daily",
		RecurrenceInterval:      1,
		StartDate:               incomeDateA,
	}

	if err := generateActualIncomeFromTemplate(db, ctx, template, incomeDateA); err != nil {
		t.Fatalf("generate first income: %v", err)
	}
	template.DestinationContainerID = &containerB
	if err := generateActualIncomeFromTemplate(db, ctx, template, incomeDateB); err != nil {
		t.Fatalf("generate second income after template edit: %v", err)
	}

	if len(db.incomes) != 2 {
		t.Fatalf("generated incomes = %d, want 2", len(db.incomes))
	}
	if got := pointerValue(db.incomes[0].containerID); got != containerA {
		t.Fatalf("first generated income container = %q, want original %q", got, containerA)
	}
	if got := pointerValue(db.incomes[1].containerID); got != containerB {
		t.Fatalf("second generated income container = %q, want edited %q", got, containerB)
	}
	if db.incomes[0].instrumentID != nil || db.incomes[1].instrumentID != nil {
		t.Fatalf("generated incomes should clear legacy instruments, got first=%v second=%v", db.incomes[0].instrumentID, db.incomes[1].instrumentID)
	}
}

type recurringPaymentContextDB struct {
	t        *testing.T
	expenses []generatedPaymentContextRow
	incomes  []generatedPaymentContextRow
}

type generatedPaymentContextRow struct {
	containerID  *string
	instrumentID *string
}

func newRecurringPaymentContextDB(t *testing.T) *recurringPaymentContextDB {
	t.Helper()
	return &recurringPaymentContextDB{t: t}
}

func (db *recurringPaymentContextDB) QueryRow(_ context.Context, query string, args ...interface{}) pgx.Row {
	db.t.Helper()

	switch {
	case strings.Contains(query, "INSERT INTO expenses"):
		return db.insertExpense(args)
	case strings.Contains(query, "INSERT INTO incomes"):
		return db.insertIncome(args)
	default:
		return errRow{err: errUnexpectedQuery}
	}
}

func (db *recurringPaymentContextDB) insertExpense(args []interface{}) pgx.Row {
	db.t.Helper()
	if len(args) != 13 {
		db.t.Fatalf("expense insert args = %d, want 13", len(args))
	}
	db.expenses = append(db.expenses, generatedPaymentContextRow{
		containerID:  cloneStringPointerArg(db.t, args[11]),
		instrumentID: cloneStringPointerArg(db.t, args[12]),
	})
	return idRow{id: "expense-generated"}
}

func (db *recurringPaymentContextDB) insertIncome(args []interface{}) pgx.Row {
	db.t.Helper()
	if len(args) != 13 {
		db.t.Fatalf("income insert args = %d, want 13", len(args))
	}
	db.incomes = append(db.incomes, generatedPaymentContextRow{
		containerID:  cloneStringPointerArg(db.t, args[11]),
		instrumentID: cloneStringPointerArg(db.t, args[12]),
	})
	return idRow{id: "income-generated"}
}

type idRow struct{ id string }

func (r idRow) Scan(dest ...interface{}) error {
	if len(dest) != 1 {
		return errUnexpectedScanDestination
	}
	value, ok := dest[0].(*string)
	if !ok {
		return errUnexpectedScanDestination
	}
	*value = r.id
	return nil
}

type errRow struct{ err error }

func (r errRow) Scan(...interface{}) error { return r.err }

type recurringPaymentContextTestError string

func (e recurringPaymentContextTestError) Error() string { return string(e) }

const (
	errUnexpectedQuery           recurringPaymentContextTestError = "unexpected query"
	errUnexpectedScanDestination recurringPaymentContextTestError = "unexpected scan destination"
)

func cloneStringPointerArg(t *testing.T, value interface{}) *string {
	t.Helper()
	if value == nil {
		return nil
	}
	pointer, ok := value.(*string)
	if !ok {
		t.Fatalf("payment context arg type = %T, want *string", value)
	}
	if pointer == nil {
		return nil
	}
	clone := *pointer
	return &clone
}

func stringPtr(value string) *string { return &value }

func pointerValue(value *string) string {
	if value == nil {
		return ""
	}
	return *value
}
