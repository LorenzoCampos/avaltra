import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '@/types/auth';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  
  // Actions
  setAuth: (user: User, accessToken: string, refreshToken: string) => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  updateUser: (user: User) => void;
  logout: () => void;
}

// Selector helper para isAuthenticated
export const selectIsAuthenticated = (state: AuthState) => 
  state.accessToken !== null && state.user !== null;

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,

      setAuth: (user, accessToken, refreshToken) => {
        set({
          user,
          accessToken,
          refreshToken,
        });
      },

      setTokens: (accessToken, refreshToken) => {
        set({ accessToken, refreshToken });
      },

      updateUser: (user) => {
        set({ user });
      },

      logout: () => {
        // Limpiar active account también
        localStorage.removeItem('active_account_id');
        
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
        });
      },

    }),
    {
      name: 'auth-storage',
      // Solo persistir user, accessToken, refreshToken
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
      }),
    }
  )
);
