/**
 * ============================================================================
 * USE ONBOARDING HOOK
 * ============================================================================
 * Hook para manejar el estado del onboarding wizard
 */

import { useState } from 'react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import type { OnboardingStep, AccountData, ExpenseData } from '../types';

export const useOnboarding = () => {
  // Estado persistente en localStorage
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useLocalStorage(
    'hasCompletedOnboarding',
    false
  );

  // Estado del wizard
  const [currentStep, setCurrentStep] = useState<OnboardingStep>(1);
  const [accountData, setAccountData] = useState<AccountData>({
    name: '',
    currency: 'ARS',
    type: 'personal',
  });
  const [expenseData, setExpenseData] = useState<ExpenseData>({
    description: '',
    amount: 0,
  });

  // Navegación entre steps
  const goToNextStep = () => {
    if (currentStep < 4) {
      setCurrentStep((prev) => (prev + 1) as OnboardingStep);
    }
  };

  const goToPreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => (prev - 1) as OnboardingStep);
    }
  };

  const goToStep = (step: OnboardingStep) => {
    setCurrentStep(step);
  };

  // Completar onboarding
  const completeOnboarding = () => {
    setHasCompletedOnboarding(true);
  };

  // Reset (para testing)
  const resetOnboarding = () => {
    setHasCompletedOnboarding(false);
    setCurrentStep(1);
    setAccountData({
      name: '',
      currency: 'ARS',
      type: 'personal',
    });
    setExpenseData({
      description: '',
      amount: 0,
    });
  };

  return {
    // Estado
    hasCompletedOnboarding,
    currentStep,
    accountData,
    expenseData,

    // Setters
    setAccountData,
    setExpenseData,

    // Navegación
    goToNextStep,
    goToPreviousStep,
    goToStep,

    // Acciones
    completeOnboarding,
    resetOnboarding,
  };
};
