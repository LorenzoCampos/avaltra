package dashboard

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	pgxmock "github.com/pashagolub/pgxmock/v5"
)

const dashboardTestAccountID = "11111111-1111-1111-1111-111111111111"

func TestCalculateCurrentAvailableBalance(t *testing.T) {
	tests := []struct {
		name        string
		income      float64
		expenses    float64
		deposits    float64
		withdrawals float64
		want        float64
	}{
		{
			name:        "historical deposits reduce current balance",
			income:      3500,
			expenses:    1500,
			deposits:    700,
			withdrawals: 0,
			want:        1300,
		},
		{
			name:        "historical withdrawals return money to current balance",
			income:      2000,
			expenses:    1100,
			deposits:    500,
			withdrawals: 200,
			want:        600,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := calculateCurrentAvailableBalance(
				tt.income,
				tt.expenses,
				calculateNetSavingsActivity(tt.deposits, tt.withdrawals),
			)

			if got != tt.want {
				t.Fatalf("calculateCurrentAvailableBalance() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestGetSummaryKeepsMonthlyFieldsAndAddsCurrentAvailableBalance(t *testing.T) {
	gin.SetMode(gin.TestMode)

	originalUpcomingRecurringLoader := loadUpcomingRecurringExpenses
	originalNextMonthRecurringExpenseTotalLoader := loadNextMonthRecurringExpenseTotal
	loadUpcomingRecurringExpenses = func(_ dashboardQuerier, _ context.Context, _ interface{}, _ time.Time) (UpcomingRecurringSummary, error) {
		return UpcomingRecurringSummary{}, nil
	}
	loadNextMonthRecurringExpenseTotal = func(_ dashboardQuerier, _ context.Context, _ interface{}, _ time.Time) (float64, error) {
		return 250, nil
	}
	defer func() {
		loadUpcomingRecurringExpenses = originalUpcomingRecurringLoader
		loadNextMonthRecurringExpenseTotal = originalNextMonthRecurringExpenseTotalLoader
	}()

	mock, err := pgxmock.NewPool()
	if err != nil {
		t.Fatalf("pgxmock.NewPool() error = %v", err)
	}
	defer mock.Close()
	expectDashboardSummaryQueries(mock, "2026-04", 1000, 400, 100, 0, 3000, 1200, 700, 100)
	aprilBody := performDashboardSummaryRequest(t, dashboardTestRouter(GetSummary(mock)), "2026-04")
	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("april mock expectations: %v", err)
	}

	mayMock, err := pgxmock.NewPool()
	if err != nil {
		t.Fatalf("pgxmock.NewPool() error = %v", err)
	}
	defer mayMock.Close()
	expectDashboardSummaryQueries(mayMock, "2026-05", 400, 150, 0, 50, 3000, 1200, 700, 100)
	mayBody := performDashboardSummaryRequest(t, dashboardTestRouter(GetSummary(mayMock)), "2026-05")
	if err := mayMock.ExpectationsWereMet(); err != nil {
		t.Fatalf("may mock expectations: %v", err)
	}

	var aprilResponse DashboardSummaryResponse
	if err := json.Unmarshal(aprilBody, &aprilResponse); err != nil {
		t.Fatalf("json.Unmarshal(april) error = %v", err)
	}

	var mayResponse DashboardSummaryResponse
	if err := json.Unmarshal(mayBody, &mayResponse); err != nil {
		t.Fatalf("json.Unmarshal(may) error = %v", err)
	}

	if aprilResponse.CurrentAvailableBalance != 1200 {
		t.Fatalf("april current_available_balance = %v, want 1200", aprilResponse.CurrentAvailableBalance)
	}
	if mayResponse.CurrentAvailableBalance != 1200 {
		t.Fatalf("may current_available_balance = %v, want 1200", mayResponse.CurrentAvailableBalance)
	}

	if aprilResponse.AvailableBalance != 500 {
		t.Fatalf("april available_balance = %v, want 500", aprilResponse.AvailableBalance)
	}
	if mayResponse.AvailableBalance != 300 {
		t.Fatalf("may available_balance = %v, want 300", mayResponse.AvailableBalance)
	}

	if aprilResponse.TotalIncome != 1000 || mayResponse.TotalIncome != 400 {
		t.Fatalf("monthly incomes = (%v, %v), want (1000, 400)", aprilResponse.TotalIncome, mayResponse.TotalIncome)
	}
	if aprilResponse.TotalExpenses != 400 || mayResponse.TotalExpenses != 150 {
		t.Fatalf("monthly expenses = (%v, %v), want (400, 150)", aprilResponse.TotalExpenses, mayResponse.TotalExpenses)
	}
	if aprilResponse.NextMonthRecurringExpenseTotal != 250 || mayResponse.NextMonthRecurringExpenseTotal != 250 {
		t.Fatalf("next month recurring totals = (%v, %v), want (250, 250)", aprilResponse.NextMonthRecurringExpenseTotal, mayResponse.NextMonthRecurringExpenseTotal)
	}

	assertBalanceFieldsPresent(t, aprilBody)
	assertBalanceFieldsPresent(t, mayBody)
	assertNextMonthRecurringExpenseTotalPresent(t, aprilBody)
	assertNextMonthRecurringExpenseTotalPresent(t, mayBody)

}

func TestGetSummaryAppliesTransferDeltasOnlyToMoneyByContainer(t *testing.T) {
	gin.SetMode(gin.TestMode)

	originalUpcomingRecurringLoader := loadUpcomingRecurringExpenses
	originalNextMonthRecurringExpenseTotalLoader := loadNextMonthRecurringExpenseTotal
	loadUpcomingRecurringExpenses = func(_ dashboardQuerier, _ context.Context, _ interface{}, _ time.Time) (UpcomingRecurringSummary, error) {
		return UpcomingRecurringSummary{}, nil
	}
	loadNextMonthRecurringExpenseTotal = func(_ dashboardQuerier, _ context.Context, _ interface{}, _ time.Time) (float64, error) {
		return 0, nil
	}
	defer func() {
		loadUpcomingRecurringExpenses = originalUpcomingRecurringLoader
		loadNextMonthRecurringExpenseTotal = originalNextMonthRecurringExpenseTotalLoader
	}()

	mock, err := pgxmock.NewPool()
	if err != nil {
		t.Fatalf("pgxmock.NewPool() error = %v", err)
	}
	defer mock.Close()

	expectDashboardSummaryQueriesWithMoneyByContainerRows(
		mock,
		"2026-05",
		1000,
		400,
		0,
		0,
		1000,
		400,
		0,
		0,
		mock.NewRows([]string{"container_id", "container_name", "container_type", "total"}).
			AddRow(stringPtr("source-place"), stringPtr("Source place"), stringPtr("cash"), 500.0).
			AddRow(stringPtr("destination-place"), stringPtr("Destination place"), stringPtr("bank"), 300.0),
	)

	body := performDashboardSummaryRequest(t, dashboardTestRouter(GetSummary(mock)), "2026-05")
	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("mock expectations: %v", err)
	}

	var response DashboardSummaryResponse
	if err := json.Unmarshal(body, &response); err != nil {
		t.Fatalf("json.Unmarshal() error = %v", err)
	}

	if response.TotalIncome != 1000 || response.TotalExpenses != 400 || response.AvailableBalance != 600 || response.CurrentAvailableBalance != 600 {
		t.Fatalf("totals = income %v expenses %v available %v current %v, want transfer-neutral 1000/400/600/600",
			response.TotalIncome, response.TotalExpenses, response.AvailableBalance, response.CurrentAvailableBalance)
	}

	assertMoneyByContainerTotal(t, response.MoneyByContainer, "source-place", 500)
	assertMoneyByContainerTotal(t, response.MoneyByContainer, "destination-place", 300)
}

func TestQueryMoneyByContainerIncludesSignedTransferLegs(t *testing.T) {
	mock, err := pgxmock.NewPool()
	if err != nil {
		t.Fatalf("pgxmock.NewPool() error = %v", err)
	}
	defer mock.Close()

	mock.ExpectQuery(`FROM incomes i[\s\S]*UNION ALL[\s\S]*FROM expenses e[\s\S]*UNION ALL[\s\S]*pt\.source_container_id[\s\S]*-SUM\(pt\.amount\)[\s\S]*FROM place_transfers pt[\s\S]*pt\.deleted_at IS NULL[\s\S]*UNION ALL[\s\S]*pt\.destination_container_id[\s\S]*SUM\(pt\.amount\)[\s\S]*FROM place_transfers pt[\s\S]*pt\.deleted_at IS NULL`).
		WithArgs(dashboardTestAccountID).
		WillReturnRows(mock.NewRows([]string{"container_id", "container_name", "container_type", "total"}).
			AddRow(stringPtr("source-place"), stringPtr("Source place"), stringPtr("cash"), 500.0).
			AddRow(stringPtr("destination-place"), stringPtr("Destination place"), stringPtr("bank"), 300.0))

	rows, err := queryMoneyByContainer(context.Background(), mock, dashboardTestAccountID)
	if err != nil {
		t.Fatalf("queryMoneyByContainer() error = %v", err)
	}
	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("mock expectations: %v", err)
	}

	if len(rows) != 2 {
		t.Fatalf("len(rows) = %d, want 2", len(rows))
	}
	if rows[0].ContainerID == nil || *rows[0].ContainerID != "source-place" || rows[0].Total != 500 {
		t.Fatalf("source row = %+v, want total after transfer out", rows[0])
	}
	if rows[1].ContainerID == nil || *rows[1].ContainerID != "destination-place" || rows[1].Total != 300 {
		t.Fatalf("destination row = %+v, want total after transfer in", rows[1])
	}
}

func TestQueryMoneyByContainerExcludesCanceledTransfers(t *testing.T) {
	mock, err := pgxmock.NewPool()
	if err != nil {
		t.Fatalf("pgxmock.NewPool() error = %v", err)
	}
	defer mock.Close()

	mock.ExpectQuery(`FROM place_transfers pt[\s\S]*WHERE pt\.account_id = \$1 AND pt\.deleted_at IS NULL[\s\S]*FROM place_transfers pt[\s\S]*WHERE pt\.account_id = \$1 AND pt\.deleted_at IS NULL`).
		WithArgs(dashboardTestAccountID).
		WillReturnRows(mock.NewRows([]string{"container_id", "container_name", "container_type", "total"}))

	rows, err := queryMoneyByContainer(context.Background(), mock, dashboardTestAccountID)
	if err != nil {
		t.Fatalf("queryMoneyByContainer() error = %v", err)
	}
	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("mock expectations: %v", err)
	}

	if len(rows) != 0 {
		t.Fatalf("len(rows) = %d, want 0 canceled transfer movements", len(rows))
	}
}

func TestQueryMoneyByContainerIncludesSignedSavingsLegs(t *testing.T) {
	mock, err := pgxmock.NewPool()
	if err != nil {
		t.Fatalf("pgxmock.NewPool() error = %v", err)
	}
	defer mock.Close()

	mock.ExpectQuery(`sgt\.container_id AS container_id[\s\S]*CASE[\s\S]*WHEN sgt\.transaction_type = 'deposit' THEN -sgt\.amount[\s\S]*WHEN sgt\.transaction_type = 'withdrawal' THEN sgt\.amount[\s\S]*FROM savings_goal_transactions sgt[\s\S]*LEFT JOIN payment_containers pc ON sgt\.container_id = pc\.id[\s\S]*WHERE sg\.account_id = \$1`).
		WithArgs(dashboardTestAccountID).
		WillReturnRows(mock.NewRows([]string{"container_id", "container_name", "container_type", "total"}).
			AddRow(stringPtr("wallet-1"), stringPtr("Wallet"), stringPtr("wallet"), 800.0).
			AddRow(stringPtr("bank-1"), stringPtr("Bank"), stringPtr("bank"), 250.0).
			AddRow(nil, nil, nil, 75.0))

	rows, err := queryMoneyByContainer(context.Background(), mock, dashboardTestAccountID)
	if err != nil {
		t.Fatalf("queryMoneyByContainer() error = %v", err)
	}
	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("mock expectations: %v", err)
	}

	if len(rows) != 3 {
		t.Fatalf("len(rows) = %d, want 3 rows with assigned and unassigned savings movement", len(rows))
	}
	if rows[0].ContainerID == nil || *rows[0].ContainerID != "wallet-1" || rows[0].Total != 800 {
		t.Fatalf("deposit-adjusted wallet row = %+v, want total 800", rows[0])
	}
	if rows[1].ContainerID == nil || *rows[1].ContainerID != "bank-1" || rows[1].Total != 250 {
		t.Fatalf("withdrawal-adjusted bank row = %+v, want total 250", rows[1])
	}
	if rows[2].ContainerID != nil || rows[2].Total != 75 {
		t.Fatalf("unassigned savings row = %+v, want nil container with total 75", rows[2])
	}
}

func TestGetSummaryAppliesSavingsDeltasOnlyToMoneyByContainer(t *testing.T) {
	gin.SetMode(gin.TestMode)

	originalUpcomingRecurringLoader := loadUpcomingRecurringExpenses
	originalNextMonthRecurringExpenseTotalLoader := loadNextMonthRecurringExpenseTotal
	loadUpcomingRecurringExpenses = func(_ dashboardQuerier, _ context.Context, _ interface{}, _ time.Time) (UpcomingRecurringSummary, error) {
		return UpcomingRecurringSummary{}, nil
	}
	loadNextMonthRecurringExpenseTotal = func(_ dashboardQuerier, _ context.Context, _ interface{}, _ time.Time) (float64, error) {
		return 0, nil
	}
	defer func() {
		loadUpcomingRecurringExpenses = originalUpcomingRecurringLoader
		loadNextMonthRecurringExpenseTotal = originalNextMonthRecurringExpenseTotalLoader
	}()

	mock, err := pgxmock.NewPool()
	if err != nil {
		t.Fatalf("pgxmock.NewPool() error = %v", err)
	}
	defer mock.Close()

	expectDashboardSummaryQueriesWithMoneyByContainerRows(
		mock,
		"2026-05",
		1200,
		500,
		100,
		25,
		3000,
		1200,
		700,
		100,
		mock.NewRows([]string{"container_id", "container_name", "container_type", "total"}).
			AddRow(stringPtr("wallet-1"), stringPtr("Wallet"), stringPtr("wallet"), 800.0).
			AddRow(stringPtr("bank-1"), stringPtr("Bank"), stringPtr("bank"), 250.0).
			AddRow(nil, nil, nil, 75.0),
	)

	body := performDashboardSummaryRequest(t, dashboardTestRouter(GetSummary(mock)), "2026-05")
	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("mock expectations: %v", err)
	}

	var response DashboardSummaryResponse
	if err := json.Unmarshal(body, &response); err != nil {
		t.Fatalf("json.Unmarshal() error = %v", err)
	}

	if response.TotalIncome != 1200 || response.TotalExpenses != 500 || response.AvailableBalance != 625 || response.CurrentAvailableBalance != 1200 {
		t.Fatalf("totals = income %v expenses %v available %v current %v, want savings-neutral income/expense with existing balance logic 1200/500/625/1200",
			response.TotalIncome, response.TotalExpenses, response.AvailableBalance, response.CurrentAvailableBalance)
	}

	assertMoneyByContainerTotal(t, response.MoneyByContainer, "wallet-1", 800)
	assertMoneyByContainerTotal(t, response.MoneyByContainer, "bank-1", 250)
	assertUnassignedMoneyByContainerTotal(t, response.MoneyByContainer, 75)
}

func TestNextCalendarMonthWindow(t *testing.T) {
	tests := []struct {
		name      string
		today     time.Time
		wantStart string
		wantEnd   string
	}{
		{name: "january to february", today: date(2026, time.January, 15), wantStart: "2026-02-01", wantEnd: "2026-03-01"},
		{name: "december to january", today: date(2026, time.December, 31), wantStart: "2027-01-01", wantEnd: "2027-02-01"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			gotStart, gotEnd := nextCalendarMonthWindow(tt.today)
			if gotStart.Format("2006-01-02") != tt.wantStart || gotEnd.Format("2006-01-02") != tt.wantEnd {
				t.Fatalf("nextCalendarMonthWindow() = (%s, %s), want (%s, %s)", gotStart.Format("2006-01-02"), gotEnd.Format("2006-01-02"), tt.wantStart, tt.wantEnd)
			}
		})
	}
}

func TestProjectedRecurringExpenseAmountUsesRecurringRulesAndNormalizedFallback(t *testing.T) {
	day31 := 31
	start, endExclusive := nextCalendarMonthWindow(date(2026, time.January, 15))

	tests := []struct {
		name     string
		template recurringExpenseTemplateRow
		want     float64
	}{
		{
			name: "uses normalized amount when monthly day 31 clamps into february",
			template: recurringExpenseTemplateRow{
				Amount:                  100,
				AmountInPrimaryCurrency: 125,
				RecurrenceFrequency:     "monthly",
				RecurrenceInterval:      1,
				RecurrenceDayOfMonth:    &day31,
				StartDate:               date(2026, time.January, 31),
				IsActive:                true,
			},
			want: 125,
		},
		{
			name: "uses query-provided fallback amount when normalized amount is missing",
			template: recurringExpenseTemplateRow{
				Amount:                  75,
				AmountInPrimaryCurrency: 75,
				RecurrenceFrequency:     "monthly",
				RecurrenceInterval:      1,
				RecurrenceDayOfMonth:    &day31,
				StartDate:               date(2026, time.January, 31),
				IsActive:                true,
			},
			want: 75,
		},
		{
			name: "excludes templates with no next month occurrence",
			template: recurringExpenseTemplateRow{
				Amount:               200,
				RecurrenceFrequency:  "yearly",
				RecurrenceInterval:   1,
				RecurrenceDayOfMonth: &day31,
				StartDate:            date(2026, time.January, 31),
				IsActive:             true,
			},
			want: 0,
		},
		{
			name: "excludes inactive templates from projected amount",
			template: recurringExpenseTemplateRow{
				Amount:                  125,
				AmountInPrimaryCurrency: 125,
				RecurrenceFrequency:     "monthly",
				RecurrenceInterval:      1,
				RecurrenceDayOfMonth:    &day31,
				StartDate:               date(2026, time.January, 31),
				IsActive:                false,
			},
			want: 0,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := projectedRecurringExpenseAmount(tt.template, start, endExclusive)
			if got != tt.want {
				t.Fatalf("projectedRecurringExpenseAmount() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestGetNextMonthRecurringExpenseTotalReturnsZeroWhenNoTemplates(t *testing.T) {
	mock, err := pgxmock.NewPool()
	if err != nil {
		t.Fatalf("pgxmock.NewPool() error = %v", err)
	}
	defer mock.Close()

	rows := mock.NewRows([]string{
		"id", "description", "amount", "currency", "amount_in_primary_currency", "recurrence_frequency", "recurrence_interval",
		"recurrence_day_of_month", "recurrence_day_of_week", "start_date", "end_date", "total_occurrences", "current_occurrence", "is_active",
	})

	mock.ExpectQuery(`COALESCE\(amount_in_primary_currency, amount\)[\s\S]*FROM recurring_expenses[\s\S]*WHERE account_id = \$1[\s\S]*AND is_active = true`).
		WithArgs(dashboardTestAccountID).
		WillReturnRows(rows)

	got, err := getNextMonthRecurringExpenseTotal(mock, context.Background(), dashboardTestAccountID, date(2026, time.January, 10))
	if err != nil {
		t.Fatalf("getNextMonthRecurringExpenseTotal() error = %v", err)
	}
	if got != 0 {
		t.Fatalf("getNextMonthRecurringExpenseTotal() = %v, want 0", got)
	}
	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("mock expectations: %v", err)
	}
}

func TestGetNextMonthRecurringExpenseTotalScopesToActiveAccountAndSumsQualifyingOccurrences(t *testing.T) {
	mock, err := pgxmock.NewPool()
	if err != nil {
		t.Fatalf("pgxmock.NewPool() error = %v", err)
	}
	defer mock.Close()

	day15 := 15
	day31 := 31
	normalizedRent := 300.0
	rows := mock.NewRows([]string{
		"id", "description", "amount", "currency", "amount_in_primary_currency", "recurrence_frequency", "recurrence_interval",
		"recurrence_day_of_month", "recurrence_day_of_week", "start_date", "end_date", "total_occurrences", "current_occurrence", "is_active",
	}).
		AddRow("rent", "Rent", 100.0, "USD", normalizedRent, "monthly", 1, &day15, nil, date(2026, time.January, 15), nil, nil, 0, true).
		AddRow("subscription", "Subscription", 50.0, "ARS", 50.0, "monthly", 1, &day31, nil, date(2026, time.January, 31), nil, nil, 0, true)

	mock.ExpectQuery(`COALESCE\(amount_in_primary_currency, amount\)[\s\S]*FROM recurring_expenses[\s\S]*WHERE account_id = \$1[\s\S]*AND is_active = true`).
		WithArgs(dashboardTestAccountID).
		WillReturnRows(rows)

	got, err := getNextMonthRecurringExpenseTotal(mock, context.Background(), dashboardTestAccountID, date(2026, time.January, 10))
	if err != nil {
		t.Fatalf("getNextMonthRecurringExpenseTotal() error = %v", err)
	}
	if got != 350 {
		t.Fatalf("getNextMonthRecurringExpenseTotal() = %v, want 350", got)
	}
	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("mock expectations: %v", err)
	}
}

func TestBuildMoneyByContainerBreakdownIncludesUnassignedBucket(t *testing.T) {
	rows := []containerMoneyRow{
		{ContainerID: stringPtr("wallet-1"), ContainerName: stringPtr("Mercado Pago"), ContainerType: stringPtr("wallet"), Total: 800},
		{ContainerID: stringPtr("bank-1"), ContainerName: stringPtr("Banco Nación"), ContainerType: stringPtr("bank"), Total: 200},
		{Total: 150},
	}

	breakdown := buildMoneyByContainerBreakdown(rows)

	if len(breakdown) != 3 {
		t.Fatalf("len(breakdown) = %d, want 3", len(breakdown))
	}
	if breakdown[0].ContainerID == nil || *breakdown[0].ContainerID != "wallet-1" || breakdown[0].Percentage != 69.56521739130434 {
		t.Fatalf("first breakdown item = %+v, want Mercado Pago first with percentage", breakdown[0])
	}
	unassigned := breakdown[2]
	if !unassigned.IsUnassigned || unassigned.Name != "Unassigned" || unassigned.Total != 150 {
		t.Fatalf("unassigned item = %+v, want explicit unassigned bucket", unassigned)
	}
}

func TestBuildMoneyByContainerBreakdownMergesMultipleUnassignedRows(t *testing.T) {
	breakdown := buildMoneyByContainerBreakdown([]containerMoneyRow{
		{Total: 100},
		{ContainerID: stringPtr("cash-1"), ContainerName: stringPtr("Cash"), ContainerType: stringPtr("cash"), Total: 50},
		{Total: 25},
	})

	if len(breakdown) != 2 {
		t.Fatalf("len(breakdown) = %d, want 2", len(breakdown))
	}
	if breakdown[0].Name != "Unassigned" || breakdown[0].Total != 125 || !breakdown[0].IsUnassigned {
		t.Fatalf("first breakdown item = %+v, want merged unassigned first by total", breakdown[0])
	}
	if breakdown[1].Percentage != float64(50)/float64(175)*100 {
		t.Fatalf("cash percentage = %v, want %v", breakdown[1].Percentage, float64(50)/float64(175)*100)
	}
}

func expectDashboardSummaryQueries(
	mock pgxmock.PgxPoolIface,
	month string,
	monthlyIncome float64,
	monthlyExpenses float64,
	monthlyDeposits float64,
	monthlyWithdrawals float64,
	historicalIncome float64,
	historicalExpenses float64,
	historicalDeposits float64,
	historicalWithdrawals float64,
) {
	expectDashboardSummaryQueriesWithMoneyByContainerRows(
		mock,
		month,
		monthlyIncome,
		monthlyExpenses,
		monthlyDeposits,
		monthlyWithdrawals,
		historicalIncome,
		historicalExpenses,
		historicalDeposits,
		historicalWithdrawals,
		mock.NewRows([]string{"container_id", "container_name", "container_type", "total"}),
	)
}

func expectDashboardSummaryQueriesWithMoneyByContainerRows(
	mock pgxmock.PgxPoolIface,
	month string,
	monthlyIncome float64,
	monthlyExpenses float64,
	monthlyDeposits float64,
	monthlyWithdrawals float64,
	historicalIncome float64,
	historicalExpenses float64,
	historicalDeposits float64,
	historicalWithdrawals float64,
	moneyByContainerRows *pgxmock.Rows,
) {
	mock.ExpectQuery(`SELECT currency FROM accounts WHERE id = \$1`).
		WithArgs(dashboardTestAccountID).
		WillReturnRows(mock.NewRows([]string{"currency"}).AddRow("ARS"))

	mock.ExpectQuery(`FROM incomes[\s\S]*TO_CHAR\(date, 'YYYY-MM'\) = \$2`).
		WithArgs(dashboardTestAccountID, month).
		WillReturnRows(mock.NewRows([]string{"sum"}).AddRow(monthlyIncome))

	mock.ExpectQuery(`FROM expenses[\s\S]*TO_CHAR\(date, 'YYYY-MM'\) = \$2`).
		WithArgs(dashboardTestAccountID, month).
		WillReturnRows(mock.NewRows([]string{"sum"}).AddRow(monthlyExpenses))

	mock.ExpectQuery(`FROM incomes[\s\S]*WHERE account_id = \$1[\s\S]*deleted_at IS NULL[\s]*$`).
		WithArgs(dashboardTestAccountID).
		WillReturnRows(mock.NewRows([]string{"sum"}).AddRow(historicalIncome))

	mock.ExpectQuery(`FROM expenses[\s\S]*WHERE account_id = \$1[\s\S]*deleted_at IS NULL[\s]*$`).
		WithArgs(dashboardTestAccountID).
		WillReturnRows(mock.NewRows([]string{"sum"}).AddRow(historicalExpenses))

	mock.ExpectQuery(`FROM incomes i[\s\S]*LEFT JOIN payment_containers[\s\S]*UNION ALL[\s\S]*FROM expenses e[\s\S]*UNION ALL[\s\S]*FROM place_transfers pt`).
		WithArgs(dashboardTestAccountID).
		WillReturnRows(moneyByContainerRows)

	mock.ExpectQuery(`FROM expenses e[\s\S]*GROUP BY`).
		WithArgs(dashboardTestAccountID, month).
		WillReturnRows(mock.NewRows([]string{"category_id", "category_name", "category_icon", "category_color", "total"}))

	mock.ExpectQuery(`FROM expenses e[\s\S]*LIMIT 5`).
		WithArgs(dashboardTestAccountID, month).
		WillReturnRows(mock.NewRows([]string{"id", "description", "amount", "currency", "amount_in_primary_currency", "category_name", "date"}))

	mock.ExpectQuery(`SELECT \* FROM \([\s\S]*ORDER BY combined.date DESC, combined.created_at DESC[\s\S]*LIMIT 10`).
		WithArgs(dashboardTestAccountID, month).
		WillReturnRows(mock.NewRows([]string{"id", "type", "description", "amount", "currency", "amount_in_primary_currency", "category_name", "date", "created_at"}))

	mock.ExpectQuery(`FROM savings_goal_transactions sgt[\s\S]*TO_CHAR\(sgt.date, 'YYYY-MM'\) = \$2`).
		WithArgs(dashboardTestAccountID, month).
		WillReturnRows(mock.NewRows([]string{"deposits", "withdrawals"}).AddRow(monthlyDeposits, monthlyWithdrawals))

	mock.ExpectQuery(`FROM savings_goal_transactions sgt[\s\S]*WHERE sg.account_id = \$1[\s]*$`).
		WithArgs(dashboardTestAccountID).
		WillReturnRows(mock.NewRows([]string{"deposits", "withdrawals"}).AddRow(historicalDeposits, historicalWithdrawals))

	mock.ExpectQuery(`FROM savings_goals`).
		WithArgs(dashboardTestAccountID).
		WillReturnRows(mock.NewRows([]string{"sum"}).AddRow(600.0))

}

func assertMoneyByContainerTotal(t *testing.T, items []MoneyByContainer, containerID string, want float64) {
	t.Helper()

	for _, item := range items {
		if item.ContainerID != nil && *item.ContainerID == containerID {
			if item.Total != want {
				t.Fatalf("money_by_container[%s].total = %v, want %v", containerID, item.Total, want)
			}
			return
		}
	}

	t.Fatalf("money_by_container missing container %s in %+v", containerID, items)
}

func assertUnassignedMoneyByContainerTotal(t *testing.T, items []MoneyByContainer, want float64) {
	t.Helper()

	for _, item := range items {
		if item.IsUnassigned {
			if item.ContainerID != nil || item.Total != want {
				t.Fatalf("unassigned money_by_container = %+v, want nil container and total %v", item, want)
			}
			return
		}
	}

	t.Fatalf("money_by_container missing unassigned bucket in %+v", items)
}

func performDashboardSummaryRequest(t *testing.T, router *gin.Engine, month string) []byte {
	t.Helper()

	recorder := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/dashboard/summary?month="+month, nil)
	router.ServeHTTP(recorder, req)

	if recorder.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d, body = %s", recorder.Code, http.StatusOK, recorder.Body.String())
	}

	return recorder.Body.Bytes()
}

func assertBalanceFieldsPresent(t *testing.T, body []byte) {
	t.Helper()

	var payload map[string]any
	if err := json.Unmarshal(body, &payload); err != nil {
		t.Fatalf("json.Unmarshal(map) error = %v", err)
	}

	if _, ok := payload["available_balance"]; !ok {
		t.Fatalf("available_balance missing from response: %s", string(body))
	}
	if _, ok := payload["current_available_balance"]; !ok {
		t.Fatalf("current_available_balance missing from response: %s", string(body))
	}
}

func assertNextMonthRecurringExpenseTotalPresent(t *testing.T, body []byte) {
	t.Helper()

	var payload map[string]any
	if err := json.Unmarshal(body, &payload); err != nil {
		t.Fatalf("json.Unmarshal(map) error = %v", err)
	}

	value, ok := payload["next_month_recurring_expense_total"]
	if !ok {
		t.Fatalf("next_month_recurring_expense_total missing from response: %s", string(body))
	}
	if _, ok := value.(float64); !ok {
		t.Fatalf("next_month_recurring_expense_total = %T, want numeric", value)
	}
}

func dashboardTestRouter(handler gin.HandlerFunc) *gin.Engine {
	router := gin.New()
	router.Use(func(c *gin.Context) {
		c.Set("account_id", dashboardTestAccountID)
		c.Next()
	})
	router.GET("/dashboard/summary", handler)
	return router
}

func stringPtr(value string) *string {
	return &value
}

func date(year int, month time.Month, day int) time.Time {
	return time.Date(year, month, day, 0, 0, 0, 0, time.UTC)
}
