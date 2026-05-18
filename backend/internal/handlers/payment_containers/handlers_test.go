package payment_containers

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
	testAccountID          = "11111111-1111-1111-1111-111111111111"
	testContainerID        = "22222222-2222-2222-2222-222222222222"
	testInstrumentID       = "33333333-3333-3333-3333-333333333333"
	testBackingContainerID = "44444444-4444-4444-4444-444444444444"
)

func TestCreatePaymentContainerScenarios(t *testing.T) {
	gin.SetMode(gin.TestMode)
	createdAt := time.Date(2026, time.May, 17, 10, 0, 0, 0, time.UTC)

	tests := []struct {
		name         string
		body         string
		wantStatus   int
		wantKind     string
		expectInsert bool
	}{
		{name: "bank container is created", body: `{"name":"Cuenta sueldo","kind":"bank","institution_name":"Banco Nación"}`, wantStatus: http.StatusCreated, wantKind: "bank", expectInsert: true},
		{name: "wallet container is created", body: `{"name":"Mercado Pago","kind":"wallet"}`, wantStatus: http.StatusCreated, wantKind: "wallet", expectInsert: true},
		{name: "unsupported container kind is rejected", body: `{"name":"Crypto","kind":"crypto_exchange"}`, wantStatus: http.StatusBadRequest},
		{name: "blank name is rejected", body: `{"name":"   ","kind":"bank"}`, wantStatus: http.StatusBadRequest},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mock, err := pgxmock.NewPool()
			if err != nil {
				t.Fatalf("pgxmock.NewPool() error = %v", err)
			}
			defer mock.Close()

			if tt.expectInsert {
				mock.ExpectQuery(regexp.QuoteMeta(`INSERT INTO payment_containers (account_id, institution_id, name, kind, is_active)
			VALUES ($1, $2, $3, $4, true)
			RETURNING id, account_id, institution_id::TEXT, name, kind, is_active, created_at, updated_at`)).
					WithArgs(testAccountID, nilString(), anyNonBlankString(), tt.wantKind).
					WillReturnRows(mock.NewRows([]string{"id", "account_id", "institution_id", "name", "kind", "is_active", "created_at", "updated_at"}).AddRow(testContainerID, testAccountID, nil, "Cuenta sueldo", tt.wantKind, true, createdAt, createdAt))
			}

			recorder := httptest.NewRecorder()
			router := paymentContextTestRouter(CreatePaymentContainer(mock))
			req := httptest.NewRequest(http.MethodPost, "/payment-containers", bytes.NewBufferString(tt.body))
			req.Header.Set("Content-Type", "application/json")

			router.ServeHTTP(recorder, req)

			if recorder.Code != tt.wantStatus {
				t.Fatalf("status = %d, want %d, body = %s", recorder.Code, tt.wantStatus, recorder.Body.String())
			}
			if tt.wantStatus == http.StatusCreated {
				var response map[string]any
				if err := json.Unmarshal(recorder.Body.Bytes(), &response); err != nil {
					t.Fatalf("json.Unmarshal() error = %v", err)
				}
				if got := response["kind"]; got != tt.wantKind {
					t.Fatalf("kind = %#v, want %q", got, tt.wantKind)
				}
			}
			if err := mock.ExpectationsWereMet(); err != nil {
				t.Fatalf("mock expectations: %v", err)
			}
		})
	}
}

func TestCreatePaymentInstrumentRequiresBackingForCards(t *testing.T) {
	gin.SetMode(gin.TestMode)
	createdAt := time.Date(2026, time.May, 17, 10, 0, 0, 0, time.UTC)

	tests := []struct {
		name         string
		body         string
		wantStatus   int
		wantKind     string
		expectInsert bool
		exists       *bool
	}{
		{name: "credit card without backing is rejected", body: `{"name":"Visa","kind":"credit_card"}`, wantStatus: http.StatusBadRequest},
		{name: "credit card with malformed backing id is rejected", body: `{"name":"Visa","kind":"credit_card","backing_container_id":"not-a-uuid"}`, wantStatus: http.StatusBadRequest},
		{name: "credit card with backing from another account is rejected", body: `{"name":"Visa","kind":"credit_card","backing_container_id":"` + testBackingContainerID + `"}`, wantStatus: http.StatusBadRequest, exists: boolPtr(false)},
		{name: "credit card with backing is created", body: `{"name":"Visa","kind":"credit_card","backing_container_id":"` + testBackingContainerID + `"}`, wantStatus: http.StatusCreated, wantKind: "credit_card", expectInsert: true, exists: boolPtr(true)},
		{name: "transfer instrument without backing is created", body: `{"name":"Transferencia","kind":"transfer"}`, wantStatus: http.StatusCreated, wantKind: "transfer", expectInsert: true},
		{name: "unsupported instrument kind is rejected", body: `{"name":"Prepaga","kind":"prepaid_card"}`, wantStatus: http.StatusBadRequest},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mock, err := pgxmock.NewPool()
			if err != nil {
				t.Fatalf("pgxmock.NewPool() error = %v", err)
			}
			defer mock.Close()

			if tt.exists != nil {
				mock.ExpectQuery(`SELECT EXISTS\(SELECT 1 FROM payment_containers WHERE id = \$1 AND account_id = \$2\)`).
					WithArgs(pgxmock.AnyArg(), testAccountID).
					WillReturnRows(mock.NewRows([]string{"exists"}).AddRow(*tt.exists))
			}
			if tt.expectInsert {
				if tt.exists == nil && (tt.wantKind == "credit_card" || tt.wantKind == "debit_card") {
					mock.ExpectQuery(`SELECT EXISTS\(SELECT 1 FROM payment_containers WHERE id = \$1 AND account_id = \$2\)`).
						WithArgs(pgxmock.AnyArg(), testAccountID).
						WillReturnRows(mock.NewRows([]string{"exists"}).AddRow(true))
				}
				mock.ExpectQuery(regexp.QuoteMeta(`INSERT INTO payment_instruments (account_id, institution_id, backing_container_id, name, kind, is_active)
			VALUES ($1, $2, $3, $4, $5, true)
			RETURNING id, account_id, institution_id::TEXT, backing_container_id::TEXT, name, kind, is_active, created_at, updated_at`)).
					WithArgs(testAccountID, nilString(), anyUUIDOrNil(), anyNonBlankString(), tt.wantKind).
					WillReturnRows(mock.NewRows([]string{"id", "account_id", "institution_id", "backing_container_id", "name", "kind", "is_active", "created_at", "updated_at"}).AddRow(testInstrumentID, testAccountID, nil, backingRowValue(tt.wantKind), "Visa", tt.wantKind, true, createdAt, createdAt))
			}

			recorder := httptest.NewRecorder()
			router := paymentContextTestRouter(CreatePaymentInstrument(mock))
			req := httptest.NewRequest(http.MethodPost, "/payment-instruments", bytes.NewBufferString(tt.body))
			req.Header.Set("Content-Type", "application/json")

			router.ServeHTTP(recorder, req)

			if recorder.Code != tt.wantStatus {
				t.Fatalf("status = %d, want %d, body = %s", recorder.Code, tt.wantStatus, recorder.Body.String())
			}
			if err := mock.ExpectationsWereMet(); err != nil {
				t.Fatalf("mock expectations: %v", err)
			}
		})
	}
}

func TestListPaymentContainersOnlyReturnsActiveByDefault(t *testing.T) {
	gin.SetMode(gin.TestMode)
	createdAt := time.Date(2026, time.May, 17, 10, 0, 0, 0, time.UTC)
	mock, err := pgxmock.NewPool()
	if err != nil {
		t.Fatalf("pgxmock.NewPool() error = %v", err)
	}
	defer mock.Close()

	mock.ExpectQuery(`FROM payment_containers`).
		WithArgs(testAccountID, true).
		WillReturnRows(mock.NewRows([]string{"id", "account_id", "institution_id", "name", "kind", "is_active", "created_at", "updated_at"}).AddRow(testContainerID, testAccountID, nil, "Cuenta sueldo", "bank", true, createdAt, createdAt))

	recorder := httptest.NewRecorder()
	router := paymentContextTestRouter(ListPaymentContainers(mock))
	req := httptest.NewRequest(http.MethodGet, "/payment-containers", nil)

	router.ServeHTTP(recorder, req)

	if recorder.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d, body = %s", recorder.Code, http.StatusOK, recorder.Body.String())
	}
	var response struct {
		PaymentContainers []PaymentContainerResponse `json:"payment_containers"`
		Count             int                        `json:"count"`
	}
	if err := json.Unmarshal(recorder.Body.Bytes(), &response); err != nil {
		t.Fatalf("json.Unmarshal() error = %v", err)
	}
	if len(response.PaymentContainers) != 1 || response.PaymentContainers[0].Kind != "bank" {
		t.Fatalf("payment_containers = %#v, want one bank container", response.PaymentContainers)
	}
}

func TestListPaymentInstrumentsScenarios(t *testing.T) {
	gin.SetMode(gin.TestMode)
	createdAt := time.Date(2026, time.May, 17, 10, 0, 0, 0, time.UTC)

	tests := []struct {
		name            string
		path            string
		activeOnlyArg   bool
		rows            *pgxmock.Rows
		queryErr        error
		wantStatus      int
		wantCount       int
		wantFirstKind   string
		wantFirstActive bool
	}{
		{
			name:          "active instruments are returned by default",
			path:          "/payment-instruments",
			activeOnlyArg: true,
			rows: mockInstrumentRows(createdAt).
				AddRow(testInstrumentID, testAccountID, nil, testBackingContainerID, "Visa", "credit_card", true, createdAt, createdAt),
			wantStatus:      http.StatusOK,
			wantCount:       1,
			wantFirstKind:   "credit_card",
			wantFirstActive: true,
		},
		{
			name:          "include inactive returns inactive instruments",
			path:          "/payment-instruments?include_inactive=true",
			activeOnlyArg: false,
			rows: mockInstrumentRows(createdAt).
				AddRow(testInstrumentID, testAccountID, nil, nil, "Transferencia vieja", "transfer", false, createdAt, createdAt),
			wantStatus:      http.StatusOK,
			wantCount:       1,
			wantFirstKind:   "transfer",
			wantFirstActive: false,
		},
		{
			name:          "database error is reported",
			path:          "/payment-instruments",
			activeOnlyArg: true,
			queryErr:      pgx.ErrTxClosed,
			wantStatus:    http.StatusInternalServerError,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mock, err := pgxmock.NewPool()
			if err != nil {
				t.Fatalf("pgxmock.NewPool() error = %v", err)
			}
			defer mock.Close()

			expectation := mock.ExpectQuery(`FROM payment_instruments`).WithArgs(testAccountID, tt.activeOnlyArg)
			if tt.queryErr != nil {
				expectation.WillReturnError(tt.queryErr)
			} else {
				expectation.WillReturnRows(tt.rows)
			}

			recorder := httptest.NewRecorder()
			router := paymentContextTestRouter(ListPaymentInstruments(mock))
			req := httptest.NewRequest(http.MethodGet, tt.path, nil)

			router.ServeHTTP(recorder, req)

			if recorder.Code != tt.wantStatus {
				t.Fatalf("status = %d, want %d, body = %s", recorder.Code, tt.wantStatus, recorder.Body.String())
			}
			if tt.wantStatus == http.StatusOK {
				var response struct {
					PaymentInstruments []PaymentInstrumentResponse `json:"payment_instruments"`
					Count              int                         `json:"count"`
				}
				if err := json.Unmarshal(recorder.Body.Bytes(), &response); err != nil {
					t.Fatalf("json.Unmarshal() error = %v", err)
				}
				if response.Count != tt.wantCount || len(response.PaymentInstruments) != tt.wantCount {
					t.Fatalf("response count = %d len = %d, want %d", response.Count, len(response.PaymentInstruments), tt.wantCount)
				}
				if response.PaymentInstruments[0].Kind != tt.wantFirstKind || response.PaymentInstruments[0].IsActive != tt.wantFirstActive {
					t.Fatalf("payment_instruments[0] = %#v, want kind %q active %v", response.PaymentInstruments[0], tt.wantFirstKind, tt.wantFirstActive)
				}
			}
			if err := mock.ExpectationsWereMet(); err != nil {
				t.Fatalf("mock expectations: %v", err)
			}
		})
	}
}

func TestUpdatePaymentContainerScenarios(t *testing.T) {
	gin.SetMode(gin.TestMode)
	createdAt := time.Date(2026, time.May, 17, 10, 0, 0, 0, time.UTC)
	existingInstitutionID := "55555555-5555-5555-5555-555555555555"

	tests := []struct {
		name       string
		body       string
		rowErr     error
		wantStatus int
		wantName   string
		wantKind   string
	}{
		{name: "name update preserves omitted institution", body: `{"name":" Cuenta ahorro "}`, wantStatus: http.StatusOK, wantName: "Cuenta ahorro", wantKind: "bank"},
		{name: "unsupported kind is rejected", body: `{"kind":"crypto_exchange"}`, wantStatus: http.StatusBadRequest},
		{name: "missing owned container returns not found", body: `{"name":"Cuenta ahorro"}`, rowErr: pgx.ErrNoRows, wantStatus: http.StatusNotFound},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mock, err := pgxmock.NewPool()
			if err != nil {
				t.Fatalf("pgxmock.NewPool() error = %v", err)
			}
			defer mock.Close()

			if tt.wantStatus != http.StatusBadRequest {
				expectation := mock.ExpectQuery(regexp.QuoteMeta(`UPDATE payment_containers
			SET name = COALESCE($1, name), kind = COALESCE($2, kind), institution_id = CASE WHEN $3 THEN $4 ELSE institution_id END, is_active = COALESCE($5, is_active), updated_at = NOW()
			WHERE id = $6 AND account_id = $7
			RETURNING id, account_id, institution_id::TEXT, name, kind, is_active, created_at, updated_at`)).
					WithArgs(anyNonBlankString(), nilString(), false, nilString(), nilBool(), testContainerID, testAccountID)
				if tt.rowErr != nil {
					expectation.WillReturnError(tt.rowErr)
				} else {
					expectation.WillReturnRows(mock.NewRows([]string{"id", "account_id", "institution_id", "name", "kind", "is_active", "created_at", "updated_at"}).AddRow(testContainerID, testAccountID, existingInstitutionID, tt.wantName, tt.wantKind, true, createdAt, createdAt))
				}
			}

			recorder := httptest.NewRecorder()
			router := paymentContextTestRouter(UpdatePaymentContainer(mock))
			req := httptest.NewRequest(http.MethodPut, "/payment-containers/"+testContainerID, bytes.NewBufferString(tt.body))
			req.Header.Set("Content-Type", "application/json")

			router.ServeHTTP(recorder, req)

			if recorder.Code != tt.wantStatus {
				t.Fatalf("status = %d, want %d, body = %s", recorder.Code, tt.wantStatus, recorder.Body.String())
			}
			if tt.wantStatus == http.StatusOK {
				var response PaymentContainerResponse
				if err := json.Unmarshal(recorder.Body.Bytes(), &response); err != nil {
					t.Fatalf("json.Unmarshal() error = %v", err)
				}
				if response.Name != tt.wantName || response.Kind != tt.wantKind {
					t.Fatalf("response = %#v, want name %q kind %q", response, tt.wantName, tt.wantKind)
				}
				if response.InstitutionID == nil || *response.InstitutionID != existingInstitutionID {
					t.Fatalf("institution_id = %#v, want preserved %q", response.InstitutionID, existingInstitutionID)
				}
			}
			if err := mock.ExpectationsWereMet(); err != nil {
				t.Fatalf("mock expectations: %v", err)
			}
		})
	}
}

func TestUpdatePaymentInstrumentScenarios(t *testing.T) {
	gin.SetMode(gin.TestMode)
	createdAt := time.Date(2026, time.May, 17, 10, 0, 0, 0, time.UTC)

	tests := []struct {
		name        string
		body        string
		rowErr      error
		exists      *bool
		currentKind *string
		wantStatus  int
		wantName    string
		wantKind    string
	}{
		{name: "name update preserves omitted backing container", body: `{"name":" Visa Gold "}`, wantStatus: http.StatusOK, wantName: "Visa Gold", wantKind: "credit_card"},
		{name: "unsupported instrument kind update is rejected", body: `{"kind":"prepaid_card"}`, wantStatus: http.StatusBadRequest},
		{name: "explicit null backing is rejected for card kind", body: `{"kind":"credit_card","backing_container_id":null}`, wantStatus: http.StatusBadRequest},
		{name: "explicit null backing is rejected for existing credit card when kind is omitted", body: `{"backing_container_id":null}`, currentKind: stringPtr("credit_card"), wantStatus: http.StatusBadRequest},
		{name: "explicit null backing is rejected for existing debit card when kind is omitted", body: `{"backing_container_id":null}`, currentKind: stringPtr("debit_card"), wantStatus: http.StatusBadRequest},
		{name: "card kind update without backing is rejected before database constraint", body: `{"kind":"credit_card"}`, wantStatus: http.StatusBadRequest},
		{name: "malformed backing id update is rejected", body: `{"backing_container_id":"not-a-uuid"}`, wantStatus: http.StatusBadRequest},
		{name: "backing container from another account is rejected", body: `{"backing_container_id":"` + testBackingContainerID + `"}`, exists: boolPtr(false), wantStatus: http.StatusBadRequest},
		{name: "missing owned instrument returns not found", body: `{"name":"Visa Gold"}`, rowErr: pgx.ErrNoRows, wantStatus: http.StatusNotFound},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mock, err := pgxmock.NewPool()
			if err != nil {
				t.Fatalf("pgxmock.NewPool() error = %v", err)
			}
			defer mock.Close()

			if tt.exists != nil {
				mock.ExpectQuery(`SELECT EXISTS\(SELECT 1 FROM payment_containers WHERE id = \$1 AND account_id = \$2\)`).
					WithArgs(pgxmock.AnyArg(), testAccountID).
					WillReturnRows(mock.NewRows([]string{"exists"}).AddRow(*tt.exists))
			}
			if tt.currentKind != nil {
				mock.ExpectQuery(regexp.QuoteMeta(`SELECT kind FROM payment_instruments WHERE id = $1 AND account_id = $2`)).
					WithArgs(testInstrumentID, testAccountID).
					WillReturnRows(mock.NewRows([]string{"kind"}).AddRow(*tt.currentKind))
			}
			if tt.wantStatus != http.StatusBadRequest {
				expectation := mock.ExpectQuery(regexp.QuoteMeta(`UPDATE payment_instruments
			SET name = COALESCE($1, name), kind = COALESCE($2, kind), institution_id = CASE WHEN $3 THEN $4 ELSE institution_id END, backing_container_id = CASE WHEN $5 THEN $6 ELSE backing_container_id END, is_active = COALESCE($7, is_active), updated_at = NOW()
			WHERE id = $8 AND account_id = $9
			RETURNING id, account_id, institution_id::TEXT, backing_container_id::TEXT, name, kind, is_active, created_at, updated_at`)).
					WithArgs(anyNonBlankString(), nilString(), false, nilString(), false, nilUUID(), nilBool(), testInstrumentID, testAccountID)
				if tt.rowErr != nil {
					expectation.WillReturnError(tt.rowErr)
				} else {
					expectation.WillReturnRows(mockInstrumentRows(createdAt).AddRow(testInstrumentID, testAccountID, nil, testBackingContainerID, tt.wantName, tt.wantKind, true, createdAt, createdAt))
				}
			}

			recorder := httptest.NewRecorder()
			router := paymentContextTestRouter(UpdatePaymentInstrument(mock))
			req := httptest.NewRequest(http.MethodPut, "/payment-instruments/"+testInstrumentID, bytes.NewBufferString(tt.body))
			req.Header.Set("Content-Type", "application/json")

			router.ServeHTTP(recorder, req)

			if recorder.Code != tt.wantStatus {
				t.Fatalf("status = %d, want %d, body = %s", recorder.Code, tt.wantStatus, recorder.Body.String())
			}
			if tt.wantStatus == http.StatusOK {
				var response PaymentInstrumentResponse
				if err := json.Unmarshal(recorder.Body.Bytes(), &response); err != nil {
					t.Fatalf("json.Unmarshal() error = %v", err)
				}
				if response.Name != tt.wantName || response.Kind != tt.wantKind {
					t.Fatalf("response = %#v, want name %q kind %q", response, tt.wantName, tt.wantKind)
				}
				if response.BackingContainerID == nil || *response.BackingContainerID != testBackingContainerID {
					t.Fatalf("backing_container_id = %#v, want preserved %q", response.BackingContainerID, testBackingContainerID)
				}
			}
			if err := mock.ExpectationsWereMet(); err != nil {
				t.Fatalf("mock expectations: %v", err)
			}
		})
	}
}

func TestDeactivatePaymentContainerScenarios(t *testing.T) {
	gin.SetMode(gin.TestMode)
	createdAt := time.Date(2026, time.May, 17, 10, 0, 0, 0, time.UTC)

	tests := []struct {
		name       string
		rowErr     error
		wantStatus int
	}{
		{name: "owned container is deactivated", wantStatus: http.StatusOK},
		{name: "missing owned container returns not found", rowErr: pgx.ErrNoRows, wantStatus: http.StatusNotFound},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mock, err := pgxmock.NewPool()
			if err != nil {
				t.Fatalf("pgxmock.NewPool() error = %v", err)
			}
			defer mock.Close()

			expectation := mock.ExpectQuery(`UPDATE payment_containers`).WithArgs(testContainerID, testAccountID)
			if tt.rowErr != nil {
				expectation.WillReturnError(tt.rowErr)
			} else {
				expectation.WillReturnRows(mock.NewRows([]string{"id", "account_id", "institution_id", "name", "kind", "is_active", "created_at", "updated_at"}).AddRow(testContainerID, testAccountID, nil, "Cuenta sueldo", "bank", false, createdAt, createdAt))
			}

			recorder := httptest.NewRecorder()
			router := paymentContextTestRouter(DeactivatePaymentContainer(mock))
			req := httptest.NewRequest(http.MethodPatch, "/payment-containers/"+testContainerID+"/deactivate", nil)

			router.ServeHTTP(recorder, req)

			if recorder.Code != tt.wantStatus {
				t.Fatalf("status = %d, want %d, body = %s", recorder.Code, tt.wantStatus, recorder.Body.String())
			}
			if tt.wantStatus == http.StatusOK {
				var response PaymentContainerResponse
				if err := json.Unmarshal(recorder.Body.Bytes(), &response); err != nil {
					t.Fatalf("json.Unmarshal() error = %v", err)
				}
				if response.IsActive {
					t.Fatalf("is_active = true, want false")
				}
			}
			if err := mock.ExpectationsWereMet(); err != nil {
				t.Fatalf("mock expectations: %v", err)
			}
		})
	}
}

func TestDeactivatePaymentInstrumentScenarios(t *testing.T) {
	gin.SetMode(gin.TestMode)
	createdAt := time.Date(2026, time.May, 17, 10, 0, 0, 0, time.UTC)

	tests := []struct {
		name       string
		rowErr     error
		wantStatus int
	}{
		{name: "owned instrument is deactivated", wantStatus: http.StatusOK},
		{name: "missing owned instrument returns not found", rowErr: pgx.ErrNoRows, wantStatus: http.StatusNotFound},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mock, err := pgxmock.NewPool()
			if err != nil {
				t.Fatalf("pgxmock.NewPool() error = %v", err)
			}
			defer mock.Close()

			expectation := mock.ExpectQuery(`UPDATE payment_instruments`).WithArgs(testInstrumentID, testAccountID)
			if tt.rowErr != nil {
				expectation.WillReturnError(tt.rowErr)
			} else {
				expectation.WillReturnRows(mockInstrumentRows(createdAt).AddRow(testInstrumentID, testAccountID, nil, testBackingContainerID, "Visa", "credit_card", false, createdAt, createdAt))
			}

			recorder := httptest.NewRecorder()
			router := paymentContextTestRouter(DeactivatePaymentInstrument(mock))
			req := httptest.NewRequest(http.MethodPatch, "/payment-instruments/"+testInstrumentID+"/deactivate", nil)

			router.ServeHTTP(recorder, req)

			if recorder.Code != tt.wantStatus {
				t.Fatalf("status = %d, want %d, body = %s", recorder.Code, tt.wantStatus, recorder.Body.String())
			}
			if tt.wantStatus == http.StatusOK {
				var response PaymentInstrumentResponse
				if err := json.Unmarshal(recorder.Body.Bytes(), &response); err != nil {
					t.Fatalf("json.Unmarshal() error = %v", err)
				}
				if response.IsActive {
					t.Fatalf("is_active = true, want false")
				}
			}
			if err := mock.ExpectationsWereMet(); err != nil {
				t.Fatalf("mock expectations: %v", err)
			}
		})
	}
}

func paymentContextTestRouter(handler gin.HandlerFunc) *gin.Engine {
	router := gin.New()
	router.Use(func(c *gin.Context) {
		c.Set("account_id", testAccountID)
		c.Next()
	})
	router.POST("/payment-containers", handler)
	router.POST("/payment-instruments", handler)
	router.GET("/payment-containers", handler)
	router.GET("/payment-instruments", handler)
	router.PUT("/payment-containers/:id", handler)
	router.PUT("/payment-instruments/:id", handler)
	router.PATCH("/payment-containers/:id/deactivate", handler)
	router.PATCH("/payment-instruments/:id/deactivate", handler)
	router.DELETE("/payment-containers/:id", handler)
	router.DELETE("/payment-instruments/:id", handler)
	return router
}

func nilString() *string { return nil }

func nilBool() *bool { return nil }

func nilUUID() any { return nil }

func boolPtr(value bool) *bool { return &value }

func stringPtr(value string) *string { return &value }

func anyNonBlankString() any { return pgxmock.AnyArg() }

func anyUUIDOrNil() any { return pgxmock.AnyArg() }

func backingRowValue(kind string) any {
	if kind == "credit_card" || kind == "debit_card" {
		return testBackingContainerID
	}
	return nil
}

func mockInstrumentRows(createdAt time.Time) *pgxmock.Rows {
	return pgxmock.NewRows([]string{"id", "account_id", "institution_id", "backing_container_id", "name", "kind", "is_active", "created_at", "updated_at"})
}
