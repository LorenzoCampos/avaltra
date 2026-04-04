import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { registerSchema, type RegisterFormData } from '@/schemas/auth.schema';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';

export const Register = () => {
  const { t } = useTranslation('auth');
  const { register: registerUser, isRegistering, registerError } = useAuth();
  
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
      name: '',
    },
  });

  // Handle errors
  useEffect(() => {
    if (registerError) {
      const error = registerError as any;
      toast.error(t('register.error'), {
        description: error.response?.data?.error || error.message || t('register.tryAgain'),
      });
    }
  }, [registerError, t]);

  const onSubmit = (data: RegisterFormData) => {
    // El backend no necesita confirmPassword, solo name, email, password
    const { confirmPassword, ...registerData } = data;
    registerUser(registerData);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4 transition-colors duration-300">
      <div className="w-full max-w-md">
        <Card>
          <CardHeader>
            <CardTitle className="text-center">Avaltra</CardTitle>
            <p className="text-center text-gray-600 dark:text-gray-400 mt-2">
              {t('register.subtitle')}
            </p>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <Input
                label={t('register.name')}
                type="text"
                placeholder={t('register.namePlaceholder')}
                error={errors.name?.message}
                {...register('name')}
              />

              <Input
                label={t('register.email')}
                type="email"
                placeholder={t('register.emailPlaceholder')}
                error={errors.email?.message}
                {...register('email')}
              />

              <Input
                label={t('register.password')}
                type="password"
                placeholder="••••••••"
                error={errors.password?.message}
                helperText={t('register.passwordHelper')}
                {...register('password')}
              />

              <Input
                label={t('register.confirmPassword')}
                type="password"
                placeholder="••••••••"
                error={errors.confirmPassword?.message}
                {...register('confirmPassword')}
              />

              <Button
                type="submit"
                fullWidth
                isLoading={isRegistering}
              >
                {t('register.signUp')}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t('register.hasAccount')}{' '}
                <Link
                  to="/login"
                  className="font-medium text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300"
                >
                  {t('register.signInLink')}
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
