-- Migration 019 DOWN: Revertir verificación de email y tabla email_tokens

-- Eliminar tabla email_tokens (elimina también los índices)
DROP TABLE IF EXISTS email_tokens;

-- Eliminar columna email_verified de users
ALTER TABLE users
DROP COLUMN IF EXISTS email_verified;
