package accounts

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/LorenzoCampos/avaltra/internal/transactions"
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/pashagolub/pgxmock/v5"
)

const (
	testUserID                  = "11111111-1111-1111-1111-111111111111"
	testAccountID               = "22222222-2222-2222-2222-222222222222"
	testDefaultExpenseContainer = "33333333-3333-3333-3333-333333333333"
	testDefaultIncomeContainer  = "44444444-4444-4444-4444-444444444444"
)

func TestResolveAccountDefaultContainerUpdate(t *testing.T) {
	tests := []struct {
		name        string
		field       transactions.NullableStringField
		wantSet     bool
		wantValue   *string
		expectError bool
	}{
		{
			name: "omitted field is not updated",
		},
		{
			name:      "explicit null clears default",
			field:     transactions.NullableStringField{Set: true, Valid: false},
			wantSet:   true,
			wantValue: nil,
		},
		{
			name:      "valid uuid is accepted",
			field:     transactions.NullableStringField{Set: true, Valid: true, Value: "55555555-5555-5555-5555-555555555555"},
			wantSet:   true,
			wantValue: stringPtr("55555555-5555-5555-5555-555555555555"),
		},
		{
			name:        "invalid uuid is rejected",
			field:       transactions.NullableStringField{Set: true, Valid: true, Value: "not-a-uuid"},
			expectError: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			gotSet, gotValue, err := resolveAccountDefaultContainerUpdate("default_expense_container_id", tt.field)
			if tt.expectError {
				if err == nil {
					t.Fatal("expected error, got nil")
				}
				return
			}
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if gotSet != tt.wantSet {
				t.Fatalf("set = %v, want %v", gotSet, tt.wantSet)
			}
			if (gotValue == nil) != (tt.wantValue == nil) {
				t.Fatalf("value = %v, want %v", gotValue, tt.wantValue)
			}
			if gotValue != nil && *gotValue != *tt.wantValue {
				t.Fatalf("value = %q, want %q", *gotValue, *tt.wantValue)
			}
		})
	}
}

func TestUpdateAccountPersistsDefaultContainers(t *testing.T) {
	gin.SetMode(gin.TestMode)

	mock, err := pgxmock.NewPool()
	if err != nil {
		t.Fatalf("pgxmock.NewPool() error = %v", err)
	}
	defer mock.Close()

	expectAccountExists(mock, true)
	expectDefaultContainerValidation(mock, testDefaultExpenseContainer, true)
	expectDefaultContainerValidation(mock, testDefaultIncomeContainer, true)
	mock.ExpectExec(`UPDATE accounts SET default_expense_container_id = \$1, default_income_container_id = \$2, updated_at = NOW\(\) WHERE id = \$3 AND user_id = \$4`).
		WithArgs(stringPtr(testDefaultExpenseContainer), stringPtr(testDefaultIncomeContainer), testAccountID, testUserID).
		WillReturnResult(pgconn.NewCommandTag("UPDATE 1"))
	expectUpdatedAccount(mock, stringPtr(testDefaultExpenseContainer), stringPtr(testDefaultIncomeContainer))

	recorder := httptest.NewRecorder()
	router := accountTestRouter((&Handler{db: mock}).UpdateAccount)
	req := httptest.NewRequest(http.MethodPut, "/accounts/"+testAccountID, bytes.NewBufferString(`{"default_expense_container_id":"`+testDefaultExpenseContainer+`","default_income_container_id":"`+testDefaultIncomeContainer+`"}`))
	req.Header.Set("Content-Type", "application/json")
	router.ServeHTTP(recorder, req)

	if recorder.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d, body = %s", recorder.Code, http.StatusOK, recorder.Body.String())
	}
	var response struct {
		Account struct {
			DefaultExpenseContainerID *string `json:"default_expense_container_id"`
			DefaultIncomeContainerID  *string `json:"default_income_container_id"`
		} `json:"account"`
	}
	if err := json.Unmarshal(recorder.Body.Bytes(), &response); err != nil {
		t.Fatalf("json.Unmarshal() error = %v", err)
	}
	if response.Account.DefaultExpenseContainerID == nil || *response.Account.DefaultExpenseContainerID != testDefaultExpenseContainer {
		t.Fatalf("default_expense_container_id = %v, want %q", response.Account.DefaultExpenseContainerID, testDefaultExpenseContainer)
	}
	if response.Account.DefaultIncomeContainerID == nil || *response.Account.DefaultIncomeContainerID != testDefaultIncomeContainer {
		t.Fatalf("default_income_container_id = %v, want %q", response.Account.DefaultIncomeContainerID, testDefaultIncomeContainer)
	}
	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("mock expectations: %v", err)
	}
}

func TestUpdateAccountClearsDefaultContainersWithExplicitNull(t *testing.T) {
	gin.SetMode(gin.TestMode)

	mock, err := pgxmock.NewPool()
	if err != nil {
		t.Fatalf("pgxmock.NewPool() error = %v", err)
	}
	defer mock.Close()

	expectAccountExists(mock, true)
	mock.ExpectExec(`UPDATE accounts SET default_expense_container_id = \$1, default_income_container_id = \$2, updated_at = NOW\(\) WHERE id = \$3 AND user_id = \$4`).
		WithArgs((*string)(nil), (*string)(nil), testAccountID, testUserID).
		WillReturnResult(pgconn.NewCommandTag("UPDATE 1"))
	expectUpdatedAccount(mock, nil, nil)

	recorder := httptest.NewRecorder()
	router := accountTestRouter((&Handler{db: mock}).UpdateAccount)
	req := httptest.NewRequest(http.MethodPut, "/accounts/"+testAccountID, bytes.NewBufferString(`{"default_expense_container_id":null,"default_income_container_id":null}`))
	req.Header.Set("Content-Type", "application/json")
	router.ServeHTTP(recorder, req)

	if recorder.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d, body = %s", recorder.Code, http.StatusOK, recorder.Body.String())
	}
	var response struct {
		Account struct {
			DefaultExpenseContainerID *string `json:"default_expense_container_id"`
			DefaultIncomeContainerID  *string `json:"default_income_container_id"`
		} `json:"account"`
	}
	if err := json.Unmarshal(recorder.Body.Bytes(), &response); err != nil {
		t.Fatalf("json.Unmarshal() error = %v", err)
	}
	if response.Account.DefaultExpenseContainerID != nil {
		t.Fatalf("default_expense_container_id = %v, want nil", response.Account.DefaultExpenseContainerID)
	}
	if response.Account.DefaultIncomeContainerID != nil {
		t.Fatalf("default_income_container_id = %v, want nil", response.Account.DefaultIncomeContainerID)
	}
	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("mock expectations: %v", err)
	}
}

func TestUpdateAccountRejectsInactiveOrCrossAccountDefaultContainers(t *testing.T) {
	gin.SetMode(gin.TestMode)

	tests := []struct {
		name string
		body string
	}{
		{
			name: "inactive or cross-account expense default is rejected",
			body: `{"default_expense_container_id":"` + testDefaultExpenseContainer + `"}`,
		},
		{
			name: "inactive or cross-account income default is rejected",
			body: `{"default_income_container_id":"` + testDefaultIncomeContainer + `"}`,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mock, err := pgxmock.NewPool()
			if err != nil {
				t.Fatalf("pgxmock.NewPool() error = %v", err)
			}
			defer mock.Close()

			expectAccountExists(mock, true)
			if tt.name == "inactive or cross-account expense default is rejected" {
				expectDefaultContainerValidation(mock, testDefaultExpenseContainer, false)
			} else {
				expectDefaultContainerValidation(mock, testDefaultIncomeContainer, false)
			}

			recorder := httptest.NewRecorder()
			router := accountTestRouter((&Handler{db: mock}).UpdateAccount)
			req := httptest.NewRequest(http.MethodPut, "/accounts/"+testAccountID, bytes.NewBufferString(tt.body))
			req.Header.Set("Content-Type", "application/json")
			router.ServeHTTP(recorder, req)

			if recorder.Code != http.StatusBadRequest {
				t.Fatalf("status = %d, want %d, body = %s", recorder.Code, http.StatusBadRequest, recorder.Body.String())
			}
			if err := mock.ExpectationsWereMet(); err != nil {
				t.Fatalf("mock expectations: %v", err)
			}
		})
	}
}

func stringPtr(value string) *string {
	return &value
}

func accountTestRouter(handler gin.HandlerFunc) *gin.Engine {
	router := gin.New()
	router.Use(func(c *gin.Context) {
		c.Set("user_id", testUserID)
		c.Next()
	})
	router.PUT("/accounts/:id", handler)
	return router
}

func expectAccountExists(mock pgxmock.PgxPoolIface, exists bool) {
	mock.ExpectQuery(`SELECT EXISTS\(SELECT 1 FROM accounts WHERE id = \$1 AND user_id = \$2\)`).
		WithArgs(testAccountID, testUserID).
		WillReturnRows(mock.NewRows([]string{"exists"}).AddRow(exists))
}

func expectDefaultContainerValidation(mock pgxmock.PgxPoolIface, containerID string, exists bool) {
	mock.ExpectQuery(`SELECT EXISTS\(SELECT 1 FROM payment_containers WHERE id = \$1 AND account_id = \$2 AND is_active = true\)`).
		WithArgs(containerID, testAccountID).
		WillReturnRows(mock.NewRows([]string{"exists"}).AddRow(exists))
}

func expectUpdatedAccount(mock pgxmock.PgxPoolIface, defaultExpenseID, defaultIncomeID *string) {
	mock.ExpectQuery(`SELECT\s+id,\s+name,\s+type,\s+currency,\s+default_expense_container_id,\s+default_income_container_id,\s+created_at::TEXT,\s+updated_at::TEXT\s+FROM accounts\s+WHERE id = \$1`).
		WithArgs(testAccountID).
		WillReturnRows(mock.NewRows([]string{"id", "name", "type", "currency", "default_expense_container_id", "default_income_container_id", "created_at", "updated_at"}).
			AddRow(testAccountID, "Personal", "personal", "ARS", defaultExpenseID, defaultIncomeID, "2026-05-22T10:00:00Z", "2026-05-22T10:01:00Z"))
}
