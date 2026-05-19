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
	loadUpcomingRecurringExpenses = func(_ dashboardQuerier, _ context.Context, _ interface{}, _ time.Time) (UpcomingRecurringSummary, error) {
		return UpcomingRecurringSummary{}, nil
	}
	defer func() {
		loadUpcomingRecurringExpenses = originalUpcomingRecurringLoader
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

	assertBalanceFieldsPresent(t, aprilBody)
	assertBalanceFieldsPresent(t, mayBody)

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

	mock.ExpectQuery(`FROM incomes i[\s\S]*LEFT JOIN payment_containers[\s\S]*UNION ALL[\s\S]*FROM expenses e`).
		WithArgs(dashboardTestAccountID).
		WillReturnRows(mock.NewRows([]string{"container_id", "container_name", "container_type", "total"}))

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
