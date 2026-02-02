/**
 * ============================================================================
 * ONBOARDING TYPES
 * ============================================================================
 */

export interface AccountData {
  name: string;
  currency: 'ARS' | 'USD' | 'EUR';
  type: 'personal' | 'family';
}

export interface ExpenseData {
  description: string;
  amount: number;
}

export type OnboardingStep = 1 | 2 | 3 | 4;

export interface OnboardingState {
  currentStep: OnboardingStep;
  accountData: AccountData;
  expenseData: ExpenseData;
  hasCompletedOnboarding: boolean;
}
