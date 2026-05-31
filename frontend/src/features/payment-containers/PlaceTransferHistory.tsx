import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import type { PlaceTransfer } from '@/types/placeTransfer';

type PlaceTransferHistoryProps = {
  transfers: PlaceTransfer[];
  isLoading?: boolean;
  cancelingTransferId?: string | null;
  onCancelTransfer?: (id: string) => void;
};
const formatDate = (date: string) => date.slice(0, 10);
const isCanceled = (transfer: PlaceTransfer) => Boolean(transfer.canceled_at || transfer.deleted_at);

export function PlaceTransferHistory({ transfers, isLoading = false, cancelingTransferId = null, onCancelTransfer }: PlaceTransferHistoryProps) {
  const { t } = useTranslation('navigation');
  const activeTransfers = transfers.filter((transfer) => !isCanceled(transfer));

  if (isLoading) {
    return <p className="rounded-2xl bg-white p-5 text-sm text-gray-500 shadow-sm dark:bg-gray-900 dark:text-gray-400">{t('paymentContainersPage.transfers.history.loading')}</p>;
  }

  return (
    <section className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="border-b border-gray-200 p-5 dark:border-gray-800">
        <h2 className="font-semibold text-gray-900 dark:text-white">{t('paymentContainersPage.transfers.history.title')}</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">{t('paymentContainersPage.transfers.history.description')}</p>
        {/* Transfer corrections are intentionally cancel-and-recreate; edit-in-place is out of scope. */}
        <p className="mt-2 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
          {t('paymentContainersPage.transfers.history.correctionGuidance')}
        </p>
      </div>
      <div className="divide-y divide-gray-100 dark:divide-gray-800">
        {activeTransfers.length === 0 ? (
          <p className="p-5 text-sm text-gray-500 dark:text-gray-400">{t('paymentContainersPage.transfers.history.empty')}</p>
        ) : (
          activeTransfers.map((transfer) => (
            <article key={transfer.id} className="p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-medium text-gray-900 dark:text-white">
                      {transfer.source_container_name} → {transfer.destination_container_name}
                    </h3>
                    <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700 dark:bg-green-900/40 dark:text-green-300">
                      {t('paymentContainersPage.transfers.status.active')}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{formatDate(transfer.date)}</p>
                  {transfer.note && <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{transfer.note}</p>}
                </div>
                <div className="flex flex-col gap-2 sm:items-end">
                  <p className="font-semibold text-gray-900 dark:text-white">{transfer.currency} {transfer.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                  {onCancelTransfer && (
                    <Button type="button" size="sm" variant="ghost" isLoading={cancelingTransferId === transfer.id} onClick={() => onCancelTransfer(transfer.id)}>
                      {t('paymentContainersPage.transfers.actions.cancel')}
                    </Button>
                  )}
                </div>
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
