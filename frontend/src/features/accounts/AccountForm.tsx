import { useEffect, useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Select } from '@/components/ui/Select';
import { FormSkeleton } from '@/components/ui/Skeleton';
import { InfoTooltip } from '@/components/InfoTooltip';

import { useAccounts } from '@/hooks/useAccounts';
import { usePaymentContainers } from '@/hooks/usePaymentContainers';
import type { ActionFeedbackState } from '@/hooks/useActionFeedback';
import type { FamilyMember } from '@/types/account';
import { accountSchema } from '@/schemas/account.schema';
import type { AccountFormData } from '@/features/accounts/accountFormMapping';
import { buildAccountUpdatePayload } from '@/features/accounts/accountFormMapping';

interface AccountFormProps {
  onSubmitSuccess?: () => void;
}

export const AccountForm = ({ onSubmitSuccess }: AccountFormProps) => {
  const { t } = useTranslation('accounts');
  const { accountId } = useParams<{ accountId: string }>();
  const navigate = useNavigate();
  const { 
    createAccountAsync, 
    isCreatingAccount, 
    updateAccountAsync, 
    isUpdatingAccount, 
    fetchAccount
  } = useAccounts();
  
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([{ id: '', name: '', email: null, isActive: true }]);
  const [isLoadingAccount, setIsLoadingAccount] = useState(false);
  const [redirectCountdown, setRedirectCountdown] = useState<number | null>(null);
  const [pendingFeedback, setPendingFeedback] = useState<ActionFeedbackState['actionFeedback']>();
  const [loadedDefaultExpenseContainerId, setLoadedDefaultExpenseContainerId] = useState<string | null>(null);
  const [loadedDefaultIncomeContainerId, setLoadedDefaultIncomeContainerId] = useState<string | null>(null);

  const isEditing = !!accountId;
  const { data: paymentContainersData, isLoading: isLoadingPaymentContainers } = usePaymentContainers({
    includeInactive: true,
    accountId: isEditing ? accountId : undefined,
    enabled: !isEditing || Boolean(accountId),
  });

  const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm<AccountFormData>({
    resolver: zodResolver(accountSchema),
    defaultValues: {
      name: '',
      type: 'personal',
      currency: 'ARS',
      default_expense_container_id: '',
      default_income_container_id: '',
    },
    mode: 'onChange',
  });

  const accountType = watch('type');
  const isFamilyAccount = accountType === 'family';

  // Track if account data has been loaded (prevent re-fetching)
  const hasLoadedAccount = useRef(false);

  // Load account data if editing
  useEffect(() => {
    if (isEditing && accountId && !hasLoadedAccount.current) {
      hasLoadedAccount.current = true;
      setIsLoadingAccount(true);
      fetchAccount(accountId)
        .then((account) => {
          setValue('name', account.name);
          setValue('type', account.type);
          setValue('currency', account.currency);
          setValue('default_expense_container_id', account.default_expense_container_id ?? '');
          setValue('default_income_container_id', account.default_income_container_id ?? '');
          setLoadedDefaultExpenseContainerId(account.default_expense_container_id ?? null);
          setLoadedDefaultIncomeContainerId(account.default_income_container_id ?? null);
          if (account.members && account.members.length > 0) {
            setFamilyMembers(account.members);
          }
        })
        .catch((error) => {
          toast.error(t('form.errorLoad'), {
            description: error.message || t('form.errorLoadDescription'),
          });
          hasLoadedAccount.current = false; // Allow retry on error
        })
        .finally(() => {
          setIsLoadingAccount(false);
        });
    }
  }, [isEditing, accountId, fetchAccount, setValue]);

  useEffect(() => {
    if (redirectCountdown === null) {
      return;
    }

    const countdownInterval = window.setInterval(() => {
      setRedirectCountdown((prev) => {
        if (prev === null || prev <= 1) {
          window.clearInterval(countdownInterval);
          if (onSubmitSuccess) {
            onSubmitSuccess();
          }
          navigate('/accounts', {
            state: pendingFeedback ? { actionFeedback: pendingFeedback } : undefined,
          });
          return null;
        }

        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(countdownInterval);
  }, [redirectCountdown, onSubmitSuccess, navigate, pendingFeedback]);

  const onSubmit = async (data: AccountFormData) => {
    try {
      let savedAccount;

      if (isEditing && accountId) {
        savedAccount = await updateAccountAsync(buildAccountUpdatePayload(accountId, data));
      } else if (data.type === 'family') {
        const validMembers = familyMembers.filter(m => m.name.trim() !== '');
        if (validMembers.length === 0) {
          toast.error(t('form.familyMembersError'));
          return;
        }

        savedAccount = await createAccountAsync({
          name: data.name,
          type: 'family',
          currency: data.currency,
          members: validMembers.map(m => ({ name: m.name, email: m.email || undefined })),
        });
      } else {
        savedAccount = await createAccountAsync({
          name: data.name,
          type: 'personal',
          currency: data.currency,
        });
      }

      setPendingFeedback({
        action: isEditing ? 'updated' : 'created',
        itemId: savedAccount.id,
      });
      setRedirectCountdown(3);
    } catch {
      // Error toast is handled in the hook mutation.
    }
  };

  const addFamilyMember = () => {
    setFamilyMembers([...familyMembers, { id: '', name: '', email: null, isActive: true }]);
  };

  const removeFamilyMember = (index: number) => {
    setFamilyMembers(familyMembers.filter((_, i) => i !== index));
  };

  const updateFamilyMember = (index: number, field: 'name' | 'email', value: string) => {
    const updated = [...familyMembers];
    if (field === 'name') {
      updated[index] = { ...updated[index], name: value };
    } else {
      updated[index] = { ...updated[index], email: value || null };
    }
    setFamilyMembers(updated);
  };

  const paymentContainers = paymentContainersData?.payment_containers ?? [];
  const activePaymentContainers = paymentContainers.filter((container) => container.is_active);
  const defaultPlaceOptions = [
    { label: t('form.defaultPlaces.none'), value: '' },
    ...activePaymentContainers.map((container) => ({ label: container.name, value: container.id })),
  ];
  const loadedExpenseDefault = loadedDefaultExpenseContainerId
    ? paymentContainers.find((container) => container.id === loadedDefaultExpenseContainerId)
    : null;
  const loadedIncomeDefault = loadedDefaultIncomeContainerId
    ? paymentContainers.find((container) => container.id === loadedDefaultIncomeContainerId)
    : null;
  const showExpenseDefaultWarning = Boolean(
    loadedDefaultExpenseContainerId && (!loadedExpenseDefault || !loadedExpenseDefault.is_active),
  );
  const showIncomeDefaultWarning = Boolean(
    loadedDefaultIncomeContainerId && (!loadedIncomeDefault || !loadedIncomeDefault.is_active),
  );

  if (isLoadingAccount || (isEditing && isLoadingPaymentContainers)) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="mb-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/accounts')}>
            {t('form.backButton')}
          </Button>
        </div>
        <FormSkeleton fields={3} />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/accounts')}>
          {t('form.backButton')}
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
                  ✅ {isEditing ? t('form.successUpdate') : t('form.successCreate')}
                </p>
                <p className="text-xs text-green-700 mt-1">
                  {t('form.successRedirectCountdown', { count: redirectCountdown, plural: redirectCountdown !== 1 ? 's' : '' })}
                </p>
              </div>
            )}

            <div>
              <div className="flex items-center gap-2 mb-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t('form.nameLabel')}
                </label>
                <InfoTooltip content={t('tooltips.accountName')} />
              </div>
              <Input
                type="text"
                placeholder={t('form.namePlaceholder')}
                error={errors.name?.message}
                {...register('name')}
              />
            </div>

            {!isEditing && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t('form.typeLabel')}
                  </label>
                  <InfoTooltip content={t('tooltips.accountType')} />
                </div>
                <Select
                  options={[
                    { label: t('form.typePersonal'), value: 'personal' },
                    { label: t('form.typeFamily'), value: 'family' },
                  ]}
                  error={errors.type?.message}
                  {...register('type')}
                />
              </div>
            )}

            <div>
              <div className="flex items-center gap-2 mb-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t('form.currencyLabel')}
                </label>
                <InfoTooltip content={t('tooltips.currency')} />
              </div>
              <Select
                options={[
                  { label: t('form.currencyARS'), value: 'ARS' },
                  { label: t('form.currencyUSD'), value: 'USD' },
                  { label: t('form.currencyEUR'), value: 'EUR' },
                ]}
                error={errors.currency?.message}
                {...register('currency')}
              />
            </div>

            {isFamilyAccount && !isEditing && (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      {t('form.familyMembersLabel')}
                    </label>
                    <InfoTooltip content={t('tooltips.familyMembers')} />
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={addFamilyMember}
                  >
                    {t('form.addMemberButton')}
                  </Button>
                </div>

                <div className="space-y-2">
                  {familyMembers.map((member, index) => (
                    <div key={index} className="flex gap-2 items-start">
                      <div className="flex-1">
                        <Input
                          type="text"
                          placeholder={t('form.memberNamePlaceholder')}
                          value={member.name}
                          onChange={(e) => updateFamilyMember(index, 'name', e.target.value)}
                        />
                      </div>
                      <div className="flex-1">
                        <Input
                          type="email"
                          placeholder={t('form.memberEmailPlaceholder')}
                          value={member.email || ''}
                          onChange={(e) => updateFamilyMember(index, 'email', e.target.value)}
                        />
                      </div>
                      {familyMembers.length > 1 && (
                        <Button
                          type="button"
                          variant="danger"
                          size="sm"
                          onClick={() => removeFamilyMember(index)}
                        >
                          {t('form.removeMemberButton')}
                        </Button>
                      )}
                    </div>
                  ))}
                </div>

                <p className="text-xs text-gray-500">
                  {t('form.familyMembersHelp')}
                </p>
              </div>
            )}

            {isEditing && (
              <div className="space-y-4 rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/50">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {t('form.defaultPlaces.title')}
                  </h3>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    {t('form.defaultPlaces.description')}
                  </p>
                </div>

                {activePaymentContainers.length === 0 && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
                    {t('form.defaultPlaces.noActivePlaces')}
                  </div>
                )}

                {(showExpenseDefaultWarning || showIncomeDefaultWarning) && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
                    {t('form.defaultPlaces.inactiveWarning')}
                  </div>
                )}

                <Select
                  label={t('form.defaultPlaces.expenseLabel')}
                  options={defaultPlaceOptions}
                  helperText={t('form.defaultPlaces.expenseHelp')}
                  {...register('default_expense_container_id')}
                />

                <Select
                  label={t('form.defaultPlaces.incomeLabel')}
                  options={defaultPlaceOptions}
                  helperText={t('form.defaultPlaces.incomeHelp')}
                  {...register('default_income_container_id')}
                />
              </div>
            )}

            <Button
              type="submit"
              fullWidth
              isLoading={isCreatingAccount || isUpdatingAccount}
              disabled={redirectCountdown !== null}
            >
              {isEditing ? t('form.submitUpdate') : t('form.submitCreate')}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
