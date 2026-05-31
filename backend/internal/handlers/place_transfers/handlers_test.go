package place_transfers

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
	testAccountID     = "11111111-1111-1111-1111-111111111111"
	testTransferID    = "22222222-2222-2222-2222-222222222222"
	testSourcePlaceID = "33333333-3333-3333-3333-333333333333"
	testDestPlaceID   = "44444444-4444-4444-4444-444444444444"
)

func TestCreatePlaceTransferScenarios(t *testing.T) {
	gin.SetMode(gin.TestMode)
	createdAt := time.Date(2026, time.May, 29, 10, 0, 0, 0, time.UTC)

	tests := []struct {
		name            string
		body            string
		activePlaceRows int
		wantStatus      int
		wantError       string
		expectInsert    bool
	}{
		{name: "valid transfer is persisted", body: `{"source_container_id":"` + testSourcePlaceID + `","destination_container_id":"` + testDestPlaceID + `","amount":123.45,"date":"2026-05-29","note":"Ahorro","currency":"ARS"}`, activePlaceRows: 2, wantStatus: http.StatusCreated, expectInsert: true},
		{name: "missing source is rejected", body: `{"destination_container_id":"` + testDestPlaceID + `","amount":123.45,"date":"2026-05-29"}`, wantStatus: http.StatusBadRequest, wantError: "source-place-required"},
		{name: "missing destination is rejected", body: `{"source_container_id":"` + testSourcePlaceID + `","amount":123.45,"date":"2026-05-29"}`, wantStatus: http.StatusBadRequest, wantError: "destination-place-required"},
		{name: "same source and destination is rejected", body: `{"source_container_id":"` + testSourcePlaceID + `","destination_container_id":"` + testSourcePlaceID + `","amount":123.45,"date":"2026-05-29"}`, wantStatus: http.StatusBadRequest, wantError: "source-destination-must-differ"},
		{name: "inactive or cross-account place is rejected", body: `{"source_container_id":"` + testSourcePlaceID + `","destination_container_id":"` + testDestPlaceID + `","amount":123.45,"date":"2026-05-29"}`, activePlaceRows: 1, wantStatus: http.StatusBadRequest, wantError: "invalid-place-account"},
		{name: "non ARS currency is rejected", body: `{"source_container_id":"` + testSourcePlaceID + `","destination_container_id":"` + testDestPlaceID + `","amount":123.45,"date":"2026-05-29","currency":"USD"}`, wantStatus: http.StatusBadRequest, wantError: "currency-mismatch-not-supported"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mock, err := pgxmock.NewPool()
			if err != nil {
				t.Fatalf("pgxmock.NewPool() error = %v", err)
			}
			defer mock.Close()

			if tt.activePlaceRows > 0 || tt.expectInsert {
				mock.ExpectQuery(regexp.QuoteMeta(`SELECT COUNT(*) FROM payment_containers WHERE account_id = $1 AND is_active = true AND id IN ($2, $3)`)).
					WithArgs(testAccountID, testSourcePlaceID, testDestPlaceID).
					WillReturnRows(mock.NewRows([]string{"count"}).AddRow(tt.activePlaceRows))
			}
			if tt.expectInsert {
				mock.ExpectQuery(`INSERT INTO place_transfers`).
					WithArgs(testAccountID, testSourcePlaceID, testDestPlaceID, 123.45, "ARS", transferDate("2026-05-29"), stringPtr("Ahorro")).
					WillReturnRows(mockTransferRows(createdAt).AddRow(testTransferID, testAccountID, testSourcePlaceID, "Caja", testDestPlaceID, "Banco", 123.45, "ARS", transferDate("2026-05-29"), "Ahorro", createdAt, createdAt))
			}

			recorder := httptest.NewRecorder()
			router := transferTestRouter(CreatePlaceTransfer(mock))
			req := httptest.NewRequest(http.MethodPost, "/place-transfers", bytes.NewBufferString(tt.body))
			req.Header.Set("Content-Type", "application/json")

			router.ServeHTTP(recorder, req)

			if recorder.Code != tt.wantStatus {
				t.Fatalf("status = %d, want %d, body = %s", recorder.Code, tt.wantStatus, recorder.Body.String())
			}
			if tt.wantError != "" {
				assertErrorResponse(t, recorder.Body.Bytes(), tt.wantError)
			}
			if tt.expectInsert {
				var response PlaceTransferResponse
				if err := json.Unmarshal(recorder.Body.Bytes(), &response); err != nil {
					t.Fatalf("json.Unmarshal() error = %v", err)
				}
				if response.SourceContainerName != "Caja" || response.DestinationContainerName != "Banco" || response.Amount != 123.45 || response.Currency != "ARS" {
					t.Fatalf("response = %#v, want transfer details", response)
				}
			}
			if err := mock.ExpectationsWereMet(); err != nil {
				t.Fatalf("mock expectations: %v", err)
			}
		})
	}
}

func TestListPlaceTransfersReturnsActiveAccountTransfers(t *testing.T) {
	gin.SetMode(gin.TestMode)
	createdAt := time.Date(2026, time.May, 29, 10, 0, 0, 0, time.UTC)
	mock, err := pgxmock.NewPool()
	if err != nil {
		t.Fatalf("pgxmock.NewPool() error = %v", err)
	}
	defer mock.Close()

	mock.ExpectQuery(`FROM place_transfers pt[\s\S]*pt\.account_id = \$1 AND pt\.deleted_at IS NULL`).
		WithArgs(testAccountID).
		WillReturnRows(mockTransferRows(createdAt).AddRow(testTransferID, testAccountID, testSourcePlaceID, "Caja", testDestPlaceID, "Banco", 123.45, "ARS", transferDate("2026-05-29"), nil, createdAt, createdAt))

	recorder := httptest.NewRecorder()
	router := transferTestRouter(ListPlaceTransfers(mock))
	req := httptest.NewRequest(http.MethodGet, "/place-transfers", nil)

	router.ServeHTTP(recorder, req)

	if recorder.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d, body = %s", recorder.Code, http.StatusOK, recorder.Body.String())
	}
	var response struct {
		PlaceTransfers []PlaceTransferResponse `json:"place_transfers"`
		Count          int                     `json:"count"`
	}
	if err := json.Unmarshal(recorder.Body.Bytes(), &response); err != nil {
		t.Fatalf("json.Unmarshal() error = %v", err)
	}
	if response.Count != 1 || response.PlaceTransfers[0].SourceContainerName != "Caja" || response.PlaceTransfers[0].DestinationContainerName != "Banco" {
		t.Fatalf("response = %#v, want one Caja to Banco transfer", response)
	}
}

func TestCancelPlaceTransferScenarios(t *testing.T) {
	gin.SetMode(gin.TestMode)
	canceledAt := time.Date(2026, time.May, 30, 12, 0, 0, 0, time.UTC)

	tests := []struct {
		name       string
		transferID string
		mockRows   *pgxmock.Rows
		mockErr    error
		wantStatus int
		wantError  string
	}{
		{
			name:       "active transfer is soft canceled",
			transferID: testTransferID,
			mockRows:   pgxmock.NewRows([]string{"id", "status", "deleted_at"}).AddRow(testTransferID, "canceled", canceledAt),
			wantStatus: http.StatusOK,
		},
		{
			name:       "already canceled transfer returns idempotent success",
			transferID: testTransferID,
			mockRows:   pgxmock.NewRows([]string{"id", "status", "deleted_at"}).AddRow(testTransferID, "canceled", canceledAt),
			wantStatus: http.StatusOK,
		},
		{
			name:       "missing or cross-account transfer returns not found",
			transferID: testTransferID,
			mockErr:    pgx.ErrNoRows,
			wantStatus: http.StatusNotFound,
			wantError:  "Transferencia entre lugares no encontrada",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mock, err := pgxmock.NewPool()
			if err != nil {
				t.Fatalf("pgxmock.NewPool() error = %v", err)
			}
			defer mock.Close()

			expectation := mock.ExpectQuery(`UPDATE place_transfers[\s\S]*SET deleted_at = COALESCE\(deleted_at, NOW\(\)\), updated_at = NOW\(\)[\s\S]*WHERE id = \$1 AND account_id = \$2[\s\S]*RETURNING id, 'canceled', deleted_at`).
				WithArgs(tt.transferID, testAccountID)
			if tt.mockErr != nil {
				expectation.WillReturnError(tt.mockErr)
			} else {
				expectation.WillReturnRows(tt.mockRows)
			}

			recorder := httptest.NewRecorder()
			router := transferTestRouter(CancelPlaceTransfer(mock))
			req := httptest.NewRequest(http.MethodPatch, "/place-transfers/"+tt.transferID+"/cancel", nil)

			router.ServeHTTP(recorder, req)

			if recorder.Code != tt.wantStatus {
				t.Fatalf("status = %d, want %d, body = %s", recorder.Code, tt.wantStatus, recorder.Body.String())
			}
			if tt.wantError != "" {
				assertErrorResponse(t, recorder.Body.Bytes(), tt.wantError)
			} else {
				var response CancelPlaceTransferResponse
				if err := json.Unmarshal(recorder.Body.Bytes(), &response); err != nil {
					t.Fatalf("json.Unmarshal() error = %v", err)
				}
				if response.ID != tt.transferID || response.Status != "canceled" || !response.CanceledAt.Equal(canceledAt) {
					t.Fatalf("response = %#v, want canceled transfer outcome", response)
				}
			}
			if err := mock.ExpectationsWereMet(); err != nil {
				t.Fatalf("mock expectations: %v", err)
			}
		})
	}
}

func transferTestRouter(handler gin.HandlerFunc) *gin.Engine {
	router := gin.New()
	router.Use(func(c *gin.Context) {
		c.Set("account_id", testAccountID)
		c.Next()
	})
	router.POST("/place-transfers", handler)
	router.GET("/place-transfers", handler)
	router.PATCH("/place-transfers/:id/cancel", handler)
	return router
}

func mockTransferRows(createdAt time.Time) *pgxmock.Rows {
	return pgxmock.NewRows([]string{"id", "account_id", "source_container_id", "source_container_name", "destination_container_id", "destination_container_name", "amount", "currency", "date", "note", "created_at", "updated_at"})
}

func transferDate(value string) time.Time {
	parsed, _ := time.Parse("2006-01-02", value)
	return parsed
}

func stringPtr(value string) *string { return &value }

func assertErrorResponse(t *testing.T, body []byte, want string) {
	t.Helper()
	var response map[string]string
	if err := json.Unmarshal(body, &response); err != nil {
		t.Fatalf("json.Unmarshal() error = %v", err)
	}
	if response["error"] != want {
		t.Fatalf("error = %q, want %q", response["error"], want)
	}
}
