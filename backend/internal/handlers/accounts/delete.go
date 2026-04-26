package accounts

import (
	"net/http"

	"github.com/LorenzoCampos/avaltra/internal/middleware"
	"github.com/LorenzoCampos/avaltra/pkg/logger"
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5"
)

const (
	defaultSavingsGoalName         = "Ahorro General"
	defaultSavingsGoalTargetAmount = 9999999999.99
)

// DeleteAccount maneja DELETE /api/accounts/:id
// Elimina una cuenta solo si no tiene datos asociados (expenses, incomes, savings_goals)
// Si tiene datos, retorna un error 409 (Conflict)
func (h *Handler) DeleteAccount(c *gin.Context) {
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

	ctx := c.Request.Context()

	// Iniciar transacción para eliminar la cuenta y sus family_members
	tx, err := h.db.Pool.Begin(ctx)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Error iniciando transacción",
			"details": err.Error(),
		})
		return
	}
	defer tx.Rollback(ctx) // Rollback automático si no se hace Commit

	// Bloquear la cuenta dentro de la transacción para evitar carreras entre la validación
	// y la eliminación.
	err = tx.QueryRow(ctx,
		`SELECT id FROM accounts WHERE id = $1 AND user_id = $2 FOR UPDATE`,
		accountID,
		userID,
	).Scan(&accountID)
	if err != nil {
		if err == pgx.ErrNoRows {
			c.JSON(http.StatusNotFound, gin.H{
				"error": "Cuenta no encontrada o no pertenece al usuario",
			})
			return
		}

		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Error verificando cuenta",
			"details": err.Error(),
		})
		return
	}

	// Verificar que no tenga datos asociados activos.
	var hasExpenses, hasIncomes, hasGoals bool

	err = tx.QueryRow(ctx,
		`SELECT EXISTS(SELECT 1 FROM expenses WHERE account_id = $1 AND deleted_at IS NULL LIMIT 1)`,
		accountID,
	).Scan(&hasExpenses)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Error verificando gastos",
			"details": err.Error(),
		})
		return
	}

	err = tx.QueryRow(ctx,
		`SELECT EXISTS(SELECT 1 FROM incomes WHERE account_id = $1 AND deleted_at IS NULL LIMIT 1)`,
		accountID,
	).Scan(&hasIncomes)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Error verificando ingresos",
			"details": err.Error(),
		})
		return
	}

	err = tx.QueryRow(ctx,
		`SELECT EXISTS(
			SELECT 1
			FROM savings_goals
			WHERE account_id = $1
			  AND is_active = true
			  AND NOT (
				name = $2
				AND deadline IS NULL
				AND target_amount = $3
			  )
			LIMIT 1
		)`,
		accountID,
		defaultSavingsGoalName,
		defaultSavingsGoalTargetAmount,
	).Scan(&hasGoals)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Error verificando metas de ahorro",
			"details": err.Error(),
		})
		return
	}

	if hasExpenses || hasIncomes || hasGoals {
		conflicts := []string{}
		blockingResources := map[string]bool{}

		if hasExpenses {
			conflicts = append(conflicts, "gastos")
			blockingResources["expenses"] = true
		}
		if hasIncomes {
			conflicts = append(conflicts, "ingresos")
			blockingResources["incomes"] = true
		}
		if hasGoals {
			conflicts = append(conflicts, "metas de ahorro")
			blockingResources["savings_goals"] = true
		}

		c.JSON(http.StatusConflict, gin.H{
			"error":              "No se puede eliminar la cuenta porque tiene datos asociados activos",
			"conflicts":          conflicts,
			"blocking_resources": blockingResources,
			"suggestion":         "Elimine o archive primero los datos activos asociados antes de eliminar la cuenta",
		})
		return
	}

	// Eliminar family_members si existen (si es cuenta family)
	_, err = tx.Exec(ctx, `DELETE FROM family_members WHERE account_id = $1`, accountID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Error eliminando miembros de la familia",
			"details": err.Error(),
		})
		return
	}

	// Eliminar custom categories asociadas a esta cuenta
	// Las categorías del sistema (is_system = true) NO se eliminan
	_, err = tx.Exec(ctx, `DELETE FROM expense_categories WHERE account_id = $1 AND is_system = false`, accountID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Error eliminando categorías de gastos personalizadas",
			"details": err.Error(),
		})
		return
	}

	_, err = tx.Exec(ctx, `DELETE FROM income_categories WHERE account_id = $1 AND is_system = false`, accountID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Error eliminando categorías de ingresos personalizadas",
			"details": err.Error(),
		})
		return
	}

	// Eliminar la cuenta
	cmdTag, err := tx.Exec(ctx, `DELETE FROM accounts WHERE id = $1 AND user_id = $2`, accountID, userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Error eliminando cuenta",
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

	// Commit de la transacción
	err = tx.Commit(ctx)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Error confirmando eliminación",
			"details": err.Error(),
		})
		return
	}

	// Log de cuenta eliminada
	logger.Info("account.deleted", "Cuenta eliminada", map[string]interface{}{
		"account_id": accountID,
		"user_id":    userID,
		"ip":         c.ClientIP(),
	})

	// Retornar éxito
	c.JSON(http.StatusOK, gin.H{
		"message":   "Cuenta eliminada exitosamente",
		"accountId": accountID,
	})
}
