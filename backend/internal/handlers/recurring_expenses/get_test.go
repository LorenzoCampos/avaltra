package recurring_expenses

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
	testRecurringExpenseAccountID = "11111111-1111-1111-1111-111111111111"
	testRecurringExpenseID        = "22222222-2222-2222-2222-222222222222"
)

func TestGetRecurringExpenseSerializesDateInputs(t *testing.T) {
	gin.SetMode(gin.TestMode)

	mock, err := pgxmock.NewPool()
	if err != nil {
		t.Fatalf("pgxmock.NewPool() error = %v", err)
	}
	defer mock.Close()

	startDate := time.Date(2026, time.January, 16, 0, 0, 0, 0, time.UTC)
	endDate := time.Date(2026, time.June, 30, 0, 0, 0, 0, time.UTC)
	createdAt := time.Date(2026, time.January, 15, 10, 0, 0, 0, time.UTC)
	updatedAt := time.Date(2026, time.January, 15, 11, 0, 0, 0, time.UTC)

	mock.ExpectQuery(`FROM\s+recurring_expenses\s+re`).
		WithArgs(testRecurringExpenseID, testRecurringExpenseAccountID).
		WillReturnRows(mock.NewRows([]string{
			"id", "account_id", "description", "amount", "currency", "category_id", "category_name", "family_member_id", "family_member_name",
			"recurrence_frequency", "recurrence_interval", "recurrence_day_of_month", "recurrence_day_of_week", "start_date", "end_date",
			"total_occurrences", "current_occurrence", "exchange_rate", "amount_in_primary_currency", "source_container_id", "source_instrument_id",
			"is_active", "created_at", "updated_at",
		}).AddRow(testRecurringExpenseID, testRecurringExpenseAccountID, "Rent", 1000.0, "ARS", nil, nil, nil, nil, "monthly", 1, nil, nil, startDate, endDate, nil, 0, nil, nil, nil, nil, true, createdAt, updatedAt))
	mock.ExpectQuery(`FROM\s+expenses`).
		WithArgs(testRecurringExpenseID).
		WillReturnRows(mock.NewRows([]string{"count"}).AddRow(0))

	recorder := httptest.NewRecorder()
	router := recurringExpenseTestRouter(getRecurringExpenseHandler(mock))
	req := httptest.NewRequest(http.MethodGet, "/recurring-expenses/"+testRecurringExpenseID, nil)
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
	if response.StartDate != "2026-01-16" {
		t.Fatalf("start_date = %q, want %q", response.StartDate, "2026-01-16")
	}
	if response.EndDate == nil || *response.EndDate != "2026-06-30" {
		t.Fatalf("end_date = %v, want %q", response.EndDate, "2026-06-30")
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("mock expectations: %v", err)
	}
}

func recurringExpenseTestRouter(handler gin.HandlerFunc) *gin.Engine {
	router := gin.New()
	router.Use(func(c *gin.Context) {
		c.Set("account_id", testRecurringExpenseAccountID)
		c.Next()
	})
	router.GET("/recurring-expenses/:id", handler)
	return router
}
