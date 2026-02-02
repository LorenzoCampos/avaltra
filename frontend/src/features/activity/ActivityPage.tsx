import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ActivityFeed } from './components/ActivityFeed';
import { useAccountStore } from '@/stores/account.store';
import { Button } from '@/components/ui/Button';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ExportButton } from '@/components/ExportButton';
import { useExport } from '@/hooks/useExport';
import { useActivity } from '@/hooks/useActivity';
import { useSavings } from '@/hooks/useSavings';
import { toast } from 'sonner';

export function ActivityPage() {
  const { t } = useTranslation('activity');
  const navigate = useNavigate();
  const { activeAccount } = useAccountStore();
  const { data } = useActivity({});
  const { summary: savingsSummary } = useSavings('all');
  const { exportActivityToCSV, exportActivityToPDF } = useExport();

  if (!activeAccount) {
    return (
      <div className="text-center py-20">
        <div className="p-6 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg max-w-md mx-auto">
          <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-2">{t('noAccount.title')}</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">{t('noAccount.description')}</p>
          <Button onClick={() => navigate('/accounts')}>
            {t('noAccount.button')}
          </Button>
        </div>
      </div>
    );
  }

  const handleExportCSV = () => {
    if (!data?.activities || data.activities.length === 0) {
      toast.error(t('export.noData'));
      return;
    }

    const filename = `activity_${activeAccount.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}`;
    exportActivityToCSV(data.activities, {
      filename,
      accountName: activeAccount.name,
      currency: activeAccount.currency,
    });
    toast.success(t('export.csvSuccess'));
  };

  const handleExportPDF = () => {
    if (!data?.activities || data.activities.length === 0) {
      toast.error(t('export.noData'));
      return;
    }

    const filename = `activity_${activeAccount.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}`;
    exportActivityToPDF(data.activities, {
      filename,
      accountName: activeAccount.name,
      currency: activeAccount.currency,
      totalSaved: savingsSummary?.total_saved || 0,
    });
    toast.success(t('export.pdfSuccess'));
  };

  return (
    <ErrorBoundary>
      <div className="mx-auto max-w-4xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              {t('title')}
            </h1>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              {t('subtitle')}
            </p>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-500">
              {t('account')}: {activeAccount.name}
            </p>
          </div>
          
          <ExportButton
            onExportCSV={handleExportCSV}
            onExportPDF={handleExportPDF}
            disabled={!data?.activities || data.activities.length === 0}
          />
        </div>

        <ActivityFeed />
      </div>
    </ErrorBoundary>
  );
}
