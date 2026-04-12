package config

import (
	"testing"
)

func TestLoad_CORSMultipleOrigins(t *testing.T) {
	t.Setenv("CORS_ALLOWED_ORIGINS", "https://app1.com, https://app2.com")
	t.Setenv("JWT_SECRET", "test-secret")

	cfg, err := Load()
	if err != nil {
		t.Fatalf("Load() returned unexpected error: %v", err)
	}

	want := []string{"https://app1.com", "https://app2.com"}
	if len(cfg.CORSAllowedOrigins) != len(want) {
		t.Fatalf("got %d origins, want %d", len(cfg.CORSAllowedOrigins), len(want))
	}
	for i, origin := range cfg.CORSAllowedOrigins {
		if origin != want[i] {
			t.Errorf("origin[%d] = %q, want %q", i, origin, want[i])
		}
	}
}

func TestLoad_CORSSingleOrigin(t *testing.T) {
	t.Setenv("CORS_ALLOWED_ORIGINS", "https://app.com")
	t.Setenv("JWT_SECRET", "test-secret")

	cfg, err := Load()
	if err != nil {
		t.Fatalf("Load() returned unexpected error: %v", err)
	}

	want := []string{"https://app.com"}
	if len(cfg.CORSAllowedOrigins) != len(want) {
		t.Fatalf("got %d origins, want %d", len(cfg.CORSAllowedOrigins), len(want))
	}
	if cfg.CORSAllowedOrigins[0] != want[0] {
		t.Errorf("got %q, want %q", cfg.CORSAllowedOrigins[0], want[0])
	}
}

func TestLoad_CORSFallback(t *testing.T) {
	// Ensure env var is not set — t.Setenv with empty string still sets it,
	// so we rely on it not being present in the test environment.
	// t.Setenv removes the var after the test via os.Unsetenv on cleanup.
	t.Setenv("JWT_SECRET", "test-secret")
	// Unset any potential CORS_ALLOWED_ORIGINS from host environment
	t.Setenv("CORS_ALLOWED_ORIGINS", "")

	// When CORS_ALLOWED_ORIGINS is empty string, getEnv returns the fallback
	cfg, err := Load()
	if err != nil {
		t.Fatalf("Load() returned unexpected error: %v", err)
	}

	want := []string{"http://localhost:5173"}
	if len(cfg.CORSAllowedOrigins) != len(want) {
		t.Fatalf("got %d origins, want %d: %v", len(cfg.CORSAllowedOrigins), len(want), cfg.CORSAllowedOrigins)
	}
	if cfg.CORSAllowedOrigins[0] != want[0] {
		t.Errorf("got %q, want %q", cfg.CORSAllowedOrigins[0], want[0])
	}
}

func TestLoad_EnvDefaultsDevelopment(t *testing.T) {
	t.Setenv("JWT_SECRET", "test-secret")
	// Don't set ENV — verify default is "development"
	t.Setenv("ENV", "")

	cfg, err := Load()
	if err != nil {
		t.Fatalf("Load() returned unexpected error: %v", err)
	}

	if cfg.Env != "development" {
		t.Errorf("Env = %q, want %q", cfg.Env, "development")
	}
}

func TestLoad_EnvProduction(t *testing.T) {
	t.Setenv("JWT_SECRET", "test-secret")
	t.Setenv("ENV", "production")

	cfg, err := Load()
	if err != nil {
		t.Fatalf("Load() returned unexpected error: %v", err)
	}

	if cfg.Env != "production" {
		t.Errorf("Env = %q, want %q", cfg.Env, "production")
	}
}

func TestLoad_CookieSecureTrue(t *testing.T) {
	t.Setenv("JWT_SECRET", "test-secret")
	t.Setenv("COOKIE_SECURE", "true")

	cfg, err := Load()
	if err != nil {
		t.Fatalf("Load() returned unexpected error: %v", err)
	}

	if !cfg.CookieSecure {
		t.Errorf("CookieSecure = false, want true")
	}
}

func TestLoad_CookieSecureFalseDefault(t *testing.T) {
	t.Setenv("JWT_SECRET", "test-secret")
	t.Setenv("COOKIE_SECURE", "")

	cfg, err := Load()
	if err != nil {
		t.Fatalf("Load() returned unexpected error: %v", err)
	}

	if cfg.CookieSecure {
		t.Errorf("CookieSecure = true, want false")
	}
}

func TestLoad_JWTSecretRequired(t *testing.T) {
	t.Setenv("JWT_SECRET", "")

	_, err := Load()
	if err == nil {
		t.Error("Load() should return error when JWT_SECRET is empty, got nil")
	}
}

func TestLoad_JWTSecretPresent(t *testing.T) {
	t.Setenv("JWT_SECRET", "test-secret")

	cfg, err := Load()
	if err != nil {
		t.Errorf("Load() returned unexpected error: %v", err)
	}
	if cfg == nil {
		t.Error("Load() returned nil config, want non-nil")
	}
}

func TestLoad_SMTPFieldsFromEnv(t *testing.T) {
	t.Setenv("JWT_SECRET", "test-secret")
	t.Setenv("SMTP_HOST", "smtp.example.com")
	t.Setenv("SMTP_PORT", "587")
	t.Setenv("SMTP_USER", "user@example.com")
	t.Setenv("SMTP_PASS", "secret-pass")
	t.Setenv("SMTP_FROM", "noreply@example.com")
	t.Setenv("FRONTEND_URL", "https://app.example.com")

	cfg, err := Load()
	if err != nil {
		t.Fatalf("Load() returned unexpected error: %v", err)
	}

	if cfg.SMTPHost != "smtp.example.com" {
		t.Errorf("SMTPHost = %q, want %q", cfg.SMTPHost, "smtp.example.com")
	}
	if cfg.SMTPPort != "587" {
		t.Errorf("SMTPPort = %q, want %q", cfg.SMTPPort, "587")
	}
	if cfg.SMTPUser != "user@example.com" {
		t.Errorf("SMTPUser = %q, want %q", cfg.SMTPUser, "user@example.com")
	}
	if cfg.SMTPPass != "secret-pass" {
		t.Errorf("SMTPPass = %q, want %q", cfg.SMTPPass, "secret-pass")
	}
	if cfg.SMTPFrom != "noreply@example.com" {
		t.Errorf("SMTPFrom = %q, want %q", cfg.SMTPFrom, "noreply@example.com")
	}
	if cfg.FrontendURL != "https://app.example.com" {
		t.Errorf("FrontendURL = %q, want %q", cfg.FrontendURL, "https://app.example.com")
	}
}

func TestLoad_SMTPFieldsDefaultEmpty(t *testing.T) {
	t.Setenv("JWT_SECRET", "test-secret")
	// SMTP fields not set — should default to empty string (disabled)
	t.Setenv("SMTP_HOST", "")
	t.Setenv("SMTP_PORT", "")
	t.Setenv("SMTP_USER", "")
	t.Setenv("SMTP_PASS", "")
	t.Setenv("SMTP_FROM", "")
	t.Setenv("FRONTEND_URL", "")

	cfg, err := Load()
	if err != nil {
		t.Fatalf("Load() returned unexpected error: %v", err)
	}

	if cfg.SMTPHost != "" {
		t.Errorf("SMTPHost = %q, want empty string (disabled)", cfg.SMTPHost)
	}
	if cfg.FrontendURL != "" {
		t.Errorf("FrontendURL = %q, want empty string", cfg.FrontendURL)
	}
}
