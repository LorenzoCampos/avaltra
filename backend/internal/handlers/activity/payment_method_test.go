package activity

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	pgxmock "github.com/pashagolub/pgxmock/v5"
)

const activityTestAccountID = "11111111-1111-1111-1111-111111111111"

func TestListActivityIncludesPaymentMethodAndOriginalAmounts(t *testing.T) {
	gin.SetMode(gin.TestMode)

	mock, err := pgxmock.NewPool()
	if err != nil {
		t.Fatalf("pgxmock.NewPool() error = %v", err)
	}
	defer mock.Close()

	createdAt := time.Date(2026, time.January, 20, 12, 0, 0, 0, time.UTC)
	incomeDate := time.Date(2026, time.January, 20, 0, 0, 0, 0, time.UTC)
	expenseDate := time.Date(2026, time.January, 19, 0, 0, 0, 0, time.UTC)
	savingsDate := time.Date(2026, time.January, 18, 0, 0, 0, 0, time.UTC)

	unionQuery := `SELECT COUNT\(\*\) FROM \(`
	mock.ExpectQuery(unionQuery).
		WithArgs(activityTestAccountID).
		WillReturnRows(mock.NewRows([]string{"count"}).AddRow(3))

	mock.ExpectQuery(`SELECT\s+type,\s+SUM\(amount_in_primary_currency\) as total`).
		WithArgs(activityTestAccountID).
		WillReturnRows(mock.NewRows([]string{"type", "total"}).
			AddRow("income", 1000.0).
			AddRow("expense", 200.0).
			AddRow("savings_deposit", 50.0))

	mock.ExpectQuery(`SELECT\s+i.id,`).
		WithArgs(activityTestAccountID, 50, 0).
		WillReturnRows(mock.NewRows([]string{"id", "type", "description", "amount", "currency", "amount_in_primary_currency", "payment_method", "payment_context_label", "category_name", "goal_name", "goal_id", "date", "created_at"}).
			AddRow("income-id", "income", "Salario", 1000.0, "ARS", 1000.0, stringPtr("bank_transfer"), stringPtr("Cuenta sueldo"), stringPtr("Salario"), nil, nil, incomeDate, createdAt).
			AddRow("expense-id", "expense", "Compra USD", 13.0, "USD", 20819.0, stringPtr("credit_card"), nil, stringPtr("Viajes"), nil, nil, expenseDate, createdAt).
			AddRow("savings-id", "savings_deposit", "Ahorro", 50.0, "ARS", 50.0, nil, nil, nil, stringPtr("Vacaciones"), stringPtr("goal-id"), savingsDate, createdAt))

	recorder := httptest.NewRecorder()
	router := activityTestRouter(listActivityHandler(mock))
	req := httptest.NewRequest(http.MethodGet, "/activity", nil)
	router.ServeHTTP(recorder, req)

	if recorder.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d, body = %s", recorder.Code, http.StatusOK, recorder.Body.String())
	}

	var response struct {
		Activities []map[string]any `json:"activities"`
	}
	if err := json.Unmarshal(recorder.Body.Bytes(), &response); err != nil {
		t.Fatalf("json.Unmarshal() error = %v", err)
	}

	if len(response.Activities) != 3 {
		t.Fatalf("len(activities) = %d, want 3", len(response.Activities))
	}

	if got := response.Activities[0]["payment_method"]; got != "bank_transfer" {
		t.Fatalf("income payment_method = %#v, want %#v", got, "bank_transfer")
	}
	assertPaymentContextLabel(t, response.Activities[0], "Cuenta sueldo")
	if got := response.Activities[1]["payment_method"]; got != "credit_card" {
		t.Fatalf("expense payment_method = %#v, want %#v", got, "credit_card")
	}
	assertPaymentContextLabel(t, response.Activities[1], "Credit card")
	assertLegacyPaymentMethod(t, response.Activities[1], "credit_card")
	if got := response.Activities[1]["amount"]; got != 13.0 {
		t.Fatalf("expense amount = %#v, want %#v", got, 13.0)
	}
	if got := response.Activities[1]["currency"]; got != "USD" {
		t.Fatalf("expense currency = %#v, want %#v", got, "USD")
	}
	if got := response.Activities[1]["amount_in_primary_currency"]; got != 20819.0 {
		t.Fatalf("expense amount_in_primary_currency = %#v, want %#v", got, 20819.0)
	}
	if got := response.Activities[2]["payment_method"]; got != nil {
		t.Fatalf("savings payment_method = %#v, want nil", got)
	}
	if got := response.Activities[2]["payment_context"]; got != nil {
		t.Fatalf("savings payment_context = %#v, want nil", got)
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("mock expectations: %v", err)
	}
}

func assertPaymentContextLabel(t *testing.T, activity map[string]any, expected string) {
	t.Helper()

	contextValue, ok := activity["payment_context"].(map[string]any)
	if !ok {
		t.Fatalf("payment_context = %#v, want object", activity["payment_context"])
	}
	if got := contextValue["display_label"]; got != expected {
		t.Fatalf("payment_context.display_label = %#v, want %#v", got, expected)
	}
}

func assertLegacyPaymentMethod(t *testing.T, activity map[string]any, expected string) {
	t.Helper()

	contextValue, ok := activity["payment_context"].(map[string]any)
	if !ok {
		t.Fatalf("payment_context = %#v, want object", activity["payment_context"])
	}
	if got := contextValue["legacy_payment_method"]; got != expected {
		t.Fatalf("payment_context.legacy_payment_method = %#v, want %#v", got, expected)
	}
}

func activityTestRouter(handler gin.HandlerFunc) *gin.Engine {
	router := gin.New()
	router.Use(func(c *gin.Context) {
		c.Set("account_id", activityTestAccountID)
		c.Next()
	})
	router.GET("/activity", handler)
	return router
}

func stringPtr(value string) *string {
	return &value
}
