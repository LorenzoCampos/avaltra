import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '@/api/axios';
import { useAuthStore } from '@/stores/auth.store';
import { useAccountStore } from '@/stores/account.store';
import type { LoginRequest, RegisterRequest, AuthResponse } from '@/types/auth';

/**
 * Custom hook for authentication operations
 * Handles login, register, and logout with React Query
 */
export const useAuth = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { setAuth, logout: storeLogout } = useAuthStore();
  const { clearActiveAccount } = useAccountStore();

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginRequest) => {
      console.log('🚀 Making login API call...');
      const response = await api.post<AuthResponse>('/auth/login', credentials);
      console.log('✅ Login API success:', response.data);
      return response.data;
    },
    onSuccess: (data) => {
      console.log('✅ Login mutation onSuccess, saving to store...');
      // Save auth data to Zustand store (which persists to localStorage)
      setAuth(data.user, data.access_token, data.refresh_token);
      console.log('✅ Auth saved, checking onboarding status...');
      
      // Check if user has completed onboarding
      const hasCompletedOnboarding = localStorage.getItem('hasCompletedOnboarding') === 'true';
      
      // Navigate to onboarding for new users, dashboard for returning users
      if (hasCompletedOnboarding) {
        console.log('✅ User completed onboarding, navigating to dashboard...');
        navigate('/dashboard');
      } else {
        console.log('⚠️ User has not completed onboarding, redirecting...');
        navigate('/onboarding');
      }
    },
    onError: (error: any) => {
      console.error('❌ Login error:', error);
      console.error('❌ Error details:', error.response?.data);
      // Error handling is done in the component
    },
  });

  // Register mutation
  const registerMutation = useMutation({
    mutationFn: async (userData: RegisterRequest) => {
      const response = await api.post<AuthResponse>('/auth/register', userData);
      return response.data;
    },
    onSuccess: (data) => {
      console.log('🎉 REGISTER SUCCESS - Starting onboarding check...');
      
      // Save auth data to Zustand store (which persists to localStorage)
      setAuth(data.user, data.access_token, data.refresh_token);
      console.log('✅ Auth saved to store');
      
      // Check if user has completed onboarding
      const hasCompletedOnboarding = localStorage.getItem('hasCompletedOnboarding');
      console.log('🔍 localStorage.hasCompletedOnboarding:', hasCompletedOnboarding);
      console.log('🔍 hasCompletedOnboarding === "true":', hasCompletedOnboarding === 'true');
      
      // Navigate to onboarding for new users, dashboard for returning users
      if (hasCompletedOnboarding === 'true') {
        console.log('➡️ User completed onboarding, navigating to DASHBOARD');
        navigate('/dashboard');
      } else {
        console.log('➡️ User has NOT completed onboarding, navigating to ONBOARDING');
        navigate('/onboarding');
      }
    },
    onError: (error: any) => {
      console.error('Register error:', error);
      // Error handling is done in the component
    },
  });

  // Logout function
  const logout = () => {
    // Clear auth state
    storeLogout();
    
    // Clear account state
    clearActiveAccount();
    
    // Clear all React Query cache
    queryClient.clear();
    
    // Navigate to login
    navigate('/login');
  };

  return {
    // Login
    login: loginMutation.mutate,
    loginAsync: loginMutation.mutateAsync,
    isLoggingIn: loginMutation.isPending,
    loginError: loginMutation.error,
    
    // Register
    register: registerMutation.mutate,
    registerAsync: registerMutation.mutateAsync,
    isRegistering: registerMutation.isPending,
    registerError: registerMutation.error,
    
    // Logout
    logout,
  };
};
