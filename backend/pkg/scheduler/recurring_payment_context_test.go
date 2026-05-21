package scheduler

import "testing"

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
