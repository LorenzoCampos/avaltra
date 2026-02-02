/**
 * ============================================================================
 * ONBOARDING WIZARD
 * ============================================================================
 * Wizard principal que orquesta todos los pasos del onboarding
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

import { useOnboarding } from './hooks/useOnboarding';
import { WelcomeStep } from './steps/WelcomeStep';
import { CreateAccountStep } from './steps/CreateAccountStep';
import { FirstExpenseStep } from './steps/FirstExpenseStep';
import { CompletedStep } from './steps/CompletedStep';

import { useCreateAccount } from '@/hooks/useAccounts';
import { useCreateExpense } from '@/hooks/useExpenses';
import { useAccountStore } from '@/stores/account.store';
import { analytics } from '@/lib/analytics';

import type { AccountData, ExpenseData } from './types';

export const OnboardingWizard = () => {
  const { t } = useTranslation('onboarding');
  const navigate = useNavigate();

  // Redirect to dashboard if already completed onboarding
  useEffect(() => {
    const hasCompleted = localStorage.getItem('hasCompletedOnboarding') === 'true';
    if (hasCompleted) {
      console.log('✅ Onboarding already completed, redirecting to dashboard');
      navigate('/dashboard', { replace: true });
    }
  }, [navigate]);

  const {
    currentStep,
    accountData,
    expenseData,
    setAccountData,
    setExpenseData,
    goToNextStep,
    goToPreviousStep,
    completeOnboarding,
  } = useOnboarding();

  const { setActiveAccount } = useAccountStore();
  const { mutateAsync: createAccount, isPending: isCreatingAccount } = useCreateAccount();
  const { mutateAsync: createExpense, isPending: isCreatingExpense } = useCreateExpense();

  const [createdAccountId, setCreatedAccountId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [onboardingStartTime] = useState(Date.now());

  // Track onboarding start
  useEffect(() => {
    analytics.onboardingStarted();
  }, []);

  // ============================================================================
  // STEP 1: Welcome
  // ============================================================================
  const handleStart = () => {
    analytics.onboardingStepCompleted(1);
    goToNextStep();
  };

  const handleSkip = () => {
    analytics.onboardingSkipped(1);
    completeOnboarding();
    navigate('/dashboard');
  };

  // ============================================================================
  // STEP 2: Create Account
  // ============================================================================
  const handleCreateAccount = async (data: AccountData) => {
    setIsProcessing(true);
    try {
      // Guardar datos
      setAccountData(data);

      console.log('🏦 Creating account...');
      // Crear cuenta en el backend (siempre personal en onboarding)
      const newAccount = await createAccount({
        name: data.name,
        currency: data.currency,
        type: 'personal', // Siempre personal en onboarding
      });

      console.log('✅ Account created:', newAccount);
      console.log('🔍 Full account object:', JSON.stringify(newAccount, null, 2));
      console.log('🆔 Account ID:', newAccount.id);
      console.log('🆔 All keys:', Object.keys(newAccount));

      // Guardar ID de la cuenta creada
      setCreatedAccountId(newAccount.id);

      // Setear como cuenta activa
      setActiveAccount(newAccount.id, newAccount);
      console.log('✅ Active account set in store');

      // Mostrar éxito
      toast.success(t('completed.success.accountCreated'));

      // Track first account created
      analytics.firstAccountCreated(data.currency, 'personal');
      analytics.onboardingStepCompleted(2);

      // Ir al siguiente paso
      goToNextStep();
    } catch (error) {
      console.error('❌ Error creating account:', error);
      toast.error('Error al crear la cuenta. Intentá de nuevo.');
    } finally {
      setIsProcessing(false);
    }
  };

  // ============================================================================
  // STEP 3: First Expense (Optional)
  // ============================================================================
  const handleAddExpense = async (data: ExpenseData) => {
    console.log('💰 handleAddExpense called');
    console.log('🆔 createdAccountId:', createdAccountId);
    console.log('🆔 activeAccountId from store:', useAccountStore.getState().activeAccountId);
    
    if (!createdAccountId) {
      console.error('❌ No createdAccountId found');
      toast.error('Error: No se encontró la cuenta creada');
      return;
    }

    setIsProcessing(true);
    try {
      // Guardar datos
      setExpenseData(data);

      console.log('💰 Creating expense with data:', {
        description: data.description,
        amount: data.amount,
        currency: accountData.currency,
        date: new Date().toISOString().split('T')[0],
      });

      // Crear gasto en el backend (el account_id se envía automáticamente por el hook)
      await createExpense({
        description: data.description,
        amount: data.amount,
        currency: accountData.currency,
        date: new Date().toISOString().split('T')[0], // Fecha de hoy
      });

      console.log('✅ Expense created successfully');

      // Mostrar éxito
      toast.success(t('completed.success.expenseCreated'));

      // Track first expense created
      analytics.firstExpenseCreated(data.amount, accountData.currency);
      analytics.onboardingStepCompleted(3);

      // Ir al paso final
      goToNextStep();
    } catch (error) {
      console.error('Error creating expense:', error);
      toast.error('Error al crear el gasto. Intentá de nuevo.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSkipExpense = () => {
    analytics.onboardingStepCompleted(3);
    goToNextStep();
  };

  // ============================================================================
  // STEP 4: Completed
  // ============================================================================
  const handleStartTour = () => {
    // Calculate time spent
    const timeSpentSeconds = Math.floor((Date.now() - onboardingStartTime) / 1000);
    
    // Track completion
    analytics.onboardingCompleted(timeSpentSeconds);
    analytics.tourStarted();

    // Request feature tour
    localStorage.setItem('tourRequested', 'true');
    completeOnboarding();
  };

  // ============================================================================
  // RENDER STEPS
  // ============================================================================
  if (isProcessing || isCreatingAccount || isCreatingExpense) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">
            {isCreatingAccount && 'Creando tu cuenta...'}
            {isCreatingExpense && 'Registrando tu gasto...'}
            {isProcessing && !isCreatingAccount && !isCreatingExpense && 'Procesando...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      {currentStep === 1 && (
        <WelcomeStep
          onStart={handleStart}
          onSkip={handleSkip}
        />
      )}

      {currentStep === 2 && (
        <CreateAccountStep
          accountData={accountData}
          onNext={handleCreateAccount}
          onBack={goToPreviousStep}
        />
      )}

      {currentStep === 3 && (
        <FirstExpenseStep
          expenseData={expenseData}
          currency={accountData.currency}
          onNext={handleAddExpense}
          onSkip={handleSkipExpense}
          onBack={goToPreviousStep}
        />
      )}

      {currentStep === 4 && (
        <CompletedStep
          onStartTour={handleStartTour}
        />
      )}
    </>
  );
};
