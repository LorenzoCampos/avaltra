package savings_goals

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"regexp"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5"
	"github.com/pashagolub/pgxmock/v5"
)

const (
	testSavingsAccountID   = "11111111-1111-1111-1111-111111111111"
	testSavingsGoalID      = "22222222-2222-2222-2222-222222222222"
	testSavingsContainerID = "33333333-3333-3333-3333-333333333333"
	testAltContainerID     = "44444444-4444-4444-4444-444444444444"
	testTransactionID      = "55555555-5555-5555-5555-555555555555"
)

func TestCreateSavingsGoalPlaceScenarios(t *testing.T) {
	gin.SetMode(gin.TestMode)
	createdAt := time.Date(2026, time.May, 31, 10, 0, 0, 0, time.UTC)

	tests := []struct {
		name         string
		body         string
		placeErr     error
		wantStatus   int
		wantError    string
		wantAssigned bool
	}{
		{name: "valid active-account place is persisted", body: `{"name":"Trip","target_amount":1000,"saved_in":"legacy label","saved_container_id":"` + testSavingsContainerID + `"}`, wantStatus: http.StatusCreated, wantAssigned: true},
		{name: "unassigned place is accepted without legacy backfill", body: `{"name":"Trip","target_amount":1000,"saved_in":"legacy label","saved_container_id":null}`, wantStatus: http.StatusCreated},
		{name: "inactive or cross-account place is rejected", body: `{"name":"Trip","target_amount":1000,"saved_container_id":"` + testSavingsContainerID + `"}`, placeErr: pgx.ErrNoRows, wantStatus: http.StatusBadRequest, wantError: "invalid-savings-place"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mock, err := pgxmock.NewPool()
			if err != nil {
				t.Fatalf("pgxmock.NewPool() error = %v", err)
			}
			defer mock.Close()

			if tt.wantAssigned || tt.placeErr != nil {
				expect := mock.ExpectQuery(`SELECT name FROM payment_containers`).
					WithArgs(testSavingsContainerID, testSavingsAccountID)
				if tt.placeErr != nil {
					expect.WillReturnError(tt.placeErr)
				} else {
					expect.WillReturnRows(mock.NewRows([]string{"name"}).AddRow("Bank"))
				}
			}
			if tt.wantError == "" {
				mock.ExpectQuery(`SELECT currency FROM accounts`).
					WithArgs(testSavingsAccountID).
					WillReturnRows(mock.NewRows([]string{"currency"}).AddRow("ARS"))
				mock.ExpectQuery(`SELECT EXISTS`).
					WithArgs(testSavingsAccountID, "Trip").
					WillReturnRows(mock.NewRows([]string{"exists"}).AddRow(false))
				mock.ExpectQuery(`INSERT INTO savings_goals`).
					WithArgs(testSavingsAccountID, "Trip", pgxmock.AnyArg(), 1000.0, "ARS", stringPtr("legacy label"), expectedContainerArg(tt.wantAssigned), pgxmock.AnyArg()).
					WillReturnRows(mock.NewRows([]string{"id", "created_at", "updated_at"}).AddRow(testSavingsGoalID, createdAt, createdAt))
			}

			recorder := httptest.NewRecorder()
			router := savingsTestRouter(http.MethodPost, "/savings-goals", CreateSavingsGoal(mock))
			req := httptest.NewRequest(http.MethodPost, "/savings-goals", bytes.NewBufferString(tt.body))
			req.Header.Set("Content-Type", "application/json")

			router.ServeHTTP(recorder, req)

			if recorder.Code != tt.wantStatus {
				t.Fatalf("status = %d, want %d, body = %s", recorder.Code, tt.wantStatus, recorder.Body.String())
			}
			if tt.wantError != "" {
				assertSavingsError(t, recorder.Body.Bytes(), tt.wantError)
			} else {
				var response struct {
					SavingsGoal SavingsGoalResponse `json:"savings_goal"`
				}
				if err := json.Unmarshal(recorder.Body.Bytes(), &response); err != nil {
					t.Fatalf("json.Unmarshal() error = %v", err)
				}
				if tt.wantAssigned && (response.SavingsGoal.SavedContainerID == nil || *response.SavingsGoal.SavedContainerID != testSavingsContainerID || response.SavingsGoal.SavedContainerName == nil || *response.SavingsGoal.SavedContainerName != "Bank" || response.SavingsGoal.StorageStatus != "assigned") {
					t.Fatalf("response = %#v, want assigned container", response.SavingsGoal)
				}
				if !tt.wantAssigned && (response.SavingsGoal.SavedContainerID != nil || response.SavingsGoal.StorageStatus != "unassigned" || response.SavingsGoal.SavedIn == nil || *response.SavingsGoal.SavedIn != "legacy label") {
					t.Fatalf("response = %#v, want unassigned legacy-compatible goal", response.SavingsGoal)
				}
			}
			if err := mock.ExpectationsWereMet(); err != nil {
				t.Fatalf("mock expectations: %v", err)
			}
		})
	}
}

func TestUpdateSavingsGoalPlaceScenarios(t *testing.T) {
	gin.SetMode(gin.TestMode)
	updatedAt := time.Date(2026, time.May, 31, 10, 30, 0, 0, time.UTC)

	tests := []struct {
		name              string
		body              string
		placeErr          error
		wantStatus        int
		wantError         string
		wantContainerID   *string
		wantContainerName *string
		wantStatusText    string
	}{
		{
			name:              "valid active-account place updates goal storage",
			body:              `{"saved_container_id":"` + testSavingsContainerID + `"}`,
			wantStatus:        http.StatusOK,
			wantContainerID:   stringPtr(testSavingsContainerID),
			wantContainerName: stringPtr("Bank"),
			wantStatusText:    "assigned",
		},
		{
			name:           "explicit null clears goal storage without changing legacy saved_in",
			body:           `{"saved_container_id":null}`,
			wantStatus:     http.StatusOK,
			wantStatusText: "unassigned",
		},
		{
			name:       "missing inactive or cross-account place is rejected",
			body:       `{"saved_container_id":"` + testSavingsContainerID + `"}`,
			placeErr:   pgx.ErrNoRows,
			wantStatus: http.StatusBadRequest,
			wantError:  "invalid-savings-place",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mock, err := pgxmock.NewPool()
			if err != nil {
				t.Fatalf("pgxmock.NewPool() error = %v", err)
			}
			defer mock.Close()

			if tt.wantContainerID != nil || tt.placeErr != nil {
				expect := mock.ExpectQuery(`SELECT name FROM payment_containers`).
					WithArgs(testSavingsContainerID, testSavingsAccountID)
				if tt.placeErr != nil {
					expect.WillReturnError(tt.placeErr)
				} else {
					expect.WillReturnRows(mock.NewRows([]string{"name"}).AddRow("Bank"))
				}
			}

			if tt.wantError == "" {
				mock.ExpectQuery(`SELECT name FROM savings_goals`).
					WithArgs(testSavingsGoalID, testSavingsAccountID).
					WillReturnRows(mock.NewRows([]string{"name"}).AddRow("Trip"))
				mock.ExpectQuery(`UPDATE savings_goals SET`).
					WithArgs(pgxmock.AnyArg(), pgxmock.AnyArg(), pgxmock.AnyArg(), pgxmock.AnyArg(), true, tt.wantContainerID, false, pgxmock.AnyArg(), pgxmock.AnyArg(), testSavingsGoalID, testSavingsAccountID).
					WillReturnRows(mock.NewRows([]string{"id", "account_id", "name", "description", "target_amount", "current_amount", "currency", "saved_in", "saved_container_id", "saved_container_name", "deadline", "is_active", "created_at", "updated_at"}).
						AddRow(testSavingsGoalID, testSavingsAccountID, "Trip", (*string)(nil), 1000.0, 100.0, "ARS", stringPtr("legacy label"), tt.wantContainerID, tt.wantContainerName, (*time.Time)(nil), true, updatedAt, updatedAt))
			}

			recorder := httptest.NewRecorder()
			router := savingsTestRouter(http.MethodPut, "/savings-goals/:id", UpdateSavingsGoal(mock))
			req := httptest.NewRequest(http.MethodPut, "/savings-goals/"+testSavingsGoalID, bytes.NewBufferString(tt.body))
			req.Header.Set("Content-Type", "application/json")

			router.ServeHTTP(recorder, req)

			if recorder.Code != tt.wantStatus {
				t.Fatalf("status = %d, want %d, body = %s", recorder.Code, tt.wantStatus, recorder.Body.String())
			}
			if tt.wantError != "" {
				assertSavingsError(t, recorder.Body.Bytes(), tt.wantError)
			} else {
				var response struct {
					SavingsGoal SavingsGoalResponse `json:"savings_goal"`
				}
				if err := json.Unmarshal(recorder.Body.Bytes(), &response); err != nil {
					t.Fatalf("json.Unmarshal() error = %v", err)
				}
				if response.SavingsGoal.StorageStatus != tt.wantStatusText {
					t.Fatalf("storage_status = %q, want %q", response.SavingsGoal.StorageStatus, tt.wantStatusText)
				}
				if !sameStringPtr(response.SavingsGoal.SavedContainerID, tt.wantContainerID) || !sameStringPtr(response.SavingsGoal.SavedContainerName, tt.wantContainerName) {
					t.Fatalf("response = %#v, want container id/name %#v/%#v", response.SavingsGoal, tt.wantContainerID, tt.wantContainerName)
				}
				if response.SavingsGoal.SavedIn == nil || *response.SavingsGoal.SavedIn != "legacy label" {
					t.Fatalf("saved_in = %#v, want legacy compatibility", response.SavingsGoal.SavedIn)
				}
			}
			if err := mock.ExpectationsWereMet(); err != nil {
				t.Fatalf("mock expectations: %v", err)
			}
		})
	}
}

func TestGetSavingsGoalReturnsPlaceContractAndTransactionContainers(t *testing.T) {
	gin.SetMode(gin.TestMode)
	createdAt := time.Date(2026, time.May, 31, 10, 0, 0, 0, time.UTC)

	mock, err := pgxmock.NewPool()
	if err != nil {
		t.Fatalf("pgxmock.NewPool() error = %v", err)
	}
	defer mock.Close()

	mock.ExpectQuery(`FROM savings_goals sg[\s\S]*LEFT JOIN payment_containers`).
		WithArgs(testSavingsGoalID, testSavingsAccountID).
		WillReturnRows(mock.NewRows([]string{"id", "account_id", "name", "description", "target_amount", "current_amount", "currency", "saved_in", "saved_container_id", "saved_container_name", "deadline", "is_active", "created_at", "updated_at"}).
			AddRow(testSavingsGoalID, testSavingsAccountID, "Trip", (*string)(nil), 1000.0, 100.0, "ARS", stringPtr("legacy label"), stringPtr(testSavingsContainerID), stringPtr("Bank"), (*time.Time)(nil), true, createdAt, createdAt))
	mock.ExpectQuery(`SELECT COUNT\(\*\) FROM savings_goal_transactions`).
		WithArgs(testSavingsGoalID).
		WillReturnRows(mock.NewRows([]string{"count"}).AddRow(1))
	mock.ExpectQuery(regexp.QuoteMeta(`SELECT
			id, amount, transaction_type, description, container_id,
			date::TEXT, created_at::TEXT
		FROM savings_goal_transactions`)).
		WithArgs(testSavingsGoalID, 20, 0).
		WillReturnRows(mock.NewRows([]string{"id", "amount", "transaction_type", "description", "container_id", "date", "created_at"}).
			AddRow(testTransactionID, 50.0, "deposit", (*string)(nil), stringPtr(testSavingsContainerID), "2026-05-31", createdAt.Format(time.RFC3339)))

	recorder := httptest.NewRecorder()
	router := savingsTestRouter(http.MethodGet, "/savings-goals/:id", GetSavingsGoal(mock))
	req := httptest.NewRequest(http.MethodGet, "/savings-goals/"+testSavingsGoalID, nil)

	router.ServeHTTP(recorder, req)

	if recorder.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d, body = %s", recorder.Code, http.StatusOK, recorder.Body.String())
	}
	var response SavingsGoalDetailResponse
	if err := json.Unmarshal(recorder.Body.Bytes(), &response); err != nil {
		t.Fatalf("json.Unmarshal() error = %v", err)
	}
	if response.SavedContainerID == nil || *response.SavedContainerID != testSavingsContainerID || response.SavedContainerName == nil || *response.SavedContainerName != "Bank" || response.StorageStatus != "assigned" {
		t.Fatalf("goal = %#v, want assigned place contract", response.SavingsGoalResponse)
	}
	if response.SavedIn == nil || *response.SavedIn != "legacy label" {
		t.Fatalf("saved_in = %#v, want legacy compatibility", response.SavedIn)
	}
	if len(response.Transactions) != 1 || response.Transactions[0].ContainerID == nil || *response.Transactions[0].ContainerID != testSavingsContainerID {
		t.Fatalf("transactions = %#v, want container_id in get response", response.Transactions)
	}
	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("mock expectations: %v", err)
	}
}

func TestGetTransactionsReturnsContainerID(t *testing.T) {
	gin.SetMode(gin.TestMode)
	createdAt := time.Date(2026, time.May, 31, 10, 0, 0, 0, time.UTC)

	mock, err := pgxmock.NewPool()
	if err != nil {
		t.Fatalf("pgxmock.NewPool() error = %v", err)
	}
	defer mock.Close()

	mock.ExpectQuery(`SELECT id FROM savings_goals`).
		WithArgs(testSavingsGoalID, testSavingsAccountID).
		WillReturnRows(mock.NewRows([]string{"id"}).AddRow(testSavingsGoalID))
	mock.ExpectQuery(`SELECT COUNT\(\*\) FROM savings_goal_transactions`).
		WithArgs(testSavingsGoalID).
		WillReturnRows(mock.NewRows([]string{"count"}).AddRow(1))
	mock.ExpectQuery(`SELECT[\s\S]*container_id,[\s\S]*FROM savings_goal_transactions`).
		WithArgs(testSavingsGoalID, 20, 0).
		WillReturnRows(mock.NewRows([]string{"id", "amount", "transaction_type", "description", "container_id", "date", "created_at"}).
			AddRow(testTransactionID, 50.0, "deposit", (*string)(nil), stringPtr(testSavingsContainerID), "2026-05-31", createdAt.Format(time.RFC3339)))

	recorder := httptest.NewRecorder()
	router := savingsTestRouter(http.MethodGet, "/savings-goals/:id/transactions", GetTransactions(mock))
	req := httptest.NewRequest(http.MethodGet, "/savings-goals/"+testSavingsGoalID+"/transactions", nil)

	router.ServeHTTP(recorder, req)

	if recorder.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d, body = %s", recorder.Code, http.StatusOK, recorder.Body.String())
	}
	var response GetTransactionsResponse
	if err := json.Unmarshal(recorder.Body.Bytes(), &response); err != nil {
		t.Fatalf("json.Unmarshal() error = %v", err)
	}
	if len(response.Transactions) != 1 || response.Transactions[0].ContainerID == nil || *response.Transactions[0].ContainerID != testSavingsContainerID {
		t.Fatalf("transactions = %#v, want container_id contract", response.Transactions)
	}
	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("mock expectations: %v", err)
	}
}

func TestListSavingsGoalsReturnsPlaceContractAndLegacyCompatibility(t *testing.T) {
	gin.SetMode(gin.TestMode)
	mock, err := pgxmock.NewPool()
	if err != nil {
		t.Fatalf("pgxmock.NewPool() error = %v", err)
	}
	defer mock.Close()

	createdAt := time.Date(2026, time.May, 31, 10, 0, 0, 0, time.UTC)
	mock.ExpectQuery(`FROM savings_goals sg[\s\S]*LEFT JOIN payment_containers`).
		WithArgs(testSavingsAccountID).
		WillReturnRows(mock.NewRows([]string{"id", "account_id", "name", "description", "target_amount", "current_amount", "currency", "saved_in", "saved_container_id", "saved_container_name", "deadline", "is_active", "created_at", "updated_at"}).
			AddRow(testSavingsGoalID, testSavingsAccountID, "Legacy goal", (*string)(nil), 1000.0, 100.0, "ARS", stringPtr("Mercado Pago"), (*string)(nil), (*string)(nil), (*time.Time)(nil), true, createdAt, createdAt).
			AddRow("66666666-6666-6666-6666-666666666666", testSavingsAccountID, "Assigned goal", (*string)(nil), 2000.0, 500.0, "ARS", (*string)(nil), stringPtr(testSavingsContainerID), stringPtr("Bank"), (*time.Time)(nil), true, createdAt, createdAt))

	recorder := httptest.NewRecorder()
	router := savingsTestRouter(http.MethodGet, "/savings-goals", ListSavingsGoals(mock))
	req := httptest.NewRequest(http.MethodGet, "/savings-goals", nil)

	router.ServeHTTP(recorder, req)

	if recorder.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d, body = %s", recorder.Code, http.StatusOK, recorder.Body.String())
	}
	var response struct {
		SavingsGoals []SavingsGoalResponse `json:"savings_goals"`
	}
	if err := json.Unmarshal(recorder.Body.Bytes(), &response); err != nil {
		t.Fatalf("json.Unmarshal() error = %v", err)
	}
	if response.SavingsGoals[0].StorageStatus != "unassigned" || response.SavingsGoals[0].SavedIn == nil || *response.SavingsGoals[0].SavedIn != "Mercado Pago" {
		t.Fatalf("legacy goal = %#v, want readable saved_in and unassigned status", response.SavingsGoals[0])
	}
	if response.SavingsGoals[1].StorageStatus != "assigned" || response.SavingsGoals[1].SavedContainerName == nil || *response.SavingsGoals[1].SavedContainerName != "Bank" {
		t.Fatalf("assigned goal = %#v, want assigned place contract", response.SavingsGoals[1])
	}
}

func TestAddFundsSnapshotsRequestContainerAttribution(t *testing.T) {
	gin.SetMode(gin.TestMode)
	mock, err := pgxmock.NewPool()
	if err != nil {
		t.Fatalf("pgxmock.NewPool() error = %v", err)
	}
	defer mock.Close()

	createdAt := time.Date(2026, time.May, 31, 10, 0, 0, 0, time.UTC)
	mock.ExpectQuery(`SELECT name FROM payment_containers`).
		WithArgs(testAltContainerID, testSavingsAccountID).
		WillReturnRows(mock.NewRows([]string{"name"}).AddRow("Wallet"))
	mock.ExpectQuery(`SELECT deadline FROM savings_goals`).
		WithArgs(testSavingsGoalID, testSavingsAccountID).
		WillReturnRows(mock.NewRows([]string{"deadline"}).AddRow((*time.Time)(nil)))
	mock.ExpectBegin()
	mock.ExpectQuery(`SELECT name, current_amount, target_amount, deadline, saved_container_id FROM savings_goals`).
		WithArgs(testSavingsGoalID, testSavingsAccountID).
		WillReturnRows(mock.NewRows([]string{"name", "current_amount", "target_amount", "deadline", "saved_container_id"}).AddRow("Trip", 100.0, 1000.0, (*time.Time)(nil), stringPtr(testSavingsContainerID)))
	mock.ExpectQuery(`INSERT INTO savings_goal_transactions`).
		WithArgs(testSavingsGoalID, 50.0, pgxmock.AnyArg(), "2026-05-31", stringPtr(testAltContainerID)).
		WillReturnRows(mock.NewRows([]string{"id", "created_at"}).AddRow(testTransactionID, createdAt))
	mock.ExpectQuery(`UPDATE savings_goals`).
		WithArgs(150.0, testSavingsGoalID).
		WillReturnRows(mock.NewRows([]string{"current_amount", "updated_at"}).AddRow(150.0, createdAt))
	mock.ExpectCommit()

	recorder := httptest.NewRecorder()
	router := savingsTestRouter(http.MethodPost, "/savings-goals/:id/add-funds", AddFunds(mock))
	req := httptest.NewRequest(http.MethodPost, "/savings-goals/"+testSavingsGoalID+"/add-funds", bytes.NewBufferString(`{"amount":50,"date":"2026-05-31","container_id":"`+testAltContainerID+`"}`))
	req.Header.Set("Content-Type", "application/json")

	router.ServeHTTP(recorder, req)

	if recorder.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d, body = %s", recorder.Code, http.StatusOK, recorder.Body.String())
	}
	var response struct {
		Transaction struct {
			ContainerID *string `json:"container_id"`
		} `json:"transaction"`
	}
	if err := json.Unmarshal(recorder.Body.Bytes(), &response); err != nil {
		t.Fatalf("json.Unmarshal() error = %v", err)
	}
	if response.Transaction.ContainerID == nil || *response.Transaction.ContainerID != testAltContainerID {
		t.Fatalf("transaction container = %#v, want request override snapshot", response.Transaction.ContainerID)
	}
}

func TestSavingsGoalOperationsDefaultToGoalAttribution(t *testing.T) {
	gin.SetMode(gin.TestMode)
	createdAt := time.Date(2026, time.May, 31, 10, 0, 0, 0, time.UTC)

	tests := []struct {
		name            string
		methodPath      string
		handler         gin.HandlerFunc
		operation       string
		startingAmount  float64
		updatedAmount   float64
		responseAmount  float64
		wantTransaction string
	}{
		{
			name:            "add funds uses goal place when request omits container",
			methodPath:      "/savings-goals/:id/add-funds",
			handler:         nil,
			operation:       "deposit",
			startingAmount:  100,
			updatedAmount:   150,
			responseAmount:  50,
			wantTransaction: "deposit",
		},
		{
			name:            "withdraw funds uses goal place when request omits container",
			methodPath:      "/savings-goals/:id/withdraw-funds",
			handler:         nil,
			operation:       "withdrawal",
			startingAmount:  100,
			updatedAmount:   50,
			responseAmount:  -50,
			wantTransaction: "withdrawal",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mock, err := pgxmock.NewPool()
			if err != nil {
				t.Fatalf("pgxmock.NewPool() error = %v", err)
			}
			defer mock.Close()

			mock.ExpectQuery(`SELECT deadline FROM savings_goals`).
				WithArgs(testSavingsGoalID, testSavingsAccountID).
				WillReturnRows(mock.NewRows([]string{"deadline"}).AddRow((*time.Time)(nil)))
			mock.ExpectBegin()
			mock.ExpectQuery(`SELECT name, current_amount, target_amount, deadline, saved_container_id FROM savings_goals`).
				WithArgs(testSavingsGoalID, testSavingsAccountID).
				WillReturnRows(mock.NewRows([]string{"name", "current_amount", "target_amount", "deadline", "saved_container_id"}).AddRow("Trip", tt.startingAmount, 1000.0, (*time.Time)(nil), stringPtr(testSavingsContainerID)))
			mock.ExpectQuery(`INSERT INTO savings_goal_transactions`).
				WithArgs(testSavingsGoalID, 50.0, pgxmock.AnyArg(), "2026-05-31", stringPtr(testSavingsContainerID)).
				WillReturnRows(mock.NewRows([]string{"id", "created_at"}).AddRow(testTransactionID, createdAt))
			mock.ExpectQuery(`UPDATE savings_goals`).
				WithArgs(tt.updatedAmount, testSavingsGoalID).
				WillReturnRows(mock.NewRows([]string{"current_amount", "updated_at"}).AddRow(tt.updatedAmount, createdAt))
			mock.ExpectCommit()

			handler := AddFunds(mock)
			path := "/savings-goals/" + testSavingsGoalID + "/add-funds"
			if tt.operation == "withdrawal" {
				handler = WithdrawFunds(mock)
				path = "/savings-goals/" + testSavingsGoalID + "/withdraw-funds"
			}

			recorder := httptest.NewRecorder()
			router := savingsTestRouter(http.MethodPost, tt.methodPath, handler)
			req := httptest.NewRequest(http.MethodPost, path, bytes.NewBufferString(`{"amount":50,"date":"2026-05-31"}`))
			req.Header.Set("Content-Type", "application/json")

			router.ServeHTTP(recorder, req)

			if recorder.Code != http.StatusOK {
				t.Fatalf("status = %d, want %d, body = %s", recorder.Code, http.StatusOK, recorder.Body.String())
			}
			var response struct {
				Transaction struct {
					Amount          float64 `json:"amount"`
					TransactionType string  `json:"transaction_type"`
					ContainerID     *string `json:"container_id"`
				} `json:"transaction"`
			}
			if err := json.Unmarshal(recorder.Body.Bytes(), &response); err != nil {
				t.Fatalf("json.Unmarshal() error = %v", err)
			}
			if response.Transaction.TransactionType != tt.wantTransaction || response.Transaction.Amount != tt.responseAmount {
				t.Fatalf("transaction = %#v, want type %q amount %v", response.Transaction, tt.wantTransaction, tt.responseAmount)
			}
			if response.Transaction.ContainerID == nil || *response.Transaction.ContainerID != testSavingsContainerID {
				t.Fatalf("container_id = %#v, want goal place attribution", response.Transaction.ContainerID)
			}
			if err := mock.ExpectationsWereMet(); err != nil {
				t.Fatalf("mock expectations: %v", err)
			}
		})
	}
}

func TestWithdrawFundsSnapshotsRequestContainerAttribution(t *testing.T) {
	gin.SetMode(gin.TestMode)
	mock, err := pgxmock.NewPool()
	if err != nil {
		t.Fatalf("pgxmock.NewPool() error = %v", err)
	}
	defer mock.Close()

	createdAt := time.Date(2026, time.May, 31, 10, 0, 0, 0, time.UTC)
	mock.ExpectQuery(`SELECT name FROM payment_containers`).
		WithArgs(testAltContainerID, testSavingsAccountID).
		WillReturnRows(mock.NewRows([]string{"name"}).AddRow("Wallet"))
	mock.ExpectQuery(`SELECT deadline FROM savings_goals`).
		WithArgs(testSavingsGoalID, testSavingsAccountID).
		WillReturnRows(mock.NewRows([]string{"deadline"}).AddRow((*time.Time)(nil)))
	mock.ExpectBegin()
	mock.ExpectQuery(`SELECT name, current_amount, target_amount, deadline, saved_container_id FROM savings_goals`).
		WithArgs(testSavingsGoalID, testSavingsAccountID).
		WillReturnRows(mock.NewRows([]string{"name", "current_amount", "target_amount", "deadline", "saved_container_id"}).AddRow("Trip", 100.0, 1000.0, (*time.Time)(nil), stringPtr(testSavingsContainerID)))
	mock.ExpectQuery(`INSERT INTO savings_goal_transactions`).
		WithArgs(testSavingsGoalID, 50.0, pgxmock.AnyArg(), "2026-05-31", stringPtr(testAltContainerID)).
		WillReturnRows(mock.NewRows([]string{"id", "created_at"}).AddRow(testTransactionID, createdAt))
	mock.ExpectQuery(`UPDATE savings_goals`).
		WithArgs(50.0, testSavingsGoalID).
		WillReturnRows(mock.NewRows([]string{"current_amount", "updated_at"}).AddRow(50.0, createdAt))
	mock.ExpectCommit()

	recorder := httptest.NewRecorder()
	router := savingsTestRouter(http.MethodPost, "/savings-goals/:id/withdraw-funds", WithdrawFunds(mock))
	req := httptest.NewRequest(http.MethodPost, "/savings-goals/"+testSavingsGoalID+"/withdraw-funds", bytes.NewBufferString(`{"amount":50,"date":"2026-05-31","container_id":"`+testAltContainerID+`"}`))
	req.Header.Set("Content-Type", "application/json")

	router.ServeHTTP(recorder, req)

	if recorder.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d, body = %s", recorder.Code, http.StatusOK, recorder.Body.String())
	}
	var response struct {
		Transaction struct {
			Amount      float64 `json:"amount"`
			ContainerID *string `json:"container_id"`
		} `json:"transaction"`
	}
	if err := json.Unmarshal(recorder.Body.Bytes(), &response); err != nil {
		t.Fatalf("json.Unmarshal() error = %v", err)
	}
	if response.Transaction.Amount != -50 || response.Transaction.ContainerID == nil || *response.Transaction.ContainerID != testAltContainerID {
		t.Fatalf("transaction = %#v, want withdraw request override snapshot", response.Transaction)
	}
	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("mock expectations: %v", err)
	}
}

func savingsTestRouter(method, path string, handler gin.HandlerFunc) *gin.Engine {
	router := gin.New()
	router.Use(func(c *gin.Context) {
		c.Set("account_id", testSavingsAccountID)
		c.Next()
	})
	switch method {
	case http.MethodPost:
		router.POST(path, handler)
	case http.MethodGet:
		router.GET(path, handler)
	case http.MethodPut:
		router.PUT(path, handler)
	}
	return router
}

func expectedContainerArg(assigned bool) *string {
	if !assigned {
		return nil
	}
	return stringPtr(testSavingsContainerID)
}

func stringPtr(value string) *string { return &value }

func sameStringPtr(got, want *string) bool {
	if got == nil || want == nil {
		return got == want
	}
	return *got == *want
}

func assertSavingsError(t *testing.T, body []byte, want string) {
	t.Helper()
	var response map[string]string
	if err := json.Unmarshal(body, &response); err != nil {
		t.Fatalf("json.Unmarshal() error = %v", err)
	}
	if response["error"] != want {
		t.Fatalf("error = %q, want %q", response["error"], want)
	}
}
