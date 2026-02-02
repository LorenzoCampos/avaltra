import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Select } from '@/components/ui/Select';
import { FormSkeleton } from '@/components/ui/Skeleton';
import { useExpenses, useExpenseCategories, useFamilyMembers } from '@/hooks/useExpenses';
import { useAccountStore } from '@/stores/account.store';
import { useUser } from '@/hooks/useUser';
import { useAccounts } from '@/hooks/useAccounts';
import { expenseSchema } from '@/schemas/expense.schema';
import type { CreateExpenseRequest } from '@/types/expense';
import type { Currency } from '@/schemas/account.schema';

export const ExpenseForm = () => {
  const { t } = useTranslation('expenses');
  const { expenseId } = useParams<{ expenseId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { activeAccount } = useAccountStore();
  const { data: user } = useUser();
  const { accounts } = useAccounts();
  const {
    createExpense,
    isCreatingExpense,
    createExpenseError,
    createExpenseSuccess,
    updateExpense,
    isUpdatingExpense,
    updateExpenseError,
    updateExpenseSuccess,
    useExpense,
  } = useExpenses();

  const { data: expenseData, isLoading: isLoadingExpense, error: loadExpenseError } = useExpense(expenseId);
  const { data: categories, isLoading: isLoadingCategories } = useExpenseCategories();
  const { data: familyMembers, isLoading: isLoadingFamilyMembers } = useFamilyMembers();

  const [redirectCountdown, setRedirectCountdown] = useState<number | null>(null);
  const isEditing = !!expenseId;

  // ============================================================================
  // DEFAULTS INTELIGENTES
  // ============================================================================
  // Prioridad: 1) Active Account (si está seleccionado manualmente)
  //            2) Default Account del usuario (de Settings)
  //            3) Primera cuenta disponible
  const defaultAccount = activeAccount 
                      || accounts.find(a => a.id === user?.default_account_id) 
                      || accounts[0];
  const defaultCurrency = defaultAccount?.currency || 'ARS' as Currency;
  const defaultDate = new Date().toISOString().split('T')[0]; // HOY
  const lastCategoryId = localStorage.getItem('lastExpenseCategoryId') || null;

  const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm<CreateExpenseRequest>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      description: '',
      amount: 0,
      currency: defaultCurrency,
      date: defaultDate,
      category_id: lastCategoryId,
      family_member_id: null,
    },
    mode: 'onChange',
  });

  const selectedCurrency = watch('currency');
  const showMultiCurrencyFields = activeAccount && selectedCurrency !== activeAccount.currency;

  // ============================================================================
  // AUTO-COMPLETAR CURRENCY basado en default account (solo para nuevos gastos)
  // ============================================================================
  useEffect(() => {
    if (!isEditing && defaultAccount) {
      setValue('currency', defaultAccount.currency);
    }
  }, [defaultAccount, isEditing, setValue]);

  // Load expense data if editing
  useEffect(() => {
    if (isEditing && expenseData) {
      setValue('description', expenseData.description);
      setValue('amount', expenseData.amount);
      setValue('currency', expenseData.currency);
      setValue('date', expenseData.date);
      setValue('category_id', expenseData.category_id);
      setValue('family_member_id', expenseData.family_member_id);
      
      // Load amount_in_primary_currency if it exists (for multi-currency expenses)
      // Set with a small delay to ensure the multi-currency field is rendered first
      if (expenseData.amount_in_primary_currency !== null && expenseData.amount_in_primary_currency !== undefined) {
        // Only set if it's different from the regular amount (indicating a multi-currency transaction)
        if (expenseData.amount_in_primary_currency !== expenseData.amount) {
          setTimeout(() => {
            setValue('amount_in_primary_currency', expenseData.amount_in_primary_currency);
          }, 0);
        }
      }
    }
  }, [isEditing, expenseData, setValue]);

  // Handle duplicate: pre-fill form with existing data (except date)
  useEffect(() => {
    const duplicateData = location.state?.duplicateFrom;
    if (duplicateData && !isEditing) {
      setValue('description', duplicateData.description);
      setValue('amount', duplicateData.amount);
      setValue('currency', duplicateData.currency);
      if (duplicateData.category_id) {
        setValue('category_id', duplicateData.category_id);
      }
      if (duplicateData.family_member_id) {
        setValue('family_member_id', duplicateData.family_member_id);
      }
      // Date uses default (today) - not copied from original
    }
  }, [location.state, isEditing, setValue]);

  // Handle success with countdown and redirect
  useEffect(() => {
    const isSuccess = isEditing ? updateExpenseSuccess : createExpenseSuccess;

    if (isSuccess && redirectCountdown === null) {
      const action = isEditing ? t('form.updated') : t('form.created');
      
      toast.success(t(`form.success.${isEditing ? 'update' : 'create'}`), {
        description: t('form.success.redirecting'),
        duration: 3000,
      });

      setRedirectCountdown(3);

      const countdownInterval = setInterval(() => {
        setRedirectCountdown((prev) => {
          if (prev === null || prev <= 1) {
            clearInterval(countdownInterval);
            navigate('/expenses');
            return null;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(countdownInterval);
    }
  }, [createExpenseSuccess, updateExpenseSuccess, isEditing, redirectCountdown, navigate]);

  // Handle errors
  useEffect(() => {
    const error = isEditing ? updateExpenseError : createExpenseError;
    if (error) {
      const apiError = error as any;
      toast.error(t('form.error.save'), {
        description: apiError.response?.data?.error || apiError.message || t('form.error.tryAgain'),
      });
    }
  }, [createExpenseError, updateExpenseError, isEditing, t]);

  const onSubmit = (data: CreateExpenseRequest) => {
    // ============================================================================
    // GUARDAR ÚLTIMA CATEGORÍA USADA (para próxima vez)
    // ============================================================================
    if (data.category_id) {
      localStorage.setItem('lastExpenseCategoryId', data.category_id);
    }

    if (isEditing && expenseId) {
      updateExpense({
        id: expenseId,
        ...data
      });
    } else {
      createExpense(data);
    }
  };

  const categoryOptions = categories?.map(cat => ({ label: cat.name, value: cat.id })) || [];
  const memberOptions = familyMembers?.map(member => ({ label: member.name, value: member.id })) || [];

  const currencyOptions = [
    { label: t('form.currency.ars'), value: 'ARS' },
    { label: t('form.currency.usd'), value: 'USD' },
    { label: t('form.currency.eur'), value: 'EUR' },
  ];

  if (isLoadingExpense || isLoadingCategories || isLoadingFamilyMembers) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="mb-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/expenses')}>
            ← {t('form.backToList')}
          </Button>
        </div>
        <FormSkeleton fields={6} />
      </div>
    );
  }

  if (loadExpenseError) {
    const errorMsg = (loadExpenseError as Error).message || t('form.error.unknown');
    return (
      <Card>
        <CardContent className="py-10 text-center">
          <p className="text-red-600 mb-4">{t('form.error.loading')}: {errorMsg}</p>
          <Button onClick={() => navigate('/expenses')}>{t('form.backToList')}</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/expenses')}>
          ← {t('form.backToList')}
        </Button>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>{isEditing ? t('form.titleEdit') : t('form.titleCreate')}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {redirectCountdown !== null && (
              <div className="p-4 rounded-lg bg-green-50 border border-green-200 animate-scale-in">
                <p className="text-sm text-green-800 font-medium">
                  ✅ {t(`form.success.${isEditing ? 'update' : 'create'}`)}
                </p>
                <p className="text-xs text-green-700 mt-1">
                  {t('form.success.redirectingIn', { seconds: redirectCountdown })}
                </p>
              </div>
            )}

            <Input
              label={t('form.description')}
              type="text"
              placeholder={t('form.descriptionPlaceholder')}
              error={errors.description?.message}
              {...register('description')}
            />

            <Input
              label={t('form.amount')}
              type="number"
              step="0.01"
              placeholder={t('form.amountPlaceholder')}
              error={errors.amount?.message}
              {...register('amount', { valueAsNumber: true })}
            />

            <Select
              label={t('form.currencyLabel')}
              options={currencyOptions}
              error={errors.currency?.message}
              {...register('currency')}
            />

            {showMultiCurrencyFields && (
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg space-y-3 transition-colors duration-200">
                <div className="flex items-start gap-2">
                  <span className="text-blue-600 dark:text-blue-400 text-sm">💱</span>
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-300 mb-1">
                      {t('form.multiCurrency.title')}
                    </h4>
                    <p className="text-xs text-blue-700 dark:text-blue-400 mb-3">
                      {t('form.multiCurrency.description', { 
                        expenseCurrency: selectedCurrency, 
                        accountCurrency: activeAccount?.currency 
                      })}
                    </p>
                  </div>
                </div>

                <Input
                  label={t('form.multiCurrency.amountLabel', { currency: activeAccount?.currency })}
                  type="number"
                  step="0.01"
                  placeholder={t('form.multiCurrency.amountPlaceholder', { currency: activeAccount?.currency })}
                  error={errors.amount_in_primary_currency?.message}
                  {...register('amount_in_primary_currency', { valueAsNumber: true })}
                  helperText={t('form.multiCurrency.helper')}
                />

                <div className="text-xs text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30 p-2 rounded">
                  <strong>{t('form.multiCurrency.exampleLabel')}:</strong> {t('form.multiCurrency.exampleText')}
                </div>
              </div>
            )}

            <Input
              label={t('form.date')}
              type="date"
              error={errors.date?.message}
              {...register('date')}
            />

            <Select
              label={t('form.category')}
              options={[{ label: t('common:common.noCategory'), value: '' }, ...categoryOptions]}
              error={errors.category_id?.message}
              {...register('category_id')}
              disabled={isLoadingCategories}
              helperText={isLoadingCategories ? t('form.loadingCategories') : undefined}
            />

            {activeAccount?.type === 'family' && (
              <Select
                label={t('form.familyMember')}
                options={[{ label: t('form.noMember'), value: '' }, ...memberOptions]}
                error={errors.family_member_id?.message}
                {...register('family_member_id')}
                disabled={isLoadingFamilyMembers}
                helperText={isLoadingFamilyMembers ? t('form.loadingMembers') : undefined}
              />
            )}

            <Button
              type="submit"
              fullWidth
              isLoading={isCreatingExpense || isUpdatingExpense}
              disabled={redirectCountdown !== null}
            >
              {isEditing ? t('form.submitEdit') : t('form.submitCreate')}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
