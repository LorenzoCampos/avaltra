# Changelog - Avaltra

Todos los cambios notables del proyecto se documentan en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/),
y este proyecto adhiere a [Semantic Versioning](https://semver.org/lang/es/).

---

## [Unreleased]

### En Desarrollo
- Sistema de recurrencia avanzado (frecuencias, día específico del mes/semana, límite de ocurrencias)
- Dashboard con tendencias de 6 meses
- Exports (CSV/Excel)
- Budgets (presupuestos mensuales por categoría)

---

## [1.0.0] - 2026-01-16

### 🎉 MVP Release

Primera versión completa y funcional del sistema.

### Added - Backend
- ✅ Sistema de autenticación JWT (access + refresh tokens)
- ✅ CRUD completo de Accounts (personal + family)
- ✅ CRUD completo de Expenses (one-time + recurring básico)
- ✅ CRUD completo de Incomes (one-time + recurring básico)
- ✅ CRUD completo de Savings Goals con transacciones
- ✅ Sistema de categorías (predefinidas + custom)
- ✅ Family members para cuentas familiares
- ✅ Dashboard con resumen mensual consolidado
- ✅ Multi-currency con Modo 3 (captura dólar tarjeta)
- ✅ Tabla exchange_rates para histórico de tipos de cambio
- ✅ Middleware de autenticación y account context
- ✅ 11 migraciones SQL completas

### Added - Frontend
- ✅ Setup con Vite + React 18 + TypeScript
- ✅ TailwindCSS v4 configurado
- ✅ TanStack Query para data fetching
- ✅ React Hook Form + Zod para validación
- ✅ Axios con interceptors (JWT + X-Account-ID)
- ✅ React Router v6 para navegación
- ✅ Páginas principales: Login, Dashboard, Expenses, Incomes, Savings Goals

### Added - Documentación
- ✅ FEATURES.md - Guía narrativa de funcionalidades
- ✅ API.md - Especificación completa de endpoints
- ✅ STACK.md - Stack tecnológico y decisiones
- ✅ docs/DATABASE.md - Schema de base de datos
- ✅ docs/MULTI-CURRENCY.md - Sistema multi-moneda
- ✅ README.md consolidado

---

## [0.3.0] - 2026-01-13

### Added
- Sistema de categorías predefinidas (15 expense + 10 income)
- Categorías custom por cuenta
- Migración de campo `category` TEXT a `category_id` UUID
- Endpoints de categorías con CRUD completo

### Changed
- Expenses e Incomes ahora usan `category_id` en lugar de `category` texto

---

## [0.2.0] - 2026-01-12

### Added
- Sistema multi-currency con snapshot histórico
- Campos `exchange_rate` y `amount_in_primary_currency`
- Tabla `exchange_rates` para histórico de tasas
- Modo 3: Flexibilidad total (ingreso de monto real pagado)
- Savings Goals con tabla de transacciones
- Endpoints para add/withdraw funds

### Changed
- Dashboard ahora muestra `available_balance` calculado
- Todos los montos se convierten a moneda primaria de la cuenta

---

## [0.1.0] - 2026-01-10

### Added - Foundation
- Estructura inicial del proyecto (backend Go + frontend React)
- Autenticación con JWT y bcrypt
- CRUD básico de Accounts
- CRUD básico de Expenses (sin multi-currency)
- CRUD básico de Incomes (sin multi-currency)
- Setup de PostgreSQL con migraciones iniciales
- Dockerfile para deployment
- Configuración de Apache como reverse proxy

### Deployment
- Producción: https://api.fakerbostero.online/avaltra
- VPS Debian 12 configurado

---

## 📝 Notas de Versiones

### Sobre el MVP v1.0

Esta versión incluye todas las funcionalidades core necesarias para gestionar finanzas personales y familiares:
- Tracking completo de gastos e ingresos
- Soporte multi-moneda real (captura impuestos argentinos)
- Metas de ahorro con cálculo automático
- Dashboard con análisis por categoría
- Cuentas familiares con atribución por miembro

**Lo que NO incluye (planeado para v1.1+):**
- Recurrencia avanzada (día específico del mes/semana, cuotas con contador)
- Wishlist vinculada a metas
- Tendencias históricas (6+ meses)
- Budgets/presupuestos
- Notificaciones
- Exports

---

## 🔗 Links

- [Repositorio GitHub](https://github.com/LorenzoCampos/avaltra)
- [API Producción](https://api.fakerbostero.online/avaltra)
- [Documentación API](./API.md)
- [Guía de Features](./FEATURES.md)

---

**Mantenido por:** Gentleman Programming & Lorenzo  
**Última actualización:** 2026-01-16
