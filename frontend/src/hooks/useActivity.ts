import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/axios';

// Types
export type ActivityType = 'income' | 'expense' | 'savings_deposit' | 'savings_withdrawal';

export interface ActivityItem {
  id: string;
  type: ActivityType;
  description: string;
  amount: number;
  currency: string;
  category_name: string | null;
  goal_name: string | null;
  goal_id: string | null;
  date: string; // YYYY-MM-DD
  created_at: string; // ISO 8601
}

export interface ActivitySummary {
  total_income: number;
  total_expenses: number;
  total_savings_deposits: number;
  total_savings_withdrawals: number;
  net_balance: number;
}

export interface ActivityResponse {
  activities: ActivityItem[];
  total_count: number;
  page: number;
  limit: number;
  total_pages: number;
  summary: ActivitySummary;
}

export interface ActivityFilters {
  month?: string; // YYYY-MM
  date_from?: string; // YYYY-MM-DD
  date_to?: string; // YYYY-MM-DD
  page?: number;
  limit?: number;
}

// Hook: Fetch activity timeline
export function useActivity(filters: ActivityFilters = {}) {
  // Incluir active_account_id en el queryKey para que re-fetchee al cambiar cuenta
  const activeAccountId = typeof window !== 'undefined' 
    ? localStorage.getItem('active_account_id') 
    : null;

  return useQuery({
    queryKey: ['activity', activeAccountId, filters],
    queryFn: async () => {
      const params = new URLSearchParams();

      if (filters.month) params.append('month', filters.month);
      if (filters.date_from) params.append('date_from', filters.date_from);
      if (filters.date_to) params.append('date_to', filters.date_to);
      if (filters.page) params.append('page', filters.page.toString());
      if (filters.limit) params.append('limit', filters.limit.toString());

      const queryString = params.toString();
      const url = queryString ? `/activity?${queryString}` : '/activity';
      
      const response = await api.get<ActivityResponse>(url);
      return response.data;
    },
    staleTime: 1000 * 60, // 1 minute
    retry: 1,
    enabled: !!activeAccountId, // Solo fetchear si hay cuenta activa
  });
}

// Helper: Get activity icon by type
export function getActivityIcon(type: ActivityType): string {
  const icons: Record<ActivityType, string> = {
    income: '💰',
    expense: '💸',
    savings_deposit: '🏦',
    savings_withdrawal: '🔓',
  };
  return icons[type];
}

// Helper: Get activity color by type (Tailwind classes)
export function getActivityColor(type: ActivityType): string {
  const colors: Record<ActivityType, string> = {
    income: 'text-green-600 dark:text-green-400',
    expense: 'text-red-600 dark:text-red-400',
    savings_deposit: 'text-blue-600 dark:text-blue-400',
    savings_withdrawal: 'text-orange-600 dark:text-orange-400',
  };
  return colors[type];
}

// Helper: Get activity label by type
export function getActivityLabel(type: ActivityType): string {
  const labels: Record<ActivityType, string> = {
    income: 'Ingreso',
    expense: 'Gasto',
    savings_deposit: 'Depósito a meta',
    savings_withdrawal: 'Retiro de meta',
  };
  return labels[type];
}

// Helper: Format currency
export function formatCurrency(amount: number, currency: string): string {
  const formatter = new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: currency === 'ARS' ? 'ARS' : currency === 'USD' ? 'USD' : 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
  return formatter.format(amount);
}

// Helper: Format date to human readable
export function formatActivityDate(dateString: string): string {
  const date = new Date(dateString);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  // Reset time to compare only dates
  const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const yesterdayOnly = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());

  if (dateOnly.getTime() === todayOnly.getTime()) {
    return 'Hoy';
  } else if (dateOnly.getTime() === yesterdayOnly.getTime()) {
    return 'Ayer';
  } else {
    return new Intl.DateTimeFormat('es-AR', {
      day: 'numeric',
      month: 'short',
      year: dateOnly.getFullYear() !== todayOnly.getFullYear() ? 'numeric' : undefined,
    }).format(date);
  }
}
