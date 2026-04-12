-- Migration 019: Agregar verificación de email y tabla email_tokens
-- Soporta el flujo de verificación de email y restablecimiento de contraseña

-- Agregar columna email_verified a users (todos los existentes quedan como no verificados)
ALTER TABLE users
ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN users.email_verified IS 'Indica si el usuario verificó su dirección de email';

-- Crear tabla email_tokens para almacenar tokens de verificación y reset de contraseña
CREATE TABLE IF NOT EXISTS email_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(64) NOT NULL,
    token_type VARCHAR(20) NOT NULL CHECK (token_type IN ('verification', 'password_reset')),
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índice para búsqueda rápida por hash (validación de tokens)
CREATE INDEX IF NOT EXISTS idx_email_tokens_hash ON email_tokens(token_hash);

-- Índice para invalidar tokens previos del mismo tipo para un usuario
CREATE INDEX IF NOT EXISTS idx_email_tokens_user_type ON email_tokens(user_id, token_type);

-- Comentarios para documentación
COMMENT ON TABLE email_tokens IS 'Tokens de un solo uso para verificación de email y restablecimiento de contraseña';
COMMENT ON COLUMN email_tokens.id IS 'Identificador único del token';
COMMENT ON COLUMN email_tokens.user_id IS 'Usuario al que pertenece el token';
COMMENT ON COLUMN email_tokens.token_hash IS 'SHA-256 del token en hex — NUNCA almacenar el token en texto plano';
COMMENT ON COLUMN email_tokens.token_type IS 'Tipo de token: verification (24h) o password_reset (1h)';
COMMENT ON COLUMN email_tokens.expires_at IS 'Timestamp de expiración del token';
COMMENT ON COLUMN email_tokens.used_at IS 'Timestamp de cuando fue usado — NULL = aún válido';
COMMENT ON COLUMN email_tokens.created_at IS 'Timestamp de creación del token';
