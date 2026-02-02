/**
 * ============================================================================
 * USER SETTINGS HOOKS
 * ============================================================================
 * Hooks para manejar el perfil del usuario, seguridad y preferencias
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/api/axios';
import { useAuthStore } from '@/stores/auth.store';
import type {
  User,
  UpdateProfileRequest,
  ChangePasswordRequest,
  SetDefaultAccountRequest,
  DeleteAccountRequest,
} from '@/types/user';

/**
 * useUser - Obtiene el perfil del usuario autenticado
 * GET /api/users/me
 */
export const useUser = () => {
  return useQuery<User>({
    queryKey: ['user', 'me'],
    queryFn: async () => {
      const response = await api.get<User>('/users/me');
      return response.data;
    },
    staleTime: 1000 * 60 * 5, // 5 minutos - el perfil no cambia seguido
    retry: 1, // Solo reintentar 1 vez si falla
  });
};

/**
 * useUpdateProfile - Actualiza el nombre del usuario
 * PUT /api/users/me
 * NOTA: El email NO es editable
 */
export const useUpdateProfile = () => {
  const queryClient = useQueryClient();
  const updateUser = useAuthStore((state) => state.updateUser);

  return useMutation({
    mutationFn: async (data: UpdateProfileRequest) => {
      const response = await api.put<User>('/users/me', data);
      return response.data;
    },
    onSuccess: (updatedUser) => {
      // Actualizar cache de React Query
      queryClient.setQueryData(['user', 'me'], updatedUser);
      
      // Actualizar authStore (localStorage + state) para que la navbar se actualice
      updateUser(updatedUser);
      
      toast.success('Perfil actualizado', {
        description: 'Tu nombre se actualizó correctamente',
      });
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.error || 'Error al actualizar perfil';
      toast.error('Error', {
        description: errorMessage,
      });
    },
  });
};

/**
 * useChangePassword - Cambia la contraseña del usuario
 * PUT /api/users/me/password
 * Requiere contraseña actual para validación
 */
export const useChangePassword = () => {
  return useMutation({
    mutationFn: async (data: ChangePasswordRequest) => {
      const response = await api.put('/users/me/password', data);
      return response.data;
    },
    onSuccess: () => {
      toast.success('Contraseña actualizada', {
        description: 'Tu contraseña se cambió correctamente',
      });
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.error || 'Error al cambiar contraseña';
      toast.error('Error', {
        description: errorMessage,
      });
    },
  });
};

/**
 * useSetDefaultAccount - Setea o limpia la cuenta por defecto del usuario
 * PUT /api/users/me/default-account
 * Si account_id es null, limpia la cuenta por defecto
 */
export const useSetDefaultAccount = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: SetDefaultAccountRequest) => {
      const response = await api.put<User>('/users/me/default-account', data);
      return response.data;
    },
    onSuccess: (updatedUser) => {
      // Actualizar cache del usuario
      queryClient.setQueryData(['user', 'me'], updatedUser);
      
      const message = updatedUser.default_account_id
        ? 'Cuenta por defecto configurada'
        : 'Cuenta por defecto eliminada';
      
      toast.success(message, {
        description: updatedUser.default_account_id
          ? 'Esta cuenta se usará por defecto en nuevas transacciones'
          : 'Ya no hay cuenta por defecto configurada',
      });
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.error || 'Error al configurar cuenta por defecto';
      toast.error('Error', {
        description: errorMessage,
      });
    },
  });
};

/**
 * useDeleteAccount - Elimina la cuenta del usuario (DANGER ZONE)
 * DELETE /api/users/me
 * Requiere contraseña + confirmación "DELETE"
 * IMPORTANTE: Esta acción es IRREVERSIBLE
 */
export const useDeleteAccount = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: DeleteAccountRequest) => {
      const response = await api.delete('/users/me', { data });
      return response.data;
    },
    onSuccess: () => {
      // Limpiar TODA la cache
      queryClient.clear();
      
      toast.success('Cuenta eliminada', {
        description: 'Tu cuenta se eliminó permanentemente. Serás redirigido al login...',
      });

      // Redirigir al login después de 2 segundos
      setTimeout(() => {
        // Limpiar localStorage (tokens)
        localStorage.clear();
        sessionStorage.clear();
        
        // Redirigir al login
        window.location.href = '/login';
      }, 2000);
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.error || 'Error al eliminar cuenta';
      toast.error('Error', {
        description: errorMessage,
      });
    },
  });
};
