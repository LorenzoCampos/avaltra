/**
 * ============================================================================
 * ONBOARDING - WELCOME STEP
 * ============================================================================
 * Paso 1: Bienvenida y explicación del wizard
 */

import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';

interface WelcomeStepProps {
  onStart: () => void;
  onSkip: () => void;
}

export const WelcomeStep = ({ onStart, onSkip }: WelcomeStepProps) => {
  const { t } = useTranslation('onboarding');

  const handleSkip = () => {
    const confirmed = window.confirm(t('welcome.skipWarning'));
    if (confirmed) {
      onSkip();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 px-4 py-8">
      <Card className="max-w-2xl w-full animate-slide-up shadow-xl">
        <CardHeader className="text-center pb-4">
          {/* Icon/Logo */}
          <div className="mb-6">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-100 dark:bg-blue-900 rounded-full">
              <span className="text-4xl">👋</span>
            </div>
          </div>

          {/* Title */}
          <CardTitle className="text-3xl font-bold mb-3">
            {t('welcome.title')}
          </CardTitle>

          {/* Subtitle */}
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-xl mx-auto">
            {t('welcome.subtitle')}
          </p>
        </CardHeader>

        <CardContent className="pt-6">
          {/* Features Preview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <span className="text-3xl mb-2 block">💰</span>
              <h4 className="font-semibold text-sm text-gray-900 dark:text-gray-100 mb-1">
                Cuentas
              </h4>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Organizá tu plata
              </p>
            </div>

            <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <span className="text-3xl mb-2 block">📊</span>
              <h4 className="font-semibold text-sm text-gray-900 dark:text-gray-100 mb-1">
                Reportes
              </h4>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Entendé tus finanzas
              </p>
            </div>

            <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <span className="text-3xl mb-2 block">🎯</span>
              <h4 className="font-semibold text-sm text-gray-900 dark:text-gray-100 mb-1">
                Metas
              </h4>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Alcanzá tus objetivos
              </p>
            </div>
          </div>

          {/* Steps indicator */}
          <div className="mb-8">
            <div className="flex items-center justify-center gap-2">
              {[1, 2, 3].map((step) => (
                <div
                  key={step}
                  className="flex items-center"
                >
                  <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-sm font-medium text-gray-600 dark:text-gray-400">
                    {step}
                  </div>
                  {step < 3 && (
                    <div className="w-8 h-0.5 bg-gray-200 dark:bg-gray-700" />
                  )}
                </div>
              ))}
            </div>
            <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-3">
              Solo 3 pasos • Menos de 3 minutos
            </p>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-3">
            <Button
              size="lg"
              onClick={onStart}
              className="w-full"
            >
              {t('welcome.start')}
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleSkip}
              className="w-full text-gray-600 dark:text-gray-400"
            >
              {t('welcome.skip')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
