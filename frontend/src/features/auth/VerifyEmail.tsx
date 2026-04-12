import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '@/api/axios';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';

type VerifyStatus = 'loading' | 'success' | 'error';

export const VerifyEmail = () => {
  const { t } = useTranslation('auth');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [status, setStatus] = useState<VerifyStatus>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setErrorMessage(t('verifyEmail.noToken'));
      return;
    }

    let cancelled = false;

    const verifyToken = async () => {
      try {
        await api.post('/auth/verify-email', { token });
        if (!cancelled) {
          setStatus('success');
          // Auto-redirect after 3 seconds
          setTimeout(() => {
            if (!cancelled) navigate('/login', { replace: true });
          }, 3000);
        }
      } catch (error: any) {
        if (!cancelled) {
          setStatus('error');
          setErrorMessage(
            error.response?.data?.error || t('verifyEmail.errorDescription')
          );
        }
      }
    };

    verifyToken();
    return () => {
      cancelled = true;
    };
  }, [token, navigate, t]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4 transition-colors duration-300">
      <div className="w-full max-w-md">
        <Card>
          <CardHeader>
            <CardTitle className="text-center">Avaltra</CardTitle>
          </CardHeader>

          <CardContent>
            {status === 'loading' && (
              <div className="text-center space-y-3">
                <div className="flex justify-center">
                  <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                </div>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  {t('verifyEmail.loading')}
                </p>
              </div>
            )}

            {status === 'success' && (
              <div className="text-center space-y-4">
                <div className="text-green-600 dark:text-green-400 text-sm font-medium">
                  {t('verifyEmail.successMessage')}
                </div>
                <p className="text-gray-500 dark:text-gray-400 text-xs">
                  {t('verifyEmail.redirecting')}
                </p>
                <Button
                  onClick={() => navigate('/login', { replace: true })}
                  fullWidth
                >
                  {t('verifyEmail.goToLogin')}
                </Button>
              </div>
            )}

            {status === 'error' && (
              <div className="text-center space-y-4">
                <div className="text-red-600 dark:text-red-400 text-sm">
                  {errorMessage || t('verifyEmail.errorDescription')}
                </div>
                <p className="text-gray-500 dark:text-gray-400 text-xs">
                  {t('verifyEmail.tryResend')}
                </p>
                <Link
                  to="/login"
                  className="block text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300"
                >
                  {t('verifyEmail.goToLogin')}
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
