package incomes

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/pashagolub/pgxmock/v5"
)

func TestListIncomesPaginationContract(t *testing.T) {
	gin.SetMode(gin.TestMode)

	tests := []struct {
		name          string
		path          string
		totalCount    int
		expectedPage  int
		expectedLimit int
		expectedPages int
		expectedArgs  []any
	}{
		{
			name:          "defaults to first page and default limit",
			path:          "/incomes",
			totalCount:    45,
			expectedPage:  1,
			expectedLimit: 20,
			expectedPages: 3,
			expectedArgs:  []any{testIncomeAccountID, 20, 0},
		},
		{
			name:          "caps limit at max and applies offset",
			path:          "/incomes?page=2&limit=150",
			totalCount:    250,
			expectedPage:  2,
			expectedLimit: 100,
			expectedPages: 3,
			expectedArgs:  []any{testIncomeAccountID, 100, 100},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mock, err := pgxmock.NewPool()
			if err != nil {
				t.Fatalf("pgxmock.NewPool() error = %v", err)
			}
			defer mock.Close()

			mock.ExpectQuery(`SELECT COUNT\(\*\) FROM incomes i WHERE`).
				WithArgs(testIncomeAccountID).
				WillReturnRows(mock.NewRows([]string{"count"}).AddRow(tt.totalCount))
			mock.ExpectQuery(`(?s)SELECT i\.id.*LIMIT \$2 OFFSET \$3`).
				WithArgs(tt.expectedArgs...).
				WillReturnRows(incomeListRows(mock))

			recorder := httptest.NewRecorder()
			router := incomeTestRouter(listIncomesHandler(mock))
			req := httptest.NewRequest(http.MethodGet, tt.path, nil)
			router.ServeHTTP(recorder, req)

			if recorder.Code != http.StatusOK {
				t.Fatalf("status = %d, want %d, body = %s", recorder.Code, http.StatusOK, recorder.Body.String())
			}

			var response struct {
				Incomes    []map[string]any `json:"incomes"`
				TotalCount int              `json:"total_count"`
				Page       int              `json:"page"`
				Limit      int              `json:"limit"`
				TotalPages int              `json:"total_pages"`
			}
			if err := json.Unmarshal(recorder.Body.Bytes(), &response); err != nil {
				t.Fatalf("json.Unmarshal() error = %v", err)
			}

			if response.TotalCount != tt.totalCount {
				t.Fatalf("total_count = %d, want %d", response.TotalCount, tt.totalCount)
			}
			if response.Page != tt.expectedPage {
				t.Fatalf("page = %d, want %d", response.Page, tt.expectedPage)
			}
			if response.Limit != tt.expectedLimit {
				t.Fatalf("limit = %d, want %d", response.Limit, tt.expectedLimit)
			}
			if response.TotalPages != tt.expectedPages {
				t.Fatalf("total_pages = %d, want %d", response.TotalPages, tt.expectedPages)
			}
			if len(response.Incomes) != 0 {
				t.Fatalf("len(incomes) = %d, want 0", len(response.Incomes))
			}

			if err := mock.ExpectationsWereMet(); err != nil {
				t.Fatalf("mock expectations: %v", err)
			}
		})
	}
}

func TestListIncomesPaginationPreservesFilterArgs(t *testing.T) {
	gin.SetMode(gin.TestMode)

	mock, err := pgxmock.NewPool()
	if err != nil {
		t.Fatalf("pgxmock.NewPool() error = %v", err)
	}
	defer mock.Close()

	categoryID := "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"
	familyMemberID := "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"
	args := []any{testIncomeAccountID, "2026-01-01", "2026-01-31", "one-time", categoryID, familyMemberID}

	mock.ExpectQuery(`SELECT COUNT\(\*\) FROM incomes i WHERE`).
		WithArgs(args...).
		WillReturnRows(mock.NewRows([]string{"count"}).AddRow(101))
	mock.ExpectQuery(`(?s)SELECT i\.id.*ORDER BY i\.amount ASC.*LIMIT \$7 OFFSET \$8`).
		WithArgs(append(args, 10, 20)...).
		WillReturnRows(incomeListRows(mock))

	recorder := httptest.NewRecorder()
	router := incomeTestRouter(listIncomesHandler(mock))
	req := httptest.NewRequest(http.MethodGet, "/incomes?date_from=2026-01-01&date_to=2026-01-31&income_type=one-time&category_id="+categoryID+"&family_member_id="+familyMemberID+"&sort_by=amount&order=asc&page=3&limit=10", nil)
	router.ServeHTTP(recorder, req)

	if recorder.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d, body = %s", recorder.Code, http.StatusOK, recorder.Body.String())
	}

	var response struct {
		TotalCount int `json:"total_count"`
		Page       int `json:"page"`
		Limit      int `json:"limit"`
		TotalPages int `json:"total_pages"`
	}
	if err := json.Unmarshal(recorder.Body.Bytes(), &response); err != nil {
		t.Fatalf("json.Unmarshal() error = %v", err)
	}
	if response.TotalCount != 101 || response.Page != 3 || response.Limit != 10 || response.TotalPages != 11 {
		t.Fatalf("pagination metadata = %+v, want total_count=101 page=3 limit=10 total_pages=11", response)
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("mock expectations: %v", err)
	}
}

func incomeListRows(mock pgxmock.PgxPoolIface) *pgxmock.Rows {
	return mock.NewRows([]string{"id", "family_member_id", "category_id", "category_name", "description", "amount", "currency", "exchange_rate", "amount_in_primary_currency", "income_type", "date", "end_date", "payment_method", "destination_container_id", "destination_instrument_id", "container_name", "container_type", "instrument_name", "instrument_type", "created_at"})
}
