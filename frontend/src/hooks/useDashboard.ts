import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/axios';
import { useAccountStore } from '@/stores/account.store';
import type { DashboardSummary } from '@/types/dashboard';

interface DashboardParams {
  month?: string; // YYYY-MM format (optional, defaults to current month)
}

/**
 * Hook para obtener el resumen del dashboard
 * Requiere que haya una cuenta activa seleccionada
 */
export const useDashboard = (params?: DashboardParams) => {
  const { activeAccountId } = useAccountStore();

  const { data, isLoading, error, refetch } = useQuery<DashboardSummary>({
    queryKey: ['dashboard', activeAccountId, params?.month],
    queryFn: async () => {
      if (!activeAccountId) throw new Error('No active account selected');
      
      const response = await api.get<DashboardSummary>('/dashboard/summary', {
        headers: { 'X-Account-ID': activeAccountId },
        params: {
          month: params?.month, // Si no se proporciona, el backend usa el mes actual
        },
      });
      return response.data;
    },
    enabled: !!activeAccountId, // Solo se ejecuta si hay una cuenta activa
    staleTime: 1000 * 60 * 2, // 2 minutos (dashboard se actualiza frecuentemente)
  });

  return {
    dashboard: data,
    isLoading,
    error,
    refetch,
  };
};
