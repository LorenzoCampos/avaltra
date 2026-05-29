package server

import (
	"testing"

	"github.com/LorenzoCampos/avaltra/internal/config"
	"github.com/LorenzoCampos/avaltra/internal/database"
)

func TestSetupRoutesRegistersImportExcelTemplateEndpoints(t *testing.T) {
	srv := New(&config.Config{
		CORSAllowedOrigins: []string{"http://localhost:5173"},
		JWTSecret:          "test-secret",
	}, &database.DB{})

	wantRoutes := map[string]bool{
		"POST /api/imports/excel-template/preview": false,
		"POST /api/imports/excel-template/commit":  false,
	}

	for _, route := range srv.router.Routes() {
		key := route.Method + " " + route.Path
		if _, ok := wantRoutes[key]; ok {
			wantRoutes[key] = true
		}
	}

	for route, found := range wantRoutes {
		if !found {
			t.Fatalf("route %q not registered", route)
		}
	}
}

func TestSetupRoutesRegistersPaymentContextManagementEndpoints(t *testing.T) {
	srv := New(&config.Config{
		CORSAllowedOrigins: []string{"http://localhost:5173"},
		JWTSecret:          "test-secret",
	}, &database.DB{})

	wantRoutes := map[string]bool{
		"GET /api/payment-containers":                   false,
		"POST /api/payment-containers":                  false,
		"PUT /api/payment-containers/:id":               false,
		"PATCH /api/payment-containers/:id/deactivate":  false,
		"GET /api/payment-instruments":                  false,
		"POST /api/payment-instruments":                 false,
		"PUT /api/payment-instruments/:id":              false,
		"PATCH /api/payment-instruments/:id/deactivate": false,
		"GET /api/place-transfers":                      false,
		"POST /api/place-transfers":                     false,
	}

	for _, route := range srv.router.Routes() {
		key := route.Method + " " + route.Path
		if _, ok := wantRoutes[key]; ok {
			wantRoutes[key] = true
		}
	}

	for route, found := range wantRoutes {
		if !found {
			t.Fatalf("route %q not registered", route)
		}
	}
}
