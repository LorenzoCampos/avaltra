import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import {
  useExpenseCategories,
  useIncomeCategories,
  useCreateExpenseCategory,
  useCreateIncomeCategory,
  useUpdateExpenseCategory,
  useUpdateIncomeCategory,
} from '@/hooks/useCategories';
import type { CategoryType } from '@/types/category';

const categorySchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
  icon: z.string().max(10, 'Icon must be a single emoji or less than 10 characters').optional(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Color must be a valid hex code (e.g. #FF5733)').optional(),
});

type CategoryFormData = z.infer<typeof categorySchema>;

export const CategoryForm = () => {
  const { t } = useTranslation('categories');
  const navigate = useNavigate();
  const { type, id } = useParams<{ type: 'expense' | 'income'; id?: string }>();
  const isEditing = !!id;
  const isExpense = type === 'expense';

  const [redirectCountdown, setRedirectCountdown] = useState<number | null>(null);

  // Fetch categories to get the one we're editing
  const { data: expenseData } = useExpenseCategories();
  const { data: incomeData } = useIncomeCategories();

  // Mutations
  const { mutate: createExpense, isPending: isCreatingExpense, isSuccess: createExpenseSuccess } = useCreateExpenseCategory();
  const { mutate: createIncome, isPending: isCreatingIncome, isSuccess: createIncomeSuccess } = useCreateIncomeCategory();
  const { mutate: updateExpense, isPending: isUpdatingExpense, isSuccess: updateExpenseSuccess } = useUpdateExpenseCategory();
  const { mutate: updateIncome, isPending: isUpdatingIncome, isSuccess: updateIncomeSuccess } = useUpdateIncomeCategory();

  const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: '',
      icon: '',
      color: '',
    },
  });

  // Watch form values for preview
  const watchName = watch('name');
  const watchIcon = watch('icon');
  const watchColor = watch('color');

  // Load category data if editing
  useEffect(() => {
    if (isEditing && id) {
      const categories = isExpense ? expenseData?.expense_categories : incomeData?.income_categories;
      const category = categories?.find(cat => cat.id === id);
      
      if (category) {
        setValue('name', category.name);
        setValue('icon', category.icon || '');
        setValue('color', category.color || '');
      }
    }
  }, [isEditing, id, isExpense, expenseData, incomeData, setValue]);

  // Handle success with countdown
  useEffect(() => {
    const isSuccess = isEditing 
      ? (isExpense ? updateExpenseSuccess : updateIncomeSuccess)
      : (isExpense ? createExpenseSuccess : createIncomeSuccess);

    if (isSuccess && redirectCountdown === null) {
      const successMessage = isEditing ? t('form.successUpdate') : t('form.successCreate');
      
      toast.success(successMessage, {
        description: t('form.successRedirect'),
        duration: 3000,
      });

      setRedirectCountdown(3);

      const countdownInterval = setInterval(() => {
        setRedirectCountdown((prev) => {
          if (prev === null || prev <= 1) {
            clearInterval(countdownInterval);
            navigate('/categories');
            return null;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(countdownInterval);
    }
  }, [createExpenseSuccess, createIncomeSuccess, updateExpenseSuccess, updateIncomeSuccess, isEditing, isExpense, redirectCountdown, navigate]);

  const onSubmit = (data: CategoryFormData) => {
    // Clean up empty strings to undefined
    const cleanedData = {
      name: data.name,
      icon: data.icon && data.icon.trim() !== '' ? data.icon : undefined,
      color: data.color && data.color.trim() !== '' ? data.color : undefined,
      type: (isExpense ? 'expense' : 'income') as CategoryType,
    };

    if (isEditing && id) {
      if (isExpense) {
        updateExpense({ id, ...cleanedData });
      } else {
        updateIncome({ id, ...cleanedData });
      }
    } else {
      if (isExpense) {
        createExpense(cleanedData);
      } else {
        createIncome(cleanedData);
      }
    }
  };

  const isLoading = isCreatingExpense || isCreatingIncome || isUpdatingExpense || isUpdatingIncome;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/categories')}>
          {t('form.backButton')}
        </Button>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>
            {isEditing 
              ? (isExpense ? t('form.titleEditExpense') : t('form.titleEditIncome'))
              : (isExpense ? t('form.titleCreateExpense') : t('form.titleCreateIncome'))
            }
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {redirectCountdown !== null && (
              <div className={`p-4 rounded-lg border animate-scale-in ${
                isExpense 
                  ? 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800'
                  : 'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800'
              }`}>
                <p className={`text-sm font-medium ${
                  isExpense ? 'text-red-800 dark:text-red-400' : 'text-green-800 dark:text-green-400'
                }`}>
                  ✅ {isEditing ? t('form.successUpdate') : t('form.successCreate')}
                </p>
                <p className={`text-xs mt-1 ${
                  isExpense ? 'text-red-700 dark:text-red-300' : 'text-green-700 dark:text-green-300'
                }`}>
                  {t('form.successRedirectCountdown', { count: redirectCountdown, plural: redirectCountdown !== 1 ? 's' : '' })}
                </p>
              </div>
            )}

            <div>
              <Input
                label={t('form.nameLabel')}
                type="text"
                placeholder={t('form.namePlaceholder')}
                error={errors.name?.message}
                {...register('name')}
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {t('form.nameTip')}
              </p>
            </div>

            <div>
              <Input
                label={t('form.iconLabel')}
                type="text"
                placeholder={t('form.iconPlaceholder')}
                error={errors.icon?.message}
                {...register('icon')}
                helperText={t('form.iconHelper')}
              />
            </div>

            <div>
              <Input
                label={t('form.colorLabel')}
                type="text"
                placeholder={t('form.colorPlaceholder')}
                error={errors.color?.message}
                {...register('color')}
                helperText={t('form.colorHelper')}
              />
              <div className="mt-2 flex gap-2 flex-wrap">
                <span className="text-xs text-gray-500 dark:text-gray-400">{t('form.quickColors')}</span>
                {['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2'].map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setValue('color', color)}
                    className="w-6 h-6 rounded-full border-2 border-gray-300 dark:border-gray-600 hover:scale-110 transition-transform"
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                ))}
              </div>
            </div>

            <div className={`p-4 rounded-lg border ${
              isExpense
                ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                : 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
            }`}>
              <h4 className={`text-sm font-semibold mb-2 ${
                isExpense ? 'text-red-900 dark:text-red-300' : 'text-green-900 dark:text-green-300'
              }`}>
                {t('form.previewTitle')}
              </h4>
              <div className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-md">
                <span className="text-2xl">{watchIcon || t('form.previewDefaultIcon')}</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {watchName || t('form.previewDefaultName')}
                </span>
                {watchColor && watchColor.match(/^#[0-9A-F]{6}$/i) && (
                  <div
                    className="ml-auto w-6 h-6 rounded-full border-2 border-gray-300 dark:border-gray-600"
                    style={{ backgroundColor: watchColor }}
                  />
                )}
              </div>
            </div>

            <Button
              type="submit"
              fullWidth
              isLoading={isLoading}
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
