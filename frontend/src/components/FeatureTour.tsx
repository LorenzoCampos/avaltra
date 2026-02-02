import { useEffect, useState } from 'react';
import Joyride, { CallBackProps, STATUS, Step, ACTIONS, EVENTS } from 'react-joyride';
import { useTranslation } from 'react-i18next';
import { analytics } from '@/lib/analytics';

export const FeatureTour = () => {
  const { t } = useTranslation('tour');
  const [runTour, setRunTour] = useState(false);

  // Check if tour should run
  useEffect(() => {
    const tourCompleted = localStorage.getItem('tourCompleted') === 'true';
    const tourRequested = localStorage.getItem('tourRequested') === 'true';
    
    if (!tourCompleted && tourRequested) {
      // Small delay to ensure DOM elements are rendered
      const timer = setTimeout(() => {
        setRunTour(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, []);

  const steps: Step[] = [
    {
      target: '[data-tour="available-balance"]',
      content: t('steps.availableBalance'),
      disableBeacon: true,
      placement: 'bottom',
    },
    {
      target: '[data-tour="quick-actions"]',
      content: t('steps.quickActions'),
      placement: 'bottom',
    },
    {
      target: '[data-tour="expenses"]',
      content: t('steps.expenses'),
      placement: 'right',
    },
    {
      target: '[data-tour="incomes"]',
      content: t('steps.incomes'),
      placement: 'right',
    },
    {
      target: '[data-tour="reports"]',
      content: t('steps.reports'),
      placement: 'right',
    },
    {
      target: '[data-tour="settings"]',
      content: t('steps.settings'),
      placement: 'right',
    },
  ];

  const handleJoyrideCallback = (data: CallBackProps) => {
    const { status, action, index, type } = data;
    
    // Track step views
    if (type === EVENTS.STEP_AFTER && action === ACTIONS.NEXT) {
      const step = steps[index];
      analytics.tourStepViewed(index + 1, step.target as string);
    }
    
    // Track completion or skip
    if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status)) {
      if (status === STATUS.FINISHED) {
        analytics.tourCompleted();
      } else {
        analytics.tourSkipped(index + 1);
      }
      
      localStorage.setItem('tourCompleted', 'true');
      localStorage.removeItem('tourRequested');
      setRunTour(false);
    }
  };

  if (!runTour) return null;

  return (
    <Joyride
      steps={steps}
      run={runTour}
      continuous
      showProgress
      showSkipButton
      callback={handleJoyrideCallback}
      locale={{
        back: t('controls.back'),
        close: t('controls.close'),
        last: t('controls.last'),
        next: t('controls.next'),
        skip: t('controls.skip'),
      }}
      styles={{
        options: {
          primaryColor: '#3B82F6',
          zIndex: 10000,
          arrowColor: '#fff',
          backgroundColor: '#fff',
          textColor: '#333',
        },
        tooltip: {
          borderRadius: 8,
          fontSize: 14,
        },
        tooltipContainer: {
          textAlign: 'left',
        },
        buttonNext: {
          backgroundColor: '#3B82F6',
          borderRadius: 6,
          fontSize: 14,
          padding: '8px 16px',
        },
        buttonBack: {
          color: '#6B7280',
          fontSize: 14,
          marginRight: 8,
        },
        buttonSkip: {
          color: '#9CA3AF',
          fontSize: 13,
        },
      }}
    />
  );
};

// Helper to start the tour manually
export const startFeatureTour = () => {
  localStorage.setItem('tourRequested', 'true');
  // Trigger a page reload or navigation to dashboard
  window.location.href = '/dashboard';
};
