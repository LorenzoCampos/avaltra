import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import type { PaymentContainer } from '@/types/paymentContainer';
import type { CreatePlaceTransferRequest } from '@/types/placeTransfer';
import { getPlaceTransferFormSubmission } from './placeTransferFormSubmission';

type PlaceTransferFormProps = {
  containers: PaymentContainer[];
  isSubmitting?: boolean;
  onSubmit: (values: CreatePlaceTransferRequest) => void;
};
const today = () => new Date().toISOString().slice(0, 10);

export function PlaceTransferForm({ containers, isSubmitting = false, onSubmit }: PlaceTransferFormProps) {
  const { t } = useTranslation('navigation');
  const activeContainers = useMemo(() => containers.filter((container) => container.is_active), [containers]);
  const [sourceContainerId, setSourceContainerId] = useState(activeContainers[0]?.id ?? '');
  const [destinationContainerId, setDestinationContainerId] = useState(activeContainers[1]?.id ?? '');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(today());
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  const placeOptions = activeContainers.map((container) => ({ value: container.id, label: container.name }));
  const canTransfer = activeContainers.length >= 2;
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const result = getPlaceTransferFormSubmission({ sourceContainerId, destinationContainerId, amount, date, note }, {
      sourceRequired: t('paymentContainersPage.transfers.validation.sourceRequired'),
      destinationRequired: t('paymentContainersPage.transfers.validation.destinationRequired'),
      samePlace: t('paymentContainersPage.transfers.validation.samePlace'),
      amountPositive: t('paymentContainersPage.transfers.validation.amountPositive'),
      dateRequired: t('paymentContainersPage.transfers.validation.dateRequired'),
    });

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setError('');
    onSubmit(result.values);
    setAmount('');
    setNote('');
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t('paymentContainersPage.transfers.form.title')}</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">{t('paymentContainersPage.transfers.form.description')}</p>
      </div>
      <div className="space-y-4">
        <Select label={t('paymentContainersPage.transfers.form.source')} value={sourceContainerId} onChange={(event) => setSourceContainerId(event.target.value)} options={placeOptions} disabled={!canTransfer} />
        <Select label={t('paymentContainersPage.transfers.form.destination')} value={destinationContainerId} onChange={(event) => setDestinationContainerId(event.target.value)} options={placeOptions} disabled={!canTransfer} />
        <Input label={t('paymentContainersPage.transfers.form.amount')} type="number" min="0.01" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} error={error} helperText="ARS" disabled={!canTransfer} />
        <Input label={t('paymentContainersPage.transfers.form.date')} type="date" value={date} onChange={(event) => setDate(event.target.value)} disabled={!canTransfer} />
        <Input label={t('paymentContainersPage.transfers.form.note')} value={note} onChange={(event) => setNote(event.target.value)} disabled={!canTransfer} />
        {!canTransfer && <p className="text-sm text-gray-500 dark:text-gray-400">{t('paymentContainersPage.transfers.form.needTwoPlaces')}</p>}
      </div>
      <div className="mt-5"><Button type="submit" isLoading={isSubmitting} disabled={!canTransfer}>{t('paymentContainersPage.transfers.form.submit')}</Button></div>
    </form>
  );
}
