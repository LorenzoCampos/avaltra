-- Migration 018: Agregar default_account_id a tabla users
-- Este campo permite que el usuario tenga una cuenta predeterminada al hacer login

-- Agregar columna default_account_id (nullable, FK a accounts)
ALTER TABLE users 
ADD COLUMN default_account_id UUID REFERENCES accounts(id) ON DELETE SET NULL;

-- Crear índice para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_users_default_account ON users(default_account_id);

-- Comentario para documentación
COMMENT ON COLUMN users.default_account_id IS 'Cuenta predeterminada del usuario - se selecciona automáticamente al login (opcional)';
