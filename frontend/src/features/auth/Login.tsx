import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { loginSchema } from '@/schemas/auth.schema';
import type { LoginRequest } from '@/types/auth';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';

export const Login = () => {
  const { t } = useTranslation('auth');
  const { login, isLoggingIn, loginError } = useAuth();
  
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginRequest>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  // Handle errors
  useEffect(() => {
    if (loginError) {
      const error = loginError as any;
      toast.error(t('login.error'), {
        description: error.response?.data?.error || error.message || t('login.invalidCredentials'),
      });
    }
  }, [loginError, t]);

  const onSubmit = (data: LoginRequest) => {
    console.log('📝 Login form submitted:', { email: data.email, password: '***' });
    console.log('🔄 Calling login mutation...');
    login(data);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4 transition-colors duration-300">
      <div className="w-full max-w-md">
        <Card>
          <CardHeader>
            <CardTitle className="text-center">Bolsillo Claro</CardTitle>
            <p className="text-center text-gray-600 dark:text-gray-400 mt-2">
              {t('login.subtitle')}
            </p>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <Input
                label={t('login.email')}
                type="email"
                placeholder={t('login.emailPlaceholder')}
                error={errors.email?.message}
                {...register('email')}
              />

              <Input
                label={t('login.password')}
                type="password"
                placeholder="••••••••"
                error={errors.password?.message}
                {...register('password')}
              />

              <Button
                type="submit"
                fullWidth
                isLoading={isLoggingIn}
              >
                {t('login.signIn')}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t('login.noAccount')}{' '}
                <Link
                  to="/register"
                  className="font-medium text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300"
                >
                  {t('login.signUpLink')}
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
