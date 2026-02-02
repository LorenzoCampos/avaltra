/**
 * ============================================================================
 * USER TYPES
 * ============================================================================
 * Tipos para el módulo de User Settings (perfil, seguridad, preferencias)
 */

/**
 * Usuario - Representa el perfil completo del usuario autenticado
 */
export interface User {
  id: string;
  email: string;
  name: string;
  default_account_id?: string | null;
  created_at: string;
}

/**
 * UpdateProfileRequest - Request para actualizar nombre del usuario
 * NOTA: El email NO es editable (inmutable después del registro)
 */
export interface UpdateProfileRequest {
  name: string;
}

/**
 * ChangePasswordRequest - Request para cambiar contraseña
 * Requiere contraseña actual para validación de seguridad
 */
export interface ChangePasswordRequest {
  current_password: string;
  new_password: string;
}

/**
 * SetDefaultAccountRequest - Request para setear/limpiar cuenta por defecto
 * Si account_id es null, limpia la cuenta por defecto
 */
export interface SetDefaultAccountRequest {
  account_id: string | null;
}

/**
 * DeleteAccountRequest - Request para eliminar cuenta (DANGER ZONE)
 * Requiere contraseña + confirmación manual "DELETE"
 * IMPORTANTE: Esta acción es IRREVERSIBLE
 */
export interface DeleteAccountRequest {
  password: string;
  confirmation: string; // Debe ser exactamente "DELETE"
}
