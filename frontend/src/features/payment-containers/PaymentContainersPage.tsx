import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CreditCard, Pencil, WalletCards } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import {
  useCreatePaymentContainer,
  useDeactivatePaymentContainer,
  usePaymentContainers,
  useUpdatePaymentContainer,
} from '@/hooks/usePaymentContainers';
import {
  useCreatePaymentInstrument,
  useDeactivatePaymentInstrument,
  usePaymentInstruments,
  useUpdatePaymentInstrument,
} from '@/hooks/usePaymentInstruments';
import type { PaymentContainer } from '@/types/paymentContainer';
import type { PaymentInstrument } from '@/types/paymentInstrument';
import { ContainerForm } from './ContainerForm';
import { InstrumentForm } from './InstrumentForm';

const statusClassName = (isActive: boolean) =>
  isActive
    ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
    : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300';

export function PaymentContainersPage() {
  const { t } = useTranslation('navigation');
  const [editingContainer, setEditingContainer] = useState<PaymentContainer | null>(null);
  const [editingInstrument, setEditingInstrument] = useState<PaymentInstrument | null>(null);

  const containersQuery = usePaymentContainers({ includeInactive: true });
  const instrumentsQuery = usePaymentInstruments({ includeInactive: true });
  const createContainer = useCreatePaymentContainer();
  const updateContainer = useUpdatePaymentContainer();
  const deactivateContainer = useDeactivatePaymentContainer();
  const createInstrument = useCreatePaymentInstrument();
  const updateInstrument = useUpdatePaymentInstrument();
  const deactivateInstrument = useDeactivatePaymentInstrument();

  const containers = useMemo(() => containersQuery.data?.payment_containers ?? [], [containersQuery.data?.payment_containers]);
  const instruments = instrumentsQuery.data?.payment_instruments ?? [];
  const containerNames = useMemo(
    () => new Map(containers.map((container) => [container.id, container.name])),
    [containers],
  );

  const isLoading = containersQuery.isLoading || instrumentsQuery.isLoading;
  const error = containersQuery.error || instrumentsQuery.error;

  if (isLoading) {
    return <div className="rounded-2xl bg-white p-6 text-gray-600 shadow-sm dark:bg-gray-900 dark:text-gray-300">{t('paymentContainersPage.loading')}</div>;
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
        {t('paymentContainersPage.error')}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header>
        <p className="text-sm font-semibold uppercase tracking-wide text-brand-primary">{t('paymentContainersPage.eyebrow')}</p>
        <h1 className="mt-1 text-3xl font-bold text-gray-900 dark:text-white">{t('paymentContainersPage.title')}</h1>
        <p className="mt-2 max-w-3xl text-gray-600 dark:text-gray-300">
          {t('paymentContainersPage.description')}
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        <ContainerForm
          key={editingContainer?.id ?? 'new-container'}
          container={editingContainer}
          isSubmitting={createContainer.isPending || updateContainer.isPending}
          onCancel={editingContainer ? () => setEditingContainer(null) : undefined}
          onSubmit={(values) => {
            if (editingContainer) {
              updateContainer.mutate({ id: editingContainer.id, ...values }, { onSuccess: () => setEditingContainer(null) });
              return;
            }
            createContainer.mutate(values);
          }}
        />

        <InstrumentForm
          key={editingInstrument?.id ?? 'new-instrument'}
          instrument={editingInstrument}
          containers={containers}
          isSubmitting={createInstrument.isPending || updateInstrument.isPending}
          onCancel={editingInstrument ? () => setEditingInstrument(null) : undefined}
          onSubmit={(values) => {
            if (editingInstrument) {
              updateInstrument.mutate({ id: editingInstrument.id, ...values }, { onSuccess: () => setEditingInstrument(null) });
              return;
            }
            createInstrument.mutate(values);
          }}
        />
      </div>

      <section className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center gap-3 border-b border-gray-200 p-5 dark:border-gray-800">
            <WalletCards className="h-5 w-5 text-brand-primary" aria-hidden="true" />
            <div>
              <h2 className="font-semibold text-gray-900 dark:text-white">{t('paymentContainersPage.containers.title')}</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">{t('paymentContainersPage.containers.description')}</p>
            </div>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {containers.length === 0 ? (
              <p className="p-5 text-sm text-gray-500 dark:text-gray-400">{t('paymentContainersPage.containers.empty')}</p>
            ) : (
              containers.map((container) => (
                <div key={container.id} className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-medium text-gray-900 dark:text-white">{container.name}</h3>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusClassName(container.is_active)}`}>
                        {container.is_active ? t('paymentContainersPage.status.active') : t('paymentContainersPage.status.inactive')}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{t(`paymentContainersPage.containerKinds.${container.kind}`)}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button type="button" size="sm" variant="ghost" onClick={() => setEditingContainer(container)}>
                      <Pencil className="mr-1 h-4 w-4" aria-hidden="true" /> {t('paymentContainersPage.actions.edit')}
                    </Button>
                    {container.is_active && (
                      <Button type="button" size="sm" variant="danger" onClick={() => deactivateContainer.mutate(container.id)}>
                        {t('paymentContainersPage.actions.deactivate')}
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center gap-3 border-b border-gray-200 p-5 dark:border-gray-800">
            <CreditCard className="h-5 w-5 text-brand-primary" aria-hidden="true" />
            <div>
              <h2 className="font-semibold text-gray-900 dark:text-white">{t('paymentContainersPage.instruments.title')}</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">{t('paymentContainersPage.instruments.description')}</p>
            </div>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {instruments.length === 0 ? (
              <p className="p-5 text-sm text-gray-500 dark:text-gray-400">{t('paymentContainersPage.instruments.empty')}</p>
            ) : (
              instruments.map((instrument) => (
                <div key={instrument.id} className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-medium text-gray-900 dark:text-white">{instrument.name}</h3>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusClassName(instrument.is_active)}`}>
                        {instrument.is_active ? t('paymentContainersPage.status.active') : t('paymentContainersPage.status.inactive')}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {t(`paymentContainersPage.instrumentKinds.${instrument.kind}`)}
                      {instrument.backing_container_id ? ` ${t('paymentContainersPage.instruments.backedBy', { container: containerNames.get(instrument.backing_container_id) ?? t('paymentContainersPage.instruments.unknownContainer') })}` : ''}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button type="button" size="sm" variant="ghost" onClick={() => setEditingInstrument(instrument)}>
                      <Pencil className="mr-1 h-4 w-4" aria-hidden="true" /> {t('paymentContainersPage.actions.edit')}
                    </Button>
                    {instrument.is_active && (
                      <Button type="button" size="sm" variant="danger" onClick={() => deactivateInstrument.mutate(instrument.id)}>
                        {t('paymentContainersPage.actions.deactivate')}
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
