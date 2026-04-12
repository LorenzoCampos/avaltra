package email

import (
	"strings"
	"testing"
)

// TestNewSender_ReturnsLogSenderWhenNoHost verifies that when SMTP_HOST is empty,
// NewSender returns a LogSender (dev fallback) rather than an SMTPSender.
func TestNewSender_ReturnsLogSenderWhenNoHost(t *testing.T) {
	sender := NewSender("", "587", "user", "pass", "from@example.com")

	_, ok := sender.(*LogSender)
	if !ok {
		t.Errorf("NewSender with empty host should return *LogSender, got %T", sender)
	}
}

// TestNewSender_ReturnsSMTPSenderWhenHostSet verifies that when SMTP_HOST is provided,
// NewSender returns an SMTPSender.
func TestNewSender_ReturnsSMTPSenderWhenHostSet(t *testing.T) {
	sender := NewSender("smtp.example.com", "587", "user", "pass", "from@example.com")

	_, ok := sender.(*SMTPSender)
	if !ok {
		t.Errorf("NewSender with host should return *SMTPSender, got %T", sender)
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
	sender := NewSender("smtp.example.com", "587", "myuser", "mypass", "noreply@example.com")

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
