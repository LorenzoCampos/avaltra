import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { useExpenseCategories, useFamilyMembers } from '@/hooks/useExpenses';
import { useAccountStore } from '@/stores/account.store';
import { useUser } from '@/hooks/useUser';
import { useAccounts } from '@/hooks/useAccounts';
import type { Currency } from '@/schemas/account.schema';

// Schema simplificado para quick add (sin validación de family_member)
// La validación se hará dinámicamente en el componente
const quickAddSchemaBase = z.object({
  amount: z.number().positive('Amount must be positive'),
  description: z.string().min(1, 'Description is required'),
  category_id: z.string().nullable().optional(),
  family_member_id: z.string().nullable().optional(),
});

// Schema con family_member obligatorio para cuentas familiares
const quickAddSchemaWithFamilyMember = z.object({
  amount: z.number().positive('Amount must be positive'),
  description: z.string().min(1, 'Description is required'),
  category_id: z.string().nullable().optional(),
  family_member_id: z.string().min(1, 'Family member is required for family accounts'),
});

type QuickAddFormData = z.infer<typeof quickAddSchemaBase>;

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
  }) => void;
  isSubmitting: boolean;
}

export const QuickAddExpenseModal = ({ isOpen, onClose, onSubmit, isSubmitting }: QuickAddExpenseModalProps) => {
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

  const hasFamilyMembers = familyMembers && familyMembers.length > 0;

  // Usar schema con validación de family_member si es cuenta familiar
  const schema = hasFamilyMembers ? quickAddSchemaWithFamilyMember : quickAddSchemaBase;

  const { register, handleSubmit, formState: { errors }, reset, setFocus } = useForm<QuickAddFormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      amount: 0,
      description: '',
      category_id: lastCategoryId,
      family_member_id: null,
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
    onSubmit({
      ...data,
      currency: defaultCurrency,
      date: defaultDate,
    });

    // Reset form después del submit
    reset();
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  if (!isOpen) return null;

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
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Quick Add Expense</h2>
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
                <span>Today</span>
              </p>
            </div>

            {/* Amount */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Amount <span className="text-red-500">*</span>
              </label>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                {...register('amount', { valueAsNumber: true })}
                error={errors.amount?.message}
                className="text-lg"
                inputMode="decimal"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Description <span className="text-red-500">*</span>
              </label>
              <Input
                type="text"
                placeholder="e.g., Coffee, Lunch, Uber"
                {...register('description')}
                error={errors.description?.message}
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Category (optional)
              </label>
              <Select {...register('category_id')} disabled={isLoadingCategories}>
                <option value="">No Category</option>
                {categories?.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </Select>
            </div>

            {/* Family Member (obligatorio si la cuenta tiene members) */}
            {hasFamilyMembers && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Family Member <span className="text-red-500">*</span>
                </label>
                <Select {...register('family_member_id')} disabled={isLoadingFamilyMembers} error={errors.family_member_id?.message}>
                  <option value="">Select a family member</option>
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
                {isSubmitting ? 'Adding...' : 'Add Expense'}
              </Button>

              <button
                type="button"
                onClick={() => window.location.href = '/expenses/new'}
                className="w-full text-sm text-blue-600 dark:text-blue-400 hover:underline"
              >
                Need more options?
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
};
