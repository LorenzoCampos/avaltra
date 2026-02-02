import { useTranslation } from 'react-i18next';

interface TProps {
  children: string;
  ns?: string;
  values?: Record<string, any>;
}

/**
 * Translation wrapper component
 * Permite traducir strings sin modificar mucho el código existente
 * 
 * Uso:
 *   <T>Save</T>                    → "Guardar" (si idioma es ES)
 *   <T ns="auth">Sign In</T>       → Busca en namespace "auth"
 *   <T values={{name: "Juan"}}>Hello {{name}}</T>
 */
export function T({ children, ns = 'common', values }: TProps) {
  const { t } = useTranslation(ns);
  
  // Usa el string en inglés como key
  // Si no encuentra traducción, muestra el inglés (fallback)
  return <>{t(children, { defaultValue: children, ...values })}</>;
}
