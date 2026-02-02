import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Select } from '@/components/ui/Select';
import { FormSkeleton } from '@/components/ui/Skeleton';
import { 
  useRecurringIncome, 
  useCreateRecurringIncome, 
  useUpdateRecurringIncome 
} from '@/hooks/useRecurringIncomes';
import { useIncomeCategories, useFamilyMembers } from '@/hooks/useIncomes';
import { useAccountStore } from '@/stores/account.store';
import type { RecurrenceFrequency } from '@/types/recurringIncome';

// Schema will be created inside component to access t() function
const createRecurringIncomeSchema = (t: (key: string) => string) => z.object({
  description: z.string().min(1, t('common:validation.required')),
  amount: z.number().positive(t('common:validation.amountPositive')),
  currency: z.enum(['ARS', 'USD', 'EUR']),
  category_id: z.string().nullable().optional(),
  family_member_id: z.string().nullable().optional(),
  recurrence_frequency: z.enum(['daily', 'weekly', 'monthly', 'yearly']),
  recurrence_interval: z.number().int().positive(t('common:validation.intervalPositive')),
  recurrence_day_of_month: z.number().int().min(1).max(31).nullable().optional(),
  recurrence_day_of_week: z.number().int().min(0).max(6).nullable().optional(),
  start_date: z.string().min(1, t('common:validation.required')),
  end_date: z.string().nullable().optional(),
  total_occurrences: z.number().int().positive().nullable().optional(),
  amount_in_primary_currency: z.number().positive().nullable().optional(),
  is_active: z.boolean().default(true),
}).refine((data) => {
  // If monthly or yearly, require day_of_month
  if ((data.recurrence_frequency === 'monthly' || data.recurrence_frequency === 'yearly') && 
      (!data.recurrence_day_of_month || data.recurrence_day_of_month < 1)) {
    return false;
  }
  return true;
}, {
  message: t('common:validation.dayOfMonthRequired'),
  path: ['recurrence_day_of_month']
}).refine((data) => {
  // If weekly, require day_of_week
  if (data.recurrence_frequency === 'weekly' && 
      (data.recurrence_day_of_week === undefined || data.recurrence_day_of_week === null)) {
    return false;
  }
  return true;
}, {
  message: t('common:validation.dayOfWeekRequired'),
  path: ['recurrence_day_of_week']
});

type RecurringIncomeFormData = z.infer<ReturnType<typeof createRecurringIncomeSchema>>;

export const RecurringIncomeForm = () => {
  const { t } = useTranslation(['recurring', 'common']);
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { activeAccount } = useAccountStore();
  const isEditing = !!id;

  const { data: incomeData, isLoading: isLoadingIncome } = useRecurringIncome(id);
  const { data: categories, isLoading: isLoadingCategories } = useIncomeCategories();
  const { data: familyMembers, isLoading: isLoadingFamilyMembers } = useFamilyMembers();
  const { mutate: createIncome, isPending: isCreating, isSuccess: createSuccess } = useCreateRecurringIncome();
  const { mutate: updateIncome, isPending: isUpdating, isSuccess: updateSuccess } = useUpdateRecurringIncome();

  const [redirectCountdown, setRedirectCountdown] = useState<number | null>(null);

  const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm<RecurringIncomeFormData>({
    resolver: zodResolver(createRecurringIncomeSchema(t)),
    defaultValues: {
      description: '',
      amount: 0,
      currency: (activeAccount?.currency as 'ARS' | 'USD' | 'EUR') || 'ARS',
      category_id: null,
      family_member_id: null,
      recurrence_frequency: 'monthly',
      recurrence_interval: 1,
      recurrence_day_of_month: 1,
      recurrence_day_of_week: null,
      start_date: new Date().toISOString().split('T')[0],
      end_date: null,
      total_occurrences: null,
      amount_in_primary_currency: null,
      is_active: true,
    },
    mode: 'onChange',
  });

  const selectedFrequency = watch('recurrence_frequency');
  const selectedInterval = watch('recurrence_interval');
  const selectedCurrency = watch('currency');
  const isActive = watch('is_active');
  const showMultiCurrencyFields = activeAccount && selectedCurrency !== activeAccount.currency;

  // Load income data if editing
  useEffect(() => {
    if (isEditing && incomeData) {
      setValue('description', incomeData.description);
      setValue('amount', incomeData.amount);
      setValue('currency', incomeData.currency);
      setValue('category_id', incomeData.category_id);
      setValue('family_member_id', incomeData.family_member_id);
      setValue('recurrence_frequency', incomeData.recurrence_frequency);
      setValue('recurrence_interval', incomeData.recurrence_interval);
      setValue('recurrence_day_of_month', incomeData.recurrence_day_of_month);
      setValue('recurrence_day_of_week', incomeData.recurrence_day_of_week);
      setValue('start_date', incomeData.start_date);
      setValue('end_date', incomeData.end_date);
      setValue('total_occurrences', incomeData.total_occurrences);
      setValue('is_active', incomeData.is_active);
      
      // Load amount_in_primary_currency if it exists (for multi-currency incomes)
      if (incomeData.amount_in_primary_currency !== null && incomeData.amount_in_primary_currency !== undefined) {
        setValue('amount_in_primary_currency', incomeData.amount_in_primary_currency);
      }
    }
  }, [isEditing, incomeData, setValue]);

  // Handle success with countdown and redirect
  useEffect(() => {
    const isSuccess = isEditing ? updateSuccess : createSuccess;

    if (isSuccess && redirectCountdown === null) {
      const action = isEditing ? t('common:messages.updated') : t('common:messages.created');
      
      toast.success(t('common:messages.success', { entity: t('incomes.title'), action }), {
        description: t('common:messages.redirecting'),
        duration: 3000,
      });

      setRedirectCountdown(3);

      const countdownInterval = setInterval(() => {
        setRedirectCountdown((prev) => {
          if (prev === null || prev <= 1) {
            clearInterval(countdownInterval);
            navigate('/recurring-incomes');
            return null;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(countdownInterval);
    }
  }, [createSuccess, updateSuccess, isEditing, redirectCountdown, navigate]);

  const onSubmit = (data: RecurringIncomeFormData) => {
    // Clean up data based on frequency
    const cleanedData = { ...data };
    
    // Remove day_of_week if not weekly
    if (cleanedData.recurrence_frequency !== 'weekly') {
      cleanedData.recurrence_day_of_week = null;
    }
    
    // Remove day_of_month if not monthly/yearly
    if (cleanedData.recurrence_frequency !== 'monthly' && cleanedData.recurrence_frequency !== 'yearly') {
      cleanedData.recurrence_day_of_month = null;
    }

    // Convert empty strings to null for optional fields
    if (!cleanedData.category_id || cleanedData.category_id === '') {
      cleanedData.category_id = null;
    }
    if (!cleanedData.family_member_id || cleanedData.family_member_id === '') {
      cleanedData.family_member_id = null;
    }
    if (!cleanedData.end_date || cleanedData.end_date === '') {
      cleanedData.end_date = null;
    }
    if (!cleanedData.amount_in_primary_currency || cleanedData.amount_in_primary_currency === 0) {
      cleanedData.amount_in_primary_currency = null;
    }

    if (isEditing && id) {
      updateIncome({ id, ...cleanedData });
    } else {
      createIncome(cleanedData);
    }
  };

  const categoryOptions = categories?.map(cat => ({ label: cat.name, value: cat.id })) || [];
  const memberOptions = familyMembers?.map(member => ({ label: member.name, value: member.id })) || [];

  const currencyOptions = [
    { label: t('common:currencies.ars'), value: 'ARS' },
    { label: t('common:currencies.usd'), value: 'USD' },
    { label: t('common:currencies.eur'), value: 'EUR' },
  ];

  const frequencyOptions: { label: string; value: RecurrenceFrequency }[] = [
    { label: t('incomes.frequency.daily'), value: 'daily' },
    { label: t('incomes.frequency.weekly'), value: 'weekly' },
    { label: t('incomes.frequency.monthly'), value: 'monthly' },
    { label: t('incomes.frequency.yearly'), value: 'yearly' },
  ];

  const dayOfWeekOptions = [
    { label: t('incomes.daysOfWeek.0'), value: '0' },
    { label: t('incomes.daysOfWeek.1'), value: '1' },
    { label: t('incomes.daysOfWeek.2'), value: '2' },
    { label: t('incomes.daysOfWeek.3'), value: '3' },
    { label: t('incomes.daysOfWeek.4'), value: '4' },
    { label: t('incomes.daysOfWeek.5'), value: '5' },
    { label: t('incomes.daysOfWeek.6'), value: '6' },
  ];

  // Dynamic interval helper text based on frequency
  const getIntervalHelperText = () => {
    return t('incomes.form.intervalHelper', { frequency: t(`incomes.frequency.${selectedFrequency}`) });
  };

  if (isLoadingIncome || isLoadingCategories || isLoadingFamilyMembers) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="mb-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/recurring-incomes')}>
            ← {t('incomes.form.backToList')}
          </Button>
        </div>
        <FormSkeleton fields={10} />
      </div>
    );
  }

  if (!activeAccount) {
    return (
      <div className="text-center py-20">
        <div className="p-6 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg max-w-md mx-auto">
          <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-2">{t('common:errors.noActiveAccount')}</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">{t('common:errors.selectAccountFirst')}</p>
          <Button onClick={() => navigate('/accounts')}>
            {t('common:buttons.goToAccounts')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/recurring-incomes')}>
          ← {t('incomes.form.backToList')}
        </Button>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>{isEditing ? t('incomes.form.titleEdit') : t('incomes.form.titleCreate')}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {redirectCountdown !== null && (
              <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 animate-scale-in">
                <p className="text-sm text-green-800 dark:text-green-400 font-medium">
                  ✅ {t('incomes.title')} {isEditing ? t('common:messages.updated') : t('common:messages.created')} {t('common:messages.successfully')}!
                </p>
                <p className="text-xs text-green-700 dark:text-green-300 mt-1">
                  {t('common:messages.redirectingIn', { seconds: redirectCountdown })}
                </p>
              </div>
            )}

            <Input
              label={t('incomes.form.description')}
              type="text"
              placeholder={t('incomes.form.descriptionPlaceholder')}
              error={errors.description?.message}
              {...register('description')}
            />

            <Input
              label={t('incomes.form.amount')}
              type="number"
              step="0.01"
              placeholder="e.g. 50.00"
              error={errors.amount?.message}
              {...register('amount', { valueAsNumber: true })}
            />

            <Select
              label={t('incomes.form.currency')}
              options={currencyOptions}
              error={errors.currency?.message}
              {...register('currency')}
            />

            {showMultiCurrencyFields && (
              <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg space-y-3">
                <div className="flex items-start gap-2">
                  <span className="text-green-600 dark:text-green-400 text-sm">💱</span>
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold text-green-900 dark:text-green-300 mb-1">
                      {t('common:multiCurrency.title')}
                    </h4>
                    <p className="text-xs text-green-700 dark:text-green-400 mb-3">
                      {t('common:multiCurrency.incomeDescription', { 
                        currency: selectedCurrency, 
                        accountCurrency: activeAccount?.currency 
                      })}
                    </p>
                  </div>
                </div>

                <Input
                  label={t('common:multiCurrency.amountCredited', { currency: activeAccount?.currency })}
                  type="number"
                  step="0.01"
                  placeholder={t('common:multiCurrency.amountCreditedPlaceholder', { currency: activeAccount?.currency })}
                  error={errors.amount_in_primary_currency?.message}
                  {...register('amount_in_primary_currency', { valueAsNumber: true })}
                  helperText={t('common:multiCurrency.helperText')}
                />

                <div className="text-xs text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30 p-2 rounded">
                  {t('common:multiCurrency.incomeExample')}
                </div>
              </div>
            )}

            <Select
              label={t('incomes.form.category')}
              options={[{ label: t('common:form.noCategory'), value: '' }, ...categoryOptions]}
              error={errors.category_id?.message}
              {...register('category_id')}
              disabled={isLoadingCategories}
            />

            {activeAccount.type === 'family' && (
              <Select
                label={t('incomes.form.familyMember')}
                options={[{ label: t('common:form.noMember'), value: '' }, ...memberOptions]}
                error={errors.family_member_id?.message}
                {...register('family_member_id')}
                disabled={isLoadingFamilyMembers}
              />
            )}

            {/* Recurrence Settings */}
            <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg space-y-4">
              <h3 className="text-sm font-semibold text-green-900 dark:text-green-300">
                🔄 {t('common:recurrence.settings')}
              </h3>

              <Select
                label={t('incomes.form.frequency')}
                options={frequencyOptions}
                error={errors.recurrence_frequency?.message}
                {...register('recurrence_frequency')}
              />

              <Input
                label={t('incomes.form.interval')}
                type="number"
                min="1"
                step="1"
                placeholder="1"
                error={errors.recurrence_interval?.message}
                {...register('recurrence_interval', { valueAsNumber: true })}
                helperText={getIntervalHelperText()}
              />

              {/* Weekly: Day of Week */}
              {selectedFrequency === 'weekly' && (
                <Select
                  label={t('incomes.form.dayOfWeek')}
                  options={dayOfWeekOptions}
                  error={errors.recurrence_day_of_week?.message}
                  {...register('recurrence_day_of_week', { 
                    setValueAs: (v) => v === '' ? null : parseInt(v, 10)
                  })}
                />
              )}

              {/* Monthly/Yearly: Day of Month */}
              {(selectedFrequency === 'monthly' || selectedFrequency === 'yearly') && (
                <>
                  <Input
                    label={t('incomes.form.dayOfMonth')}
                    type="number"
                    min="1"
                    max="31"
                    step="1"
                    placeholder="e.g. 15"
                    error={errors.recurrence_day_of_month?.message}
                    {...register('recurrence_day_of_month', { 
                      setValueAs: (v) => v === '' ? null : parseInt(v, 10)
                    })}
                    helperText={t('common:recurrence.dayOfMonthHelper')}
                  />
                  
                  {selectedFrequency === 'yearly' && (
                    <div className="text-xs text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30 p-2 rounded">
                      {t('common:recurrence.yearlyTip')}
                    </div>
                  )}
                </>
              )}

              <Input
                label={t('incomes.form.startDate')}
                type="date"
                error={errors.start_date?.message}
                {...register('start_date')}
              />

              <div className="space-y-3">
                <Input
                  label={t('incomes.form.endDate')}
                  type="date"
                  error={errors.end_date?.message}
                  {...register('end_date')}
                  helperText={t('incomes.form.endDateHelper')}
                />

                <Input
                  label={t('incomes.form.totalOccurrences')}
                  type="number"
                  min="1"
                  step="1"
                  placeholder="e.g. 12"
                  error={errors.total_occurrences?.message}
                  {...register('total_occurrences', { 
                    setValueAs: (v) => v === '' || v === null ? null : parseInt(v, 10)
                  })}
                  helperText={t('common:recurrence.occurrencesHelper')}
                />
              </div>

              <div className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={isActive}
                  onChange={(e) => setValue('is_active', e.target.checked)}
                  className="h-4 w-4 text-green-600 rounded border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-green-500 cursor-pointer"
                />
                <label htmlFor="is_active" className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer flex-1">
                  {t('incomes.form.isActive')}
                </label>
                <span className={`text-xs px-2 py-1 rounded-full font-semibold ${
                  isActive 
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400' 
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-400'
                }`}>
                  {isActive ? t('common.active') : t('common.inactive')}
                </span>
              </div>
            </div>

            <Button
              type="submit"
              fullWidth
              isLoading={isCreating || isUpdating}
              disabled={redirectCountdown !== null}
            >
              {t('incomes.form.submit')}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
