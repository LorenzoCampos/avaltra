package email

import (
	"encoding/json"
	"log"
	"net"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

type deadlineRecorderConn struct {
	net.Conn
	deadline time.Time
	called   bool
}

func (c *deadlineRecorderConn) SetDeadline(t time.Time) error {
	c.called = true
	c.deadline = t
	return nil
}

// TestNewSender_ReturnsLogSenderWhenNoHost verifies that when SMTP_HOST is empty,
// NewSender returns a LogSender (dev fallback) rather than an SMTPSender.
func TestNewSender_ReturnsLogSenderWhenNoHost(t *testing.T) {
	sender := NewSender("", "", "587", "user", "pass", "from@example.com")

	_, ok := sender.(*LogSender)
	if !ok {
		t.Errorf("NewSender with empty host should return *LogSender, got %T", sender)
	}
}

// TestNewSender_ReturnsSMTPSenderWhenHostSet verifies that when SMTP_HOST is provided,
// NewSender returns an SMTPSender.
func TestNewSender_ReturnsSMTPSenderWhenHostSet(t *testing.T) {
	sender := NewSender("", "smtp.example.com", "587", "user", "pass", "from@example.com")

	_, ok := sender.(*SMTPSender)
	if !ok {
		t.Errorf("NewSender with host should return *SMTPSender, got %T", sender)
	}
}

func TestNewSender_ReturnsBrevoAPISenderWhenAPIKeySet(t *testing.T) {
	sender := NewSender("brevo-key", "smtp.example.com", "587", "user", "pass", "from@example.com")

	brevo, ok := sender.(*BrevoAPISender)
	if !ok {
		t.Fatalf("NewSender with BREVO_API_KEY should return *BrevoAPISender, got %T", sender)
	}
	if brevo.apiKey != "brevo-key" {
		t.Errorf("apiKey = %q, want %q", brevo.apiKey, "brevo-key")
	}
}

func TestBrevoAPISender_SendVerificationEmail_PostsTransactionalPayload(t *testing.T) {
	var requestPath string
	var apiKeyHeader string
	var payload map[string]any
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		requestPath = r.URL.Path
		apiKeyHeader = r.Header.Get("api-key")
		if ct := r.Header.Get("Content-Type"); ct != "application/json" {
			t.Errorf("Content-Type = %q, want application/json", ct)
		}
		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			t.Fatalf("decode Brevo request: %v", err)
		}
		w.WriteHeader(http.StatusCreated)
		_, _ = w.Write([]byte(`{"messageId":"abc-123"}`))
	}))
	defer server.Close()

	sender := &BrevoAPISender{apiKey: "brevo-secret", from: "Avaltra <auth@avaltra.app>", endpoint: server.URL + "/v3/smtp/email", httpClient: server.Client()}

	if err := sender.SendVerificationEmail("user@example.com", "verify-token", "https://app.example.com"); err != nil {
		t.Fatalf("SendVerificationEmail returned error: %v", err)
	}

	if requestPath != "/v3/smtp/email" {
		t.Errorf("request path = %q, want /v3/smtp/email", requestPath)
	}
	if apiKeyHeader != "brevo-secret" {
		t.Errorf("api-key header = %q, want configured API key", apiKeyHeader)
	}
	assertBrevoPayload(t, payload, "Verifica tu email - Avaltra", "verify-email?token=verify-token")
}

func TestBrevoAPISender_SendPasswordResetEmail_PostsTransactionalPayload(t *testing.T) {
	var payload map[string]any
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			t.Fatalf("decode Brevo request: %v", err)
		}
		w.WriteHeader(http.StatusCreated)
		_, _ = w.Write([]byte(`{"messageId":"reset-123"}`))
	}))
	defer server.Close()

	sender := &BrevoAPISender{apiKey: "brevo-secret", from: "auth@avaltra.app", endpoint: server.URL, httpClient: server.Client()}

	if err := sender.SendPasswordResetEmail("user@example.com", "reset-token", "https://app.example.com"); err != nil {
		t.Fatalf("SendPasswordResetEmail returned error: %v", err)
	}

	assertBrevoPayload(t, payload, "Restablecer contraseña - Avaltra", "reset-password?token=reset-token")
}

func TestBrevoAPISender_ReturnsErrorForNonSuccessResponse(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusUnauthorized)
		_, _ = w.Write([]byte(`{"code":"unauthorized","message":"bad key"}`))
	}))
	defer server.Close()

	sender := &BrevoAPISender{apiKey: "brevo-secret", from: "auth@avaltra.app", endpoint: server.URL, httpClient: server.Client()}

	err := sender.SendVerificationEmail("user@example.com", "verify-token", "https://app.example.com")
	if err == nil {
		t.Fatal("SendVerificationEmail should return an error for non-success Brevo responses")
	}
	if !strings.Contains(err.Error(), "status=401") {
		t.Fatalf("error = %q, want status=401", err.Error())
	}
}

func TestLogBrevoResult_DoesNotLeakSecretsOrTokens(t *testing.T) {
	var logOutput strings.Builder
	oldOutput := log.Writer()
	log.SetOutput(&logOutput)
	t.Cleanup(func() { log.SetOutput(oldOutput) })

	logBrevoResult("verification", "success", "user@example.com", http.StatusCreated, "message-123", nil)

	output := logOutput.String()
	for _, forbidden := range []string{"brevo-secret", "verify-token", "reset-token", "token=", "api-key"} {
		if strings.Contains(output, forbidden) {
			t.Fatalf("Brevo log leaked %q in %q", forbidden, output)
		}
	}
	for _, expected := range []string{"provider=brevo", "kind=verification", "status=success", "to=user@example.com", "http_status=201", "message_id=message-123"} {
		if !strings.Contains(output, expected) {
			t.Fatalf("Brevo log missing %q in %q", expected, output)
		}
	}
}

// TestLogSender_SendVerificationEmail_ReturnsNil verifies that LogSender.SendVerificationEmail
// logs the email and returns nil (no error in dev mode).
func TestLogSender_SendVerificationEmail_ReturnsNil(t *testing.T) {
	var logOutput strings.Builder
	sender := &LogSender{logWriter: &logOutput}

	err := sender.SendVerificationEmail("user@example.com", "rawtoken123", "https://app.example.com")
	if err != nil {
		t.Errorf("LogSender.SendVerificationEmail should return nil, got: %v", err)
	}
}

// TestLogSender_SendVerificationEmail_LogsToWriter verifies that LogSender writes
// the email details to the configured writer (observable behavior for testing).
func TestLogSender_SendVerificationEmail_LogsToWriter(t *testing.T) {
	var logOutput strings.Builder
	sender := &LogSender{logWriter: &logOutput}

	err := sender.SendVerificationEmail("user@example.com", "rawtoken123", "https://app.example.com")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	output := logOutput.String()
	if !strings.Contains(output, "user@example.com") {
		t.Errorf("log output should contain recipient email, got: %q", output)
	}
	if !strings.Contains(output, "rawtoken123") {
		t.Errorf("log output should contain token, got: %q", output)
	}
}

// TestLogSender_SendPasswordResetEmail_ReturnsNil verifies the same for password reset emails.
func TestLogSender_SendPasswordResetEmail_ReturnsNil(t *testing.T) {
	var logOutput strings.Builder
	sender := &LogSender{logWriter: &logOutput}

	err := sender.SendPasswordResetEmail("user@example.com", "resettoken456", "https://app.example.com")
	if err != nil {
		t.Errorf("LogSender.SendPasswordResetEmail should return nil, got: %v", err)
	}
}

// TestLogSender_SendPasswordResetEmail_LogsToWriter verifies that LogSender logs reset emails.
func TestLogSender_SendPasswordResetEmail_LogsToWriter(t *testing.T) {
	var logOutput strings.Builder
	sender := &LogSender{logWriter: &logOutput}

	err := sender.SendPasswordResetEmail("user@example.com", "resettoken456", "https://app.example.com")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	output := logOutput.String()
	if !strings.Contains(output, "user@example.com") {
		t.Errorf("log output should contain recipient email, got: %q", output)
	}
	if !strings.Contains(output, "resettoken456") {
		t.Errorf("log output should contain token, got: %q", output)
	}
}

// TestSMTPSender_HasCorrectFields verifies that SMTPSender stores config fields correctly.
func TestSMTPSender_HasCorrectFields(t *testing.T) {
	sender := NewSender("", "smtp.example.com", "587", "myuser", "mypass", "noreply@example.com")

	s, ok := sender.(*SMTPSender)
	if !ok {
		t.Fatalf("expected *SMTPSender, got %T", sender)
	}
	if s.host != "smtp.example.com" {
		t.Errorf("host = %q, want %q", s.host, "smtp.example.com")
	}
	if s.port != "587" {
		t.Errorf("port = %q, want %q", s.port, "587")
	}
	if s.from != "noreply@example.com" {
		t.Errorf("from = %q, want %q", s.from, "noreply@example.com")
	}
}

func assertBrevoPayload(t *testing.T, payload map[string]any, wantSubject, wantLinkPart string) {
	t.Helper()
	if payload["subject"] != wantSubject {
		t.Fatalf("subject = %q, want %q", payload["subject"], wantSubject)
	}
	htmlContent, ok := payload["htmlContent"].(string)
	if !ok || !strings.Contains(htmlContent, wantLinkPart) {
		t.Fatalf("htmlContent = %q, want link containing %q", htmlContent, wantLinkPart)
	}
	sender, ok := payload["sender"].(map[string]any)
	if !ok {
		t.Fatalf("sender payload missing or wrong type: %#v", payload["sender"])
	}
	if sender["email"] != "auth@avaltra.app" {
		t.Fatalf("sender.email = %q, want auth@avaltra.app", sender["email"])
	}
	to, ok := payload["to"].([]any)
	if !ok || len(to) != 1 {
		t.Fatalf("to payload = %#v, want one recipient", payload["to"])
	}
	recipient, ok := to[0].(map[string]any)
	if !ok || recipient["email"] != "user@example.com" {
		t.Fatalf("recipient = %#v, want user@example.com", to[0])
	}
}

// TestExtractEmail verifies that extractEmail correctly parses "Name <email>" format.
func TestExtractEmail(t *testing.T) {
	tests := []struct {
		input    string
		expected string
	}{
		{"Avaltra <noreply@example.com>", "noreply@example.com"},
		{"noreply@example.com", "noreply@example.com"},
		{"Support Team <support@avaltra.app>", "support@avaltra.app"},
		{"<bare@example.com>", "bare@example.com"},
	}

	for _, tt := range tests {
		t.Run(tt.input, func(t *testing.T) {
			got := extractEmail(tt.input)
			if got != tt.expected {
				t.Errorf("extractEmail(%q) = %q, want %q", tt.input, got, tt.expected)
			}
		})
	}
}

// TestSetSMTPDeadline_AppliesReadWriteTimeout verifies SMTP operations get a
// bounded read/write deadline before blocking net/smtp calls.
func TestSetSMTPDeadline_AppliesReadWriteTimeout(t *testing.T) {
	conn := &deadlineRecorderConn{}
	before := time.Now().Add(smtpReadWriteTimeout)

	setSMTPDeadline(conn)

	if !conn.called {
		t.Fatal("setSMTPDeadline should call SetDeadline")
	}
	after := time.Now().Add(smtpReadWriteTimeout)
	if conn.deadline.Before(before) || conn.deadline.After(after) {
		t.Fatalf("deadline = %v, want between %v and %v", conn.deadline, before, after)
	}
}

// TestLogSMTPStage_DoesNotLeakSecrets verifies SMTP instrumentation keeps logs
// production-safe by logging stage metadata only, not passwords or token links.
func TestLogSMTPStage_DoesNotLeakSecrets(t *testing.T) {
	var logOutput strings.Builder
	oldOutput := log.Writer()
	log.SetOutput(&logOutput)
	t.Cleanup(func() { log.SetOutput(oldOutput) })

	logSMTPStage("auth", "start", "user@example.com", "smtp.example.com:587", nil)

	output := logOutput.String()
	for _, forbidden := range []string{"smtp-password", "token=", "reset-password?token=", "verify-email?token="} {
		if strings.Contains(output, forbidden) {
			t.Fatalf("SMTP stage log leaked %q in %q", forbidden, output)
		}
	}
	for _, expected := range []string{"stage=auth", "status=start", "to=user@example.com", "via=smtp.example.com:587"} {
		if !strings.Contains(output, expected) {
			t.Fatalf("SMTP stage log missing %q in %q", expected, output)
		}
	}
}
