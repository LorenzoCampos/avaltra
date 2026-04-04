package main

import (
	"errors"
	"fmt"
	"log"
	"os"
	"os/signal"
	"strings"
	"syscall"

	"github.com/LorenzoCampos/bolsillo-claro/internal/config"
	"github.com/LorenzoCampos/bolsillo-claro/internal/database"
	"github.com/LorenzoCampos/bolsillo-claro/internal/server"
	"github.com/LorenzoCampos/bolsillo-claro/pkg/scheduler"
	"github.com/golang-migrate/migrate/v4"
	_ "github.com/golang-migrate/migrate/v4/database/postgres"
	_ "github.com/golang-migrate/migrate/v4/source/file"
	"github.com/robfig/cron/v3"
)

// runMigrations ejecuta todas las migraciones pendientes usando golang-migrate.
// Normaliza postgresql:// → postgres:// ya que lib/pq (usado por golang-migrate)
// solo acepta el esquema postgres://, mientras que pgx acepta ambos.
// Retorna nil si no hay cambios (ya aplicadas) o si aplicó exitosamente.
// Falla con error si hay un problema en las migraciones.
func runMigrations(databaseURL string) error {
	// golang-migrate usa lib/pq internamente, que solo acepta postgres://
	// pgx (usado en database.go) acepta ambos esquemas, por eso normalizamos solo aquí
	dbURL := strings.Replace(databaseURL, "postgresql://", "postgres://", 1)

	m, err := migrate.New("file://migrations", dbURL)
	if err != nil {
		return fmt.Errorf("error creando instancia de migrate: %w", err)
	}
	defer m.Close()

	if err := m.Up(); err != nil {
		// ErrNoChange significa que ya están aplicadas: es éxito, no error
		if errors.Is(err, migrate.ErrNoChange) {
			fmt.Println("✅ Migraciones: sin cambios pendientes")
			return nil
		}
		return fmt.Errorf("error ejecutando migraciones: %w", err)
	}

	fmt.Println("✅ Migraciones aplicadas correctamente")
	return nil
}

// main es la función especial que Go ejecuta al iniciar el programa
// Es el punto de entrada de toda aplicación Go
func main() {
	fmt.Println("🏦 Iniciando Bolsillo Claro API...")

	// Paso 1: Cargar la configuración desde variables de entorno
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("❌ Error cargando configuración: %v", err)
	}
	fmt.Println("✅ Configuración cargada correctamente")

	// Paso 2: Conectar a PostgreSQL
	db, err := database.New(cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("❌ Error conectando a PostgreSQL: %v", err)
	}
	// defer ejecuta la función al FINAL de main(), antes de que el programa termine
	// Esto garantiza que siempre cerremos el pool de conexiones
	defer db.Close()

	// Paso 2.5: Ejecutar migraciones automáticamente antes de arrancar el servidor
	// golang-migrate es idempotente: no re-aplica migraciones ya aplicadas
	if err := runMigrations(cfg.DatabaseURL); err != nil {
		log.Fatalf("❌ Error en migraciones: %v", err)
	}

	// Paso 3: Crear el servidor HTTP (ahora le pasamos también la DB)
	srv := server.New(cfg, db)
	fmt.Println("✅ Servidor HTTP creado")

	// Paso 3.5: Iniciar CRON scheduler para gastos e ingresos recurrentes
	c := cron.New()

	// Ejecutar generación diaria a las 00:01 (1 minuto después de medianoche)
	// Formato: "1 0 * * *" = minuto 1, hora 0, todos los días
	c.AddFunc("1 0 * * *", func() {
		fmt.Println("🔁 Ejecutando generación diaria de gastos recurrentes...")
		err := scheduler.GenerateDailyRecurringExpenses(db.Pool)
		if err != nil {
			log.Printf("❌ Error en generación de gastos recurrentes: %v", err)
		}

		fmt.Println("💰 Ejecutando generación diaria de ingresos recurrentes...")
		err = scheduler.GenerateDailyRecurringIncomes(db.Pool)
		if err != nil {
			log.Printf("❌ Error en generación de ingresos recurrentes: %v", err)
		}
	})

	// Iniciar CRON
	c.Start()
	fmt.Println("✅ CRON scheduler iniciado (ejecuta diariamente a las 00:01 UTC)")

	// Ejecutar una vez al arrancar el servidor (catchup de hoy si es necesario)
	go func() {
		fmt.Println("🔁 Ejecutando generación inicial de gastos (catchup)...")
		err := scheduler.GenerateDailyRecurringExpenses(db.Pool)
		if err != nil {
			log.Printf("❌ Error en generación inicial de gastos: %v", err)
		}

		fmt.Println("💰 Ejecutando generación inicial de ingresos (catchup)...")
		err = scheduler.GenerateDailyRecurringIncomes(db.Pool)
		if err != nil {
			log.Printf("❌ Error en generación inicial de ingresos: %v", err)
		}
	}()

	// Paso 4: Setup de graceful shutdown
	// Esto permite que el servidor se apague limpiamente cuando recibe SIGINT (Ctrl+C) o SIGTERM
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)

	// Paso 5: Iniciar el servidor en una goroutine (hilo ligero)
	// para que no bloquee y podamos escuchar señales de shutdown
	go func() {
		if err := srv.Start(); err != nil {
			log.Fatalf("❌ Error iniciando el servidor: %v", err)
		}
	}()

	// Esperar señal de shutdown
	<-quit
	fmt.Println("\n🛑 Señal de shutdown recibida, cerrando servidor...")

	// Detener CRON scheduler
	c.Stop()
	fmt.Println("✅ CRON scheduler detenido")
}
