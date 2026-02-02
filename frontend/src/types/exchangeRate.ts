/**
 * ============================================================================
 * EXCHANGE RATE TYPES
 * ============================================================================
 * Tipos para el módulo de Exchange Rates (tasas de cambio)
 */

export interface ExchangeRate {
  id: string;
  from_currency: string;
  to_currency: string;
  rate: number;
  date: string; // YYYY-MM-DD
  created_at: string;
}

export interface CreateExchangeRateRequest {
  from_currency: string;
  to_currency: string;
  rate: number;
  date: string; // YYYY-MM-DD
}

export interface UpdateExchangeRateRequest {
  rate?: number;
  date?: string;
}

export interface ExchangeRatesResponse {
  exchange_rates: ExchangeRate[];
  count: number;
}
