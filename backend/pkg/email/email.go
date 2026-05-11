package email

import (
	"bytes"
	"crypto/tls"
	_ "embed"
	"fmt"
	"html/template"
	"io"
	"log"
	"net"
	"net/smtp"
	"os"
	"regexp"
	"time"
)

const (
	smtpConnectTimeout   = 10 * time.Second
	smtpReadWriteTimeout = 30 * time.Second
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

// send builds the MIME message and delivers it via SMTP.
// Supports both port 465 (implicit TLS) and port 587 (STARTTLS).
func (s *SMTPSender) send(to, subject, htmlBody string) error {
	addr := s.host + ":" + s.port

	// Extract just the email address for the envelope (MAIL FROM)
	// The full "Name <email>" format goes in the MIME headers only
	envelopeFrom := extractEmail(s.from)

	msg := buildMIMEMessage(s.from, to, subject, htmlBody)

	log.Printf("[email] Sending to=%s via=%s from=%s", to, addr, envelopeFrom)

	// Port 465 uses implicit TLS (connect with TLS immediately)
	// Port 587 uses STARTTLS (connect plain, upgrade to TLS)
	if s.port == "465" || s.port == "2465" {
		return s.sendWithImplicitTLS(addr, envelopeFrom, to, msg)
	}
	return s.sendWithSTARTTLS(addr, envelopeFrom, to, msg)
}

// sendWithImplicitTLS connects via TLS immediately (port 465).
func (s *SMTPSender) sendWithImplicitTLS(addr, from, to, msg string) error {
	// Connect with TLS from the start
	tlsConfig := &tls.Config{
		ServerName: s.host,
	}

	logSMTPStage("connect", "start", to, addr, nil)
	dialer := &net.Dialer{Timeout: smtpConnectTimeout}
	conn, err := tls.DialWithDialer(dialer, "tcp", addr, tlsConfig)
	if err != nil {
		logSMTPStage("connect", "failure", to, addr, err)
		return fmt.Errorf("email: tls dial %s: %w", addr, err)
	}
	defer conn.Close()

	setSMTPDeadline(conn)
	client, err := smtp.NewClient(conn, s.host)
	if err != nil {
		logSMTPStage("connect", "failure", to, addr, err)
		return fmt.Errorf("email: smtp client: %w", err)
	}
	defer client.Close()
	logSMTPStage("connect", "success", to, addr, nil)

	// Authenticate
	auth := smtp.PlainAuth("", s.user, s.pass, s.host)
	logSMTPStage("auth", "start", to, addr, nil)
	setSMTPDeadline(conn)
	if err := client.Auth(auth); err != nil {
		logSMTPStage("auth", "failure", to, addr, err)
		return fmt.Errorf("email: smtp auth: %w", err)
	}
	logSMTPStage("auth", "success", to, addr, nil)

	// Set envelope sender and recipient
	logSMTPStage("mail_from", "start", to, addr, nil)
	setSMTPDeadline(conn)
	if err := client.Mail(from); err != nil {
		logSMTPStage("mail_from", "failure", to, addr, err)
		return fmt.Errorf("email: smtp MAIL FROM: %w", err)
	}
	logSMTPStage("mail_from", "success", to, addr, nil)
	logSMTPStage("rcpt_to", "start", to, addr, nil)
	setSMTPDeadline(conn)
	if err := client.Rcpt(to); err != nil {
		logSMTPStage("rcpt_to", "failure", to, addr, err)
		return fmt.Errorf("email: smtp RCPT TO: %w", err)
	}
	logSMTPStage("rcpt_to", "success", to, addr, nil)

	// Send message body
	logSMTPStage("data", "start", to, addr, nil)
	setSMTPDeadline(conn)
	w, err := client.Data()
	if err != nil {
		logSMTPStage("data", "failure", to, addr, err)
		return fmt.Errorf("email: smtp DATA: %w", err)
	}
	setSMTPDeadline(conn)
	_, err = w.Write([]byte(msg))
	if err != nil {
		logSMTPStage("data", "failure", to, addr, err)
		return fmt.Errorf("email: smtp write body: %w", err)
	}
	setSMTPDeadline(conn)
	err = w.Close()
	if err != nil {
		logSMTPStage("data", "failure", to, addr, err)
		return fmt.Errorf("email: smtp close body: %w", err)
	}
	logSMTPStage("data", "success", to, addr, nil)

	setSMTPDeadline(conn)
	if err := client.Quit(); err != nil {
		return err
	}
	logSMTPStage("success", "complete", to, addr, nil)
	return nil
}

// sendWithSTARTTLS connects plain and upgrades to TLS (port 587).
func (s *SMTPSender) sendWithSTARTTLS(addr, from, to, msg string) error {
	// Connect plain first
	logSMTPStage("connect", "start", to, addr, nil)
	dialer := &net.Dialer{Timeout: smtpConnectTimeout}
	conn, err := dialer.Dial("tcp", addr)
	if err != nil {
		logSMTPStage("connect", "failure", to, addr, err)
		return fmt.Errorf("email: dial %s: %w", addr, err)
	}
	defer conn.Close()

	setSMTPDeadline(conn)
	client, err := smtp.NewClient(conn, s.host)
	if err != nil {
		logSMTPStage("connect", "failure", to, addr, err)
		return fmt.Errorf("email: smtp client: %w", err)
	}
	defer client.Close()
	logSMTPStage("connect", "success", to, addr, nil)

	// Upgrade to TLS
	tlsConfig := &tls.Config{
		ServerName: s.host,
	}
	logSMTPStage("starttls", "start", to, addr, nil)
	setSMTPDeadline(conn)
	if err := client.StartTLS(tlsConfig); err != nil {
		logSMTPStage("starttls", "failure", to, addr, err)
		return fmt.Errorf("email: STARTTLS: %w", err)
	}
	logSMTPStage("starttls", "success", to, addr, nil)

	// Authenticate
	auth := smtp.PlainAuth("", s.user, s.pass, s.host)
	logSMTPStage("auth", "start", to, addr, nil)
	setSMTPDeadline(conn)
	if err := client.Auth(auth); err != nil {
		logSMTPStage("auth", "failure", to, addr, err)
		return fmt.Errorf("email: smtp auth: %w", err)
	}
	logSMTPStage("auth", "success", to, addr, nil)

	// Set envelope sender and recipient
	logSMTPStage("mail_from", "start", to, addr, nil)
	setSMTPDeadline(conn)
	if err := client.Mail(from); err != nil {
		logSMTPStage("mail_from", "failure", to, addr, err)
		return fmt.Errorf("email: smtp MAIL FROM: %w", err)
	}
	logSMTPStage("mail_from", "success", to, addr, nil)
	logSMTPStage("rcpt_to", "start", to, addr, nil)
	setSMTPDeadline(conn)
	if err := client.Rcpt(to); err != nil {
		logSMTPStage("rcpt_to", "failure", to, addr, err)
		return fmt.Errorf("email: smtp RCPT TO: %w", err)
	}
	logSMTPStage("rcpt_to", "success", to, addr, nil)

	// Send message body
	logSMTPStage("data", "start", to, addr, nil)
	setSMTPDeadline(conn)
	w, err := client.Data()
	if err != nil {
		logSMTPStage("data", "failure", to, addr, err)
		return fmt.Errorf("email: smtp DATA: %w", err)
	}
	setSMTPDeadline(conn)
	_, err = w.Write([]byte(msg))
	if err != nil {
		logSMTPStage("data", "failure", to, addr, err)
		return fmt.Errorf("email: smtp write body: %w", err)
	}
	setSMTPDeadline(conn)
	err = w.Close()
	if err != nil {
		logSMTPStage("data", "failure", to, addr, err)
		return fmt.Errorf("email: smtp close body: %w", err)
	}
	logSMTPStage("data", "success", to, addr, nil)

	setSMTPDeadline(conn)
	if err := client.Quit(); err != nil {
		return err
	}
	logSMTPStage("success", "complete", to, addr, nil)
	return nil
}

func setSMTPDeadline(conn net.Conn) {
	_ = conn.SetDeadline(time.Now().Add(smtpReadWriteTimeout))
}

func logSMTPStage(stage, status, to, addr string, err error) {
	if err != nil {
		log.Printf("[email] stage=%s status=%s to=%s via=%s error=%v", stage, status, to, addr, err)
		return
	}
	log.Printf("[email] stage=%s status=%s to=%s via=%s", stage, status, to, addr)
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

// extractEmail extracts just the email address from a "Name <email>" format.
// If the input is already just an email, returns it unchanged.
// Examples:
//   - "Avaltra <noreply@example.com>" → "noreply@example.com"
//   - "noreply@example.com" → "noreply@example.com"
func extractEmail(from string) string {
	// Match "<email>" pattern
	re := regexp.MustCompile(`<([^>]+)>`)
	matches := re.FindStringSubmatch(from)
	if len(matches) >= 2 {
		return matches[1]
	}
	// No angle brackets, assume it's already just the email
	return from
}
