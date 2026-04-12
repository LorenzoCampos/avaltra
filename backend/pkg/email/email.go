package email

import (
	"bytes"
	_ "embed"
	"fmt"
	"html/template"
	"io"
	"net/smtp"
	"os"
)

//go:embed templates/verify.html
var verifyTemplate string

//go:embed templates/reset.html
var resetTemplate string

// templateData holds the variables available to email HTML templates.
type templateData struct {
	Name string // User's display name
	Link string // Full action URL (verification or reset)
}

// Sender defines the contract for sending transactional emails.
// Implement this interface to swap the concrete sender (SMTP, mock, etc.)
type Sender interface {
	// SendVerificationEmail sends an email verification link to the given address.
	SendVerificationEmail(to, token, frontendURL string) error
	// SendPasswordResetEmail sends a password-reset link to the given address.
	SendPasswordResetEmail(to, token, frontendURL string) error
}

// NewSender returns the appropriate Sender based on configuration.
// When host is empty, returns a LogSender (dev fallback that prints to stdout).
// When host is set, returns an SMTPSender for real delivery.
func NewSender(host, port, user, pass, from string) Sender {
	if host == "" {
		return &LogSender{logWriter: os.Stdout}
	}
	return &SMTPSender{
		host: host,
		port: port,
		user: user,
		pass: pass,
		from: from,
	}
}

// ─── SMTPSender ──────────────────────────────────────────────────────────────

// SMTPSender sends real emails via net/smtp (STARTTLS on port 587).
type SMTPSender struct {
	host string
	port string
	user string
	pass string
	from string
}

// SendVerificationEmail sends an email with a verification link.
func (s *SMTPSender) SendVerificationEmail(to, token, frontendURL string) error {
	link := fmt.Sprintf("%s/verify-email?token=%s", frontendURL, token)
	subject := "Verifica tu email - Avaltra"
	body, err := renderTemplate(verifyTemplate, templateData{Name: to, Link: link})
	if err != nil {
		return fmt.Errorf("email: render verify template: %w", err)
	}
	return s.send(to, subject, body)
}

// SendPasswordResetEmail sends an email with a password-reset link.
func (s *SMTPSender) SendPasswordResetEmail(to, token, frontendURL string) error {
	link := fmt.Sprintf("%s/reset-password?token=%s", frontendURL, token)
	subject := "Restablecer contraseña - Avaltra"
	body, err := renderTemplate(resetTemplate, templateData{Name: to, Link: link})
	if err != nil {
		return fmt.Errorf("email: render reset template: %w", err)
	}
	return s.send(to, subject, body)
}

// send builds the MIME message and delivers it via SMTP AUTH.
func (s *SMTPSender) send(to, subject, htmlBody string) error {
	addr := s.host + ":" + s.port
	auth := smtp.PlainAuth("", s.user, s.pass, s.host)

	msg := buildMIMEMessage(s.from, to, subject, htmlBody)

	if err := smtp.SendMail(addr, auth, s.from, []string{to}, []byte(msg)); err != nil {
		return fmt.Errorf("email: smtp send to %s: %w", to, err)
	}
	return nil
}

// ─── LogSender ───────────────────────────────────────────────────────────────

// LogSender is the development fallback — it prints email details to logWriter
// instead of sending real SMTP messages. Used when SMTP_HOST is empty.
type LogSender struct {
	logWriter io.Writer
}

// SendVerificationEmail logs the email to logWriter and returns nil.
func (l *LogSender) SendVerificationEmail(to, token, frontendURL string) error {
	link := fmt.Sprintf("%s/verify-email?token=%s", frontendURL, token)
	fmt.Fprintf(l.logWriter,
		"[email:dev] VERIFICATION EMAIL → to=%s token=%s link=%s\n",
		to, token, link,
	)
	return nil
}

// SendPasswordResetEmail logs the email to logWriter and returns nil.
func (l *LogSender) SendPasswordResetEmail(to, token, frontendURL string) error {
	link := fmt.Sprintf("%s/reset-password?token=%s", frontendURL, token)
	fmt.Fprintf(l.logWriter,
		"[email:dev] PASSWORD RESET EMAIL → to=%s token=%s link=%s\n",
		to, token, link,
	)
	return nil
}

// ─── helpers ─────────────────────────────────────────────────────────────────

// renderTemplate executes the HTML template with the given data.
func renderTemplate(tmplStr string, data templateData) (string, error) {
	tmpl, err := template.New("email").Parse(tmplStr)
	if err != nil {
		return "", fmt.Errorf("parse template: %w", err)
	}
	var buf bytes.Buffer
	if err := tmpl.Execute(&buf, data); err != nil {
		return "", fmt.Errorf("execute template: %w", err)
	}
	return buf.String(), nil
}

// buildMIMEMessage constructs a minimal MIME email with an HTML body.
func buildMIMEMessage(from, to, subject, htmlBody string) string {
	return fmt.Sprintf(
		"From: %s\r\nTo: %s\r\nSubject: %s\r\nMIME-Version: 1.0\r\nContent-Type: text/html; charset=UTF-8\r\n\r\n%s",
		from, to, subject, htmlBody,
	)
}
