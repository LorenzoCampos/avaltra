import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { api } from '@/api/axios';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';

const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, 'La contraseña debe tener mínimo 8 caracteres')
      .max(100, 'La contraseña es muy larga'),
    confirmPassword: z.string().min(1, 'Debes confirmar la contraseña'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  });

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

export const ResetPassword = () => {
  const { t } = useTranslation('auth');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: '', confirmPassword: '' },
  });

  // Redirect to forgot-password if no token is present
  useEffect(() => {
    if (!token) {
      navigate('/forgot-password', { replace: true });
    }
  }, [token, navigate]);

  const resetMutation = useMutation({
    mutationFn: async (data: ResetPasswordFormData) => {
      await api.post('/auth/reset-password', {
        token,
        password: data.password,
      });
    },
    onSuccess: () => {
      toast.success(t('resetPassword.successTitle'), {
        description: t('resetPassword.successMessage'),
      });
      navigate('/login', { replace: true });
    },
    onError: (error: any) => {
      toast.error(t('resetPassword.error'), {
        description:
          error.response?.data?.error ||
          error.message ||
          t('resetPassword.errorDescription'),
      });
    },
  });

  const onSubmit = (data: ResetPasswordFormData) => {
    resetMutation.mutate(data);
  };

  if (!token) return null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4 transition-colors duration-300">
      <div className="w-full max-w-md">
        <Card>
          <CardHeader>
            <CardTitle className="text-center">Avaltra</CardTitle>
            <p className="text-center text-gray-600 dark:text-gray-400 mt-2">
              {t('resetPassword.subtitle')}
            </p>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <Input
                label={t('resetPassword.newPassword')}
                type="password"
                placeholder="••••••••"
                error={errors.password?.message}
                helperText={t('resetPassword.passwordHelper')}
                {...register('password')}
              />

              <Input
                label={t('resetPassword.confirmPassword')}
                type="password"
                placeholder="••••••••"
                error={errors.confirmPassword?.message}
                {...register('confirmPassword')}
              />

              <Button
                type="submit"
                fullWidth
                isLoading={resetMutation.isPending}
              >
                {t('resetPassword.submit')}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t('resetPassword.noTokenMessage')}{' '}
                <Link
                  to="/forgot-password"
                  className="font-medium text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300"
                >
                  {t('resetPassword.requestNewLink')}
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
