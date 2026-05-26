package recurring_incomes

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/pashagolub/pgxmock/v5"
)

const (
	testRecurringIncomeAccountID = "33333333-3333-3333-3333-333333333333"
	testRecurringIncomeID        = "44444444-4444-4444-4444-444444444444"
)

func TestGetRecurringIncomeSerializesDateInputs(t *testing.T) {
	gin.SetMode(gin.TestMode)

	mock, err := pgxmock.NewPool()
	if err != nil {
		t.Fatalf("pgxmock.NewPool() error = %v", err)
	}
	defer mock.Close()

	startDate := time.Date(2026, time.January, 20, 0, 0, 0, 0, time.UTC)
	endDate := time.Date(2026, time.December, 31, 0, 0, 0, 0, time.UTC)
	createdAt := time.Date(2026, time.January, 19, 10, 0, 0, 0, time.UTC)
	updatedAt := time.Date(2026, time.January, 19, 11, 0, 0, 0, time.UTC)

	mock.ExpectQuery(`FROM\s+recurring_incomes\s+re`).
		WithArgs(testRecurringIncomeID, testRecurringIncomeAccountID).
		WillReturnRows(mock.NewRows([]string{
			"id", "account_id", "description", "amount", "currency", "category_id", "category_name", "family_member_id", "family_member_name",
			"recurrence_frequency", "recurrence_interval", "recurrence_day_of_month", "recurrence_day_of_week", "start_date", "end_date",
			"total_occurrences", "current_occurrence", "exchange_rate", "amount_in_primary_currency", "destination_container_id", "destination_instrument_id",
			"is_active", "created_at", "updated_at",
		}).AddRow(testRecurringIncomeID, testRecurringIncomeAccountID, "Salary", 2000.0, "ARS", nil, nil, nil, nil, "monthly", 1, nil, nil, startDate, endDate, nil, 0, nil, nil, nil, nil, true, createdAt, updatedAt))
	mock.ExpectQuery(`FROM\s+expenses`).
		WithArgs(testRecurringIncomeID).
		WillReturnRows(mock.NewRows([]string{"count"}).AddRow(0))

	recorder := httptest.NewRecorder()
	router := recurringIncomeTestRouter(getRecurringIncomeHandler(mock))
	req := httptest.NewRequest(http.MethodGet, "/recurring-incomes/"+testRecurringIncomeID, nil)
	router.ServeHTTP(recorder, req)

	if recorder.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d, body = %s", recorder.Code, http.StatusOK, recorder.Body.String())
	}

	var response struct {
		StartDate string  `json:"start_date"`
		EndDate   *string `json:"end_date"`
	}
	if err := json.Unmarshal(recorder.Body.Bytes(), &response); err != nil {
		t.Fatalf("json.Unmarshal() error = %v", err)
	}
	if response.StartDate != "2026-01-20" {
		t.Fatalf("start_date = %q, want %q", response.StartDate, "2026-01-20")
	}
	if response.EndDate == nil || *response.EndDate != "2026-12-31" {
		t.Fatalf("end_date = %v, want %q", response.EndDate, "2026-12-31")
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("mock expectations: %v", err)
	}
}

func recurringIncomeTestRouter(handler gin.HandlerFunc) *gin.Engine {
	router := gin.New()
	router.Use(func(c *gin.Context) {
		c.Set("account_id", testRecurringIncomeAccountID)
		c.Next()
	})
	router.GET("/recurring-incomes/:id", handler)
	return router
}
