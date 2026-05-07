import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { useExpenseCategories, useFamilyMembers } from '@/hooks/useExpenses';
import { useAccountStore } from '@/stores/account.store';
import { useUser } from '@/hooks/useUser';
import { useAccounts } from '@/hooks/useAccounts';
import type { Currency } from '@/schemas/account.schema';
import { PAYMENT_METHODS, normalizePaymentMethodForCreate, type PaymentMethod } from '@/types/paymentMethod';
import { getPaymentMethodOptions } from '@/lib/paymentMethods';

const optionalPaymentMethodSchema = z.preprocess(
  (value) => (value === '' ? undefined : value),
  z.enum(PAYMENT_METHODS).nullable().optional(),
);

const createQuickAddSchema = (hasFamilyMembers: boolean) => quickAddSchemaBase.superRefine((data, ctx) => {
  if (hasFamilyMembers && !data.family_member_id) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['family_member_id'],
      message: 'Family member is required for family accounts',
    });
  }
});

// Schema simplificado para quick add (sin validación de family_member)
// La validación se hará dinámicamente en el componente
const quickAddSchemaBase = z.object({
  amount: z.number().positive('Amount must be positive'),
  description: z.string().min(1, 'Description is required'),
  category_id: z.string().nullable().optional(),
  family_member_id: z.string().nullable().optional(),
  payment_method: optionalPaymentMethodSchema,
});

type QuickAddFormInput = z.input<typeof quickAddSchemaBase>;
type QuickAddFormData = z.output<typeof quickAddSchemaBase>;

export const buildQuickAddExpensePayload = (
  data: QuickAddFormData,
  defaultCurrency: Currency,
  defaultDate: string,
) => ({
  ...data,
  currency: defaultCurrency,
  date: defaultDate,
  payment_method: normalizePaymentMethodForCreate(data.payment_method),
});

interface QuickAddExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    amount: number;
    description: string;
    currency: Currency;
    date: string;
    category_id?: string | null;
    family_member_id?: string | null;
    payment_method?: PaymentMethod | null;
  }) => void;
  isSubmitting: boolean;
}

export const QuickAddExpenseModal = ({ isOpen, onClose, onSubmit, isSubmitting }: QuickAddExpenseModalProps) => {
  const { t } = useTranslation('expenses');
  const { activeAccount } = useAccountStore();
  const { data: user } = useUser();
  const { accounts } = useAccounts();
  const { data: categories, isLoading: isLoadingCategories } = useExpenseCategories();
  const { data: familyMembers, isLoading: isLoadingFamilyMembers } = useFamilyMembers();

  // Defaults inteligentes (misma lógica que ExpenseForm)
  const defaultAccount = activeAccount 
                      || accounts.find(a => a.id === user?.default_account_id) 
                      || accounts[0];
  const defaultCurrency = defaultAccount?.currency || 'ARS' as Currency;
  const defaultDate = new Date().toISOString().split('T')[0]; // HOY
  const lastCategoryId = localStorage.getItem('lastExpenseCategoryId') || null;

  const hasFamilyMembers = !!familyMembers?.length;

  // Usar schema con validación de family_member si es cuenta familiar
  const schema = createQuickAddSchema(hasFamilyMembers);

  const { register, handleSubmit, formState: { errors }, reset, setFocus } = useForm<QuickAddFormInput, unknown, QuickAddFormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      amount: 0,
      description: '',
      category_id: lastCategoryId,
      family_member_id: null,
      payment_method: null,
    },
  });

  // Autofocus en amount cuando se abre el modal
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => setFocus('amount'), 100);
    }
  }, [isOpen, setFocus]);

  const handleFormSubmit = (data: QuickAddFormData) => {
    // Guardar última categoría usada
    if (data.category_id) {
      localStorage.setItem('lastExpenseCategoryId', data.category_id);
    }

    // Combinar con defaults
    onSubmit(buildQuickAddExpensePayload(data, defaultCurrency, defaultDate));

    // Reset form después del submit
    reset();
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  if (!isOpen) return null;

  const paymentMethodOptions = [
    { label: t('form.paymentMethod.empty'), value: '' },
    ...getPaymentMethodOptions(t),
  ];

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 z-40 md:hidden"
        onClick={handleClose}
      />

      {/* Bottom Sheet */}
      <div className="fixed inset-x-0 bottom-0 z-50 md:hidden animate-slide-up">
        <div className="bg-white dark:bg-gray-800 rounded-t-2xl shadow-2xl max-h-[85vh] overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">{t('quickAdd.title')}</h2>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(handleFormSubmit)} className="p-6 space-y-4">
            {/* Account Info (read-only visual) */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
              <p className="text-sm text-blue-800 dark:text-blue-300">
                <span className="font-semibold">{defaultAccount?.name}</span>
                {' · '}
                <span>{defaultCurrency}</span>
                {' · '}
                <span>{t('quickAdd.today')}</span>
              </p>
            </div>

            {/* Amount */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('quickAdd.amount')} <span className="text-red-500">*</span>
              </label>
              <Input
                type="number"
                step="0.01"
                placeholder={t('quickAdd.amountPlaceholder')}
                {...register('amount', { valueAsNumber: true })}
                error={errors.amount?.message}
                className="text-lg"
                inputMode="decimal"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('quickAdd.description')} <span className="text-red-500">*</span>
              </label>
              <Input
                type="text"
                placeholder={t('quickAdd.descriptionPlaceholder')}
                {...register('description')}
                error={errors.description?.message}
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('quickAdd.category')}
              </label>
              <Select {...register('category_id')} disabled={isLoadingCategories}>
                  <option value="">{t('quickAdd.noCategory')}</option>
                {categories?.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('form.paymentMethod.label')}
              </label>
              <Select {...register('payment_method')} options={paymentMethodOptions} />
            </div>

            {/* Family Member (obligatorio si la cuenta tiene members) */}
            {hasFamilyMembers && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('quickAdd.familyMember')} <span className="text-red-500">*</span>
                </label>
                <Select {...register('family_member_id')} disabled={isLoadingFamilyMembers} error={errors.family_member_id?.message}>
                    <option value="">{t('quickAdd.selectFamilyMember')}</option>
                  {familyMembers?.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name}
                    </option>
                  ))}
                </Select>
              </div>
            )}

            {/* Buttons */}
            <div className="space-y-3 pt-2">
              <Button
                type="submit"
                fullWidth
                disabled={isSubmitting}
                className="text-lg py-3"
              >
                {isSubmitting ? t('quickAdd.submitting') : t('quickAdd.submit')}
              </Button>

              <button
                type="button"
                onClick={() => window.location.href = '/expenses/new'}
                className="w-full text-sm text-blue-600 dark:text-blue-400 hover:underline"
              >
                {t('quickAdd.moreOptions')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
};
