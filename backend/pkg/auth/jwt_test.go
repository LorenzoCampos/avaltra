package auth

import (
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

func TestJWTTokenTypeValidation(t *testing.T) {
	secret := "test-secret"
	accessToken, err := GenerateAccessToken("user-1", "user@example.com", secret, time.Minute)
	if err != nil {
		t.Fatalf("GenerateAccessToken() error = %v", err)
	}
	refreshToken, err := GenerateRefreshToken("user-1", secret, time.Hour)
	if err != nil {
		t.Fatalf("GenerateRefreshToken() error = %v", err)
	}
	legacyToken, err := jwt.NewWithClaims(jwt.SigningMethodHS256, Claims{
		UserID: "user-1",
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			Issuer:    "avaltra",
		},
	}).SignedString([]byte(secret))
	if err != nil {
		t.Fatalf("legacy token SignedString() error = %v", err)
	}

	tests := []struct {
		name      string
		token     string
		validator func(string, string) (*Claims, error)
		wantErr   bool
	}{
		{name: "access accepts access token", token: accessToken, validator: ValidateAccessToken},
		{name: "access rejects refresh token", token: refreshToken, validator: ValidateAccessToken, wantErr: true},
		{name: "refresh accepts refresh token", token: refreshToken, validator: ValidateRefreshToken},
		{name: "refresh rejects access token", token: accessToken, validator: ValidateRefreshToken, wantErr: true},
		{name: "access rejects legacy token without type", token: legacyToken, validator: ValidateAccessToken, wantErr: true},
		{name: "refresh rejects legacy token without type", token: legacyToken, validator: ValidateRefreshToken, wantErr: true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, err := tt.validator(tt.token, secret)
			if (err != nil) != tt.wantErr {
				t.Fatalf("validator() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}
