import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { Currency } from '@/types/api';

/**
 * Combina clases de Tailwind CSS de manera eficiente
 * Útil para componentes con estilos condicionales
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface FormatCurrencyOptions {
  language?: string;
}

const MONEY_LOCALES: Record<string, string> = {
  es: 'es-AR',
  en: 'en-US',
};

export function resolveMoneyLocale(language?: string): string {
  const baseLanguage = language?.split('-')[0] ?? 'en';
  return MONEY_LOCALES[baseLanguage] ?? MONEY_LOCALES.en;
}

export function formatCurrency(
  amount: number,
  currency: Currency,
  options: FormatCurrencyOptions = {}
): string {
  return new Intl.NumberFormat(resolveMoneyLocale(options.language), {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Formatea una fecha en formato YYYY-MM-DD a formato legible
 * @param dateString - Fecha en formato YYYY-MM-DD
 * @param formatString - Formato de salida (default: 'dd/MM/yyyy')
 */
export function formatDate(
  dateString: string,
  formatString: string = 'dd/MM/yyyy'
): string {
  const date = new Date(dateString + 'T00:00:00');
  return format(date, formatString, { locale: es });
}

/**
 * Convierte una fecha Date a formato YYYY-MM-DD para la API
 */
export function toApiDateFormat(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

/**
 * Obtiene el primer día del mes actual en formato YYYY-MM-DD
 */
export function getCurrentMonthStart(): string {
  const now = new Date();
  return format(new Date(now.getFullYear(), now.getMonth(), 1), 'yyyy-MM-dd');
}

/**
 * Obtiene el mes actual en formato YYYY-MM
 */
export function getCurrentMonth(): string {
  return format(new Date(), 'yyyy-MM');
}

/**
 * Calcula el porcentaje de progreso
 */
export function calculateProgress(current: number, target: number): number {
  if (target === 0) return 0;
  return Math.min((current / target) * 100, 100);
}
