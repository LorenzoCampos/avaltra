/**
 * ============================================================================
 * ONBOARDING - COMPLETED STEP
 * ============================================================================
 * Paso 4: Onboarding completado con éxito
 */

import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { CheckCircle } from 'lucide-react';

interface CompletedStepProps {
  onStartTour?: () => void;
}

export const CompletedStep = ({ onStartTour }: CompletedStepProps) => {
  const { t } = useTranslation('onboarding');
  const navigate = useNavigate();

  const handleGoToDashboard = () => {
    navigate('/dashboard');
  };

  const handleStartTour = () => {
    if (onStartTour) {
      onStartTour();
    }
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 px-4 py-8">
      <Card className="max-w-2xl w-full animate-slide-up shadow-xl">
        <CardHeader className="text-center pb-4">
          {/* Success icon with animation */}
          <div className="mb-6 animate-bounce-in">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 dark:bg-green-900 rounded-full">
              <CheckCircle className="w-12 h-12 text-green-600 dark:text-green-400" />
            </div>
          </div>

          {/* Title */}
          <CardTitle className="text-3xl font-bold mb-3">
            {t('completed.title')}
          </CardTitle>

          {/* Subtitle */}
          <p className="text-lg text-gray-600 dark:text-gray-400">
            {t('completed.subtitle')}
          </p>
        </CardHeader>

        <CardContent className="space-y-8">
          {/* Checklist */}
          <div className="space-y-3">
            {[
              t('completed.checklist.account'),
              t('completed.checklist.transactions'),
              t('completed.checklist.reports'),
            ].map((item, index) => (
              <div
                key={index}
                className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg animate-slide-in-right"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                <span className="text-sm text-gray-900 dark:text-gray-100">
                  {item}
                </span>
              </div>
            ))}
          </div>

          {/* Tips */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-5">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">
              {t('completed.tips.title')}
            </h3>
            <ul className="space-y-2">
              <li className="text-sm text-gray-700 dark:text-gray-300 flex items-start gap-2">
                <span className="text-blue-600 dark:text-blue-400 mt-0.5">•</span>
                <span>{t('completed.tips.tip1')}</span>
              </li>
              <li className="text-sm text-gray-700 dark:text-gray-300 flex items-start gap-2">
                <span className="text-blue-600 dark:text-blue-400 mt-0.5">•</span>
                <span>{t('completed.tips.tip2')}</span>
              </li>
              <li className="text-sm text-gray-700 dark:text-gray-300 flex items-start gap-2">
                <span className="text-blue-600 dark:text-blue-400 mt-0.5">•</span>
                <span>{t('completed.tips.tip3')}</span>
              </li>
            </ul>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-3 pt-4">
            <Button
              size="lg"
              onClick={handleGoToDashboard}
              className="w-full"
            >
              {t('completed.dashboard')}
            </Button>

            {onStartTour && (
              <Button
                size="lg"
                variant="secondary"
                onClick={handleStartTour}
                className="w-full"
              >
                {t('completed.tour')}
              </Button>
            )}
          </div>

          {/* Progress indicator - all complete */}
          <div className="mt-8">
            <div className="flex items-center justify-center gap-2">
              <div className="w-8 h-1 bg-green-600 rounded-full" />
              <div className="w-8 h-1 bg-green-600 rounded-full" />
              <div className="w-8 h-1 bg-green-600 rounded-full" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
