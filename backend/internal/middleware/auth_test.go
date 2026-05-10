package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/LorenzoCampos/avaltra/pkg/auth"
	"github.com/gin-gonic/gin"
)

func TestAuthMiddlewareRequiresAccessToken(t *testing.T) {
	gin.SetMode(gin.TestMode)
	secret := "test-secret"
	accessToken, err := auth.GenerateAccessToken("user-1", "user@example.com", secret, time.Minute)
	if err != nil {
		t.Fatalf("GenerateAccessToken() error = %v", err)
	}
	refreshToken, err := auth.GenerateRefreshToken("user-1", secret, time.Hour)
	if err != nil {
		t.Fatalf("GenerateRefreshToken() error = %v", err)
	}

	tests := []struct {
		name       string
		token      string
		wantStatus int
	}{
		{name: "accepts access token", token: accessToken, wantStatus: http.StatusOK},
		{name: "rejects refresh token", token: refreshToken, wantStatus: http.StatusUnauthorized},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			router := gin.New()
			router.GET("/protected", AuthMiddleware(secret), func(c *gin.Context) {
				c.Status(http.StatusOK)
			})

			recorder := httptest.NewRecorder()
			req := httptest.NewRequest(http.MethodGet, "/protected", nil)
			req.Header.Set("Authorization", "Bearer "+tt.token)
			router.ServeHTTP(recorder, req)

			if recorder.Code != tt.wantStatus {
				t.Fatalf("status = %d, want %d", recorder.Code, tt.wantStatus)
			}
		})
	}
}
