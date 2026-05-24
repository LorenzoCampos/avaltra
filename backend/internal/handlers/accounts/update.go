package accounts

import (
	"context"
	"fmt"
	"net/http"

	"github.com/LorenzoCampos/avaltra/internal/middleware"
	"github.com/LorenzoCampos/avaltra/internal/transactions"
	"github.com/LorenzoCampos/avaltra/pkg/logger"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

// UpdateAccountRequest representa la estructura de datos para actualizar una cuenta
type UpdateAccountRequest struct {
	Name                      *string                          `json:"name,omitempty" binding:"omitempty,min=1,max=100"`
	Currency                  *string                          `json:"currency,omitempty" binding:"omitempty,oneof=ARS USD EUR"`
	DefaultExpenseContainerID transactions.NullableStringField `json:"default_expense_container_id"`
	DefaultIncomeContainerID  transactions.NullableStringField `json:"default_income_container_id"`
	// NOTA: ARS, USD y EUR están soportados en el ENUM de la base de datos (migración 017)
}

func resolveAccountDefaultContainerUpdate(name string, field transactions.NullableStringField) (bool, *string, error) {
	if !field.Set {
		return false, nil, nil
	}
	if !field.Valid {
		return true, nil, nil
	}
	if _, err := uuid.Parse(field.Value); err != nil {
		return false, nil, fmt.Errorf("%s must be a valid UUID", name)
	}
	return true, &field.Value, nil
}

func (h *Handler) validateAccountDefaultContainer(ctx context.Context, accountID, fieldName string, containerID *string) error {
	if containerID == nil {
		return nil
	}

	var exists bool
	err := h.db.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM payment_containers WHERE id = $1 AND account_id = $2 AND is_active = true)`, *containerID, accountID).Scan(&exists)
	if err != nil {
		return fmt.Errorf("failed to validate %s", fieldName)
	}
	if !exists {
		return fmt.Errorf("%s is invalid for this account", fieldName)
	}
	return nil
}

// UpdateAccount maneja PUT /api/accounts/:id
// Permite actualizar el nombre y/o la moneda de una cuenta
// NOTA: No se permite cambiar el tipo de cuenta (personal/family) una vez creada
func (h *Handler) UpdateAccount(c *gin.Context) {
	// Extraer user_id del contexto (viene del middleware de auth)
	userID, ok := middleware.GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "Usuario no autenticado",
		})
		return
	}

	// Obtener el ID de la cuenta desde la URL
	accountID := c.Param("id")
	if accountID == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "ID de cuenta requerido",
		})
		return
	}

	// Parsear el body
	var req UpdateAccountRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Datos inválidos",
			"details": err.Error(),
		})
		return
	}

	// Validar que al menos un campo esté presente
	if req.Name == nil && req.Currency == nil && !req.DefaultExpenseContainerID.Set && !req.DefaultIncomeContainerID.Set {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Debe proporcionar al menos un campo para actualizar (name, currency o default containers)",
		})
		return
	}

	ctx := c.Request.Context()

	// Verificar que la cuenta existe y pertenece al usuario
	var exists bool
	checkQuery := `SELECT EXISTS(SELECT 1 FROM accounts WHERE id = $1 AND user_id = $2)`
	err := h.db.QueryRow(ctx, checkQuery, accountID, userID).Scan(&exists)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Error verificando cuenta",
			"details": err.Error(),
		})
		return
	}

	if !exists {
		c.JSON(http.StatusNotFound, gin.H{
			"error": "Cuenta no encontrada o no pertenece al usuario",
		})
		return
	}

	defaultExpenseSet, defaultExpenseContainerID, err := resolveAccountDefaultContainerUpdate("default_expense_container_id", req.DefaultExpenseContainerID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	defaultIncomeSet, defaultIncomeContainerID, err := resolveAccountDefaultContainerUpdate("default_income_container_id", req.DefaultIncomeContainerID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := h.validateAccountDefaultContainer(c.Request.Context(), accountID, "default_expense_container_id", defaultExpenseContainerID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := h.validateAccountDefaultContainer(c.Request.Context(), accountID, "default_income_container_id", defaultIncomeContainerID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Construir la query de actualización dinámicamente
	// Solo actualizamos los campos que vienen en el request
	query := `UPDATE accounts SET `
	args := []interface{}{}
	argPos := 1

	if req.Name != nil {
		query += fmt.Sprintf(`name = $%d, `, argPos)
		args = append(args, *req.Name)
		argPos++
	}

	if req.Currency != nil {
		query += fmt.Sprintf(`currency = $%d, `, argPos)
		args = append(args, *req.Currency)
		argPos++
	}
	if defaultExpenseSet {
		query += fmt.Sprintf(`default_expense_container_id = $%d, `, argPos)
		args = append(args, defaultExpenseContainerID)
		argPos++
	}
	if defaultIncomeSet {
		query += fmt.Sprintf(`default_income_container_id = $%d, `, argPos)
		args = append(args, defaultIncomeContainerID)
		argPos++
	}

	// Remover la última coma y espacio
	query = query[:len(query)-2]

	// Agregar el WHERE y updated_at
	query += fmt.Sprintf(`, updated_at = NOW() WHERE id = $%d AND user_id = $%d`, argPos, argPos+1)
	args = append(args, accountID, userID)

	// Ejecutar la actualización
	cmdTag, err := h.db.Exec(ctx, query, args...)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Error actualizando cuenta",
			"details": err.Error(),
		})
		return
	}

	if cmdTag.RowsAffected() == 0 {
		c.JSON(http.StatusNotFound, gin.H{
			"error": "Cuenta no encontrada",
		})
		return
	}

	// Obtener la cuenta actualizada
	getQuery := `
		SELECT 
			id,
			name,
			type,
			currency,
			default_expense_container_id,
			default_income_container_id,
			created_at::TEXT,
			updated_at::TEXT
		FROM accounts
		WHERE id = $1
	`

	var account struct {
		ID                        string  `json:"id"`
		Name                      string  `json:"name"`
		Type                      string  `json:"type"`
		Currency                  string  `json:"currency"`
		DefaultExpenseContainerID *string `json:"default_expense_container_id"`
		DefaultIncomeContainerID  *string `json:"default_income_container_id"`
		CreatedAt                 string  `json:"createdAt"`
		UpdatedAt                 string  `json:"updatedAt"`
	}

	err = h.db.QueryRow(ctx, getQuery, accountID).Scan(
		&account.ID,
		&account.Name,
		&account.Type,
		&account.Currency,
		&account.DefaultExpenseContainerID,
		&account.DefaultIncomeContainerID,
		&account.CreatedAt,
		&account.UpdatedAt,
	)

	if err != nil {
		if err == pgx.ErrNoRows {
			c.JSON(http.StatusNotFound, gin.H{
				"error": "Cuenta no encontrada después de actualizar",
			})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Error obteniendo cuenta actualizada",
			"details": err.Error(),
		})
		return
	}

	// Log de cuenta actualizada
	logData := map[string]interface{}{
		"account_id": accountID,
		"user_id":    userID,
		"ip":         c.ClientIP(),
	}
	if req.Name != nil {
		logData["new_name"] = *req.Name
	}
	if req.Currency != nil {
		logData["new_currency"] = *req.Currency
	}
	logger.Info("account.updated", "Cuenta actualizada", logData)

	// Retornar la cuenta actualizada
	c.JSON(http.StatusOK, gin.H{
		"message": "Cuenta actualizada exitosamente",
		"account": account,
	})
}
