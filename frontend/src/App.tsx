import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';

import { Login } from '@/features/auth/Login';
import { Register } from '@/features/auth/Register';
import { ForgotPassword } from '@/features/auth/ForgotPassword';
import { ResetPassword } from '@/features/auth/ResetPassword';
import { VerifyEmail } from '@/features/auth/VerifyEmail';
import { Dashboard } from '@/features/dashboard/Dashboard';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Layout } from '@/components/Layout';
import { AccountList } from '@/features/accounts/AccountList';
import { AccountForm } from '@/features/accounts/AccountForm';
import { ExpensesPage } from '@/features/expenses/ExpensesPage';
import { ExpenseForm } from '@/features/expenses/ExpenseForm';
import { IncomesPage } from '@/features/incomes/IncomesPage';
import { IncomeForm } from '@/features/incomes/IncomeForm';
import { ReportsPage } from '@/features/reports/ReportsPage';
import { SavingsList } from '@/features/savings/SavingsList';
import { SavingsForm } from '@/features/savings/SavingsForm';
import { ActivityPage } from '@/features/activity/ActivityPage';
import { RecurringExpenseForm } from '@/features/recurring-expenses/RecurringExpenseForm';
import { RecurringIncomeForm } from '@/features/recurring-incomes/RecurringIncomeForm';
import { CategoriesList } from '@/features/categories/CategoriesList';
import { CategoryForm } from '@/features/categories/CategoryForm';
import UserSettings from '@/features/settings/UserSettings';
import { OnboardingWizard } from '@/features/onboarding/OnboardingWizard';

import { useAuthStore, selectIsAuthenticated } from '@/stores/auth.store';

function App() {
  const isAuthenticated = useAuthStore(selectIsAuthenticated);
  
  // Read directly from localStorage without writing default value
  const hasCompletedOnboarding = (() => {
    try {
      const value = localStorage.getItem('hasCompletedOnboarding');
      return value === 'true';
    } catch {
      return false;
    }
  })();

  return (
    <>
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route
            path="/login"
            element={
              isAuthenticated ? (
                <Navigate to={hasCompletedOnboarding ? "/dashboard" : "/onboarding"} replace />
              ) : (
                <Login />
              )
            }
          />
          <Route
            path="/register"
            element={
              isAuthenticated ? (
                <Navigate to={hasCompletedOnboarding ? "/dashboard" : "/onboarding"} replace />
              ) : (
                <Register />
              )
            }
          />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/verify-email" element={<VerifyEmail />} />

          {/* Protected Routes */}
          <Route element={<ProtectedRoute />}>
            {/* Onboarding - Always available, wizard handles redirect if completed */}
            <Route path="/onboarding" element={<OnboardingWizard />} />

            <Route element={<Layout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              
              {/* Accounts Routes */}
              <Route path="/accounts" element={<AccountList />} />
              <Route path="/accounts/new" element={<AccountForm />} />
              <Route path="/accounts/edit/:accountId" element={<AccountForm />} />

              {/* Expenses Routes (con tabs para Expenses y Recurring) */}
              <Route path="/expenses" element={<ExpensesPage />} />
              <Route path="/expenses/new" element={<ExpenseForm />} />
              <Route path="/expenses/edit/:expenseId" element={<ExpenseForm />} />
              <Route path="/expenses/recurring/new" element={<RecurringExpenseForm />} />
              <Route path="/expenses/recurring/edit/:id" element={<RecurringExpenseForm />} />

              {/* Incomes Routes (con tabs para Incomes y Recurring) */}
              <Route path="/incomes" element={<IncomesPage />} />
              <Route path="/incomes/new" element={<IncomeForm />} />
              <Route path="/incomes/edit/:incomeId" element={<IncomeForm />} />
              <Route path="/incomes/recurring/new" element={<RecurringIncomeForm />} />
              <Route path="/incomes/recurring/edit/:id" element={<RecurringIncomeForm />} />

              {/* Redirects antiguos (para compatibilidad) */}
              <Route path="/recurring-expenses" element={<Navigate to="/expenses" replace />} />
              <Route path="/recurring-expenses/new" element={<Navigate to="/expenses/recurring/new" replace />} />
              <Route path="/recurring-expenses/edit/:id" element={<Navigate to="/expenses/recurring/edit/:id" replace />} />
              <Route path="/recurring-incomes" element={<Navigate to="/incomes" replace />} />
              <Route path="/recurring-incomes/new" element={<Navigate to="/incomes/recurring/new" replace />} />
              <Route path="/recurring-incomes/edit/:id" element={<Navigate to="/incomes/recurring/edit/:id" replace />} />

              {/* Reports Route */}
              <Route path="/reports" element={<ReportsPage />} />

              {/* Activity Route */}
              <Route path="/activity" element={<ActivityPage />} />

              {/* Savings Routes */}
              <Route path="/savings" element={<SavingsList />} />
              <Route path="/savings/new" element={<SavingsForm />} />
              <Route path="/savings/edit/:goalId" element={<SavingsForm />} />

              {/* Categories Routes */}
              <Route path="/categories" element={<CategoriesList />} />
              <Route path="/categories/new/:type" element={<CategoryForm />} />
              <Route path="/categories/edit/:type/:id" element={<CategoryForm />} />

              {/* Settings Route */}
              <Route path="/settings" element={<UserSettings />} />
            </Route>
          </Route>

          {/* Root redirect */}
          <Route
            path="/"
            element={
              <Navigate to={isAuthenticated ? '/dashboard' : '/login'} replace />
            }
          />

          {/* 404 Not Found */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>

      {/* Toast Notifications - Global */}
      <Toaster 
        position="top-right" 
        richColors 
        closeButton
        duration={4000}
      />
    </>
  );
}

export default App;
