package config

import (
	"fmt"
	"os"
	"strings"

	"github.com/joho/godotenv"
)

// Config almacena toda la configuración de la aplicación
// Este struct agrupa todas las variables de entorno en un solo lugar
type Config struct {
	Port               string   // Puerto donde escucha el servidor (ej: "8080")
	DatabaseURL        string   // URL de conexión a PostgreSQL
	CORSAllowedOrigins []string // Orígenes permitidos para CORS (parsea CORS_ALLOWED_ORIGINS)
	Env                string   // Entorno de ejecución: "development" | "production"
	CookieSecure       bool     // Si true, las cookies solo se envían por HTTPS
	JWTSecret          string   // Clave secreta para firmar tokens JWT
	JWTAccessExpiry    string   // Duración del access token (ej: "15m")
	JWTRefreshExpiry   string   // Duración del refresh token (ej: "7d")
	// Email / SMTP — vacío = modo dev (imprime a stdout)
	SMTPHost    string // Host SMTP (ej: "smtp.sendgrid.net")
	SMTPPort    string // Puerto SMTP (ej: "587")
	SMTPUser    string // Usuario SMTP
	SMTPPass    string // Contraseña SMTP
	SMTPFrom    string // Dirección del remitente (ej: "noreply@avaltra.com")
	FrontendURL string // URL del frontend para construir links en emails (ej: "https://app.avaltra.com")
}

// Load carga las variables de entorno desde el archivo .env
// y retorna una instancia de Config con todos los valores
func Load() (*Config, error) {
	// Intentar cargar el archivo .env
	// Si no existe, no es un error fatal (podemos usar variables de entorno del sistema)
	err := godotenv.Load()
	if err != nil {
		fmt.Println("⚠️  No se encontró archivo .env, usando variables de entorno del sistema")
	}

	// Parsear CORS_ALLOWED_ORIGINS: lista separada por comas
	// Ej: "https://app.vercel.app,https://staging.vercel.app"
	originsRaw := getEnv("CORS_ALLOWED_ORIGINS", "http://localhost:5173")
	origins := strings.Split(originsRaw, ",")
	for i := range origins {
		origins[i] = strings.TrimSpace(origins[i])
	}

	// Crear la instancia de Config y leer cada variable
	config := &Config{
		Port:               getEnv("PORT", "8080"), // Si no existe PORT, usa "8080" por defecto
		DatabaseURL:        getEnv("DATABASE_URL", ""),
		CORSAllowedOrigins: origins,
		Env:                getEnv("ENV", "development"),
		CookieSecure:       getEnv("COOKIE_SECURE", "false") == "true",
		JWTSecret:          getEnv("JWT_SECRET", ""),
		JWTAccessExpiry:    getEnv("JWT_ACCESS_EXPIRY", "15m"),
		JWTRefreshExpiry:   getEnv("JWT_REFRESH_EXPIRY", "7d"),
		// SMTP — empty string = dev mode (log to stdout), required in production
		SMTPHost:    getEnv("SMTP_HOST", ""),
		SMTPPort:    getEnv("SMTP_PORT", ""),
		SMTPUser:    getEnv("SMTP_USER", ""),
		SMTPPass:    getEnv("SMTP_PASS", ""),
		SMTPFrom:    getEnv("SMTP_FROM", ""),
		FrontendURL: getEnv("FRONTEND_URL", ""),
	}

	// Validar que las variables críticas existan
	if config.JWTSecret == "" {
		return nil, fmt.Errorf("JWT_SECRET es obligatorio")
	}

	return config, nil
}

// getEnv es una función helper que lee una variable de entorno
// Si no existe, retorna el valor por defecto (fallback)
func getEnv(key, fallback string) string {
	value := os.Getenv(key)
	if value == "" {
		return fallback
	}
	return value
}
