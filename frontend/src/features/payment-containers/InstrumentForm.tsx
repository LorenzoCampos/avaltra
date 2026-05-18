import { useState } from 'react';
import type { FormEvent } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import type { PaymentContainer } from '@/types/paymentContainer';
import type { PaymentInstrument, PaymentInstrumentKind } from '@/types/paymentInstrument';
import { paymentInstrumentKindOptions, paymentInstrumentRequiresBackingContainer } from '@/types/paymentInstrument';
import { getInstrumentFormSubmission } from './formSubmissions';

type InstrumentFormProps = {
  instrument?: PaymentInstrument | null;
  containers: PaymentContainer[];
  isSubmitting?: boolean;
  onSubmit: (values: { name: string; kind: PaymentInstrumentKind; backing_container_id?: string | null; is_active?: boolean }) => void;
  onCancel?: () => void;
};

export function InstrumentForm({ instrument, containers, isSubmitting = false, onSubmit, onCancel }: InstrumentFormProps) {
  const { t } = useTranslation('navigation');
  const [name, setName] = useState(instrument?.name ?? '');
  const [kind, setKind] = useState<PaymentInstrumentKind>(instrument?.kind ?? 'debit_card');
  const [backingContainerId, setBackingContainerId] = useState(instrument?.backing_container_id ?? '');
  const [error, setError] = useState('');

  const requiresBackingContainer = paymentInstrumentRequiresBackingContainer(kind);
  const selectableContainers = containers.filter((container) => container.is_active || container.id === instrument?.backing_container_id);
  const containerOptions = [
    { value: '', label: requiresBackingContainer ? t('paymentContainersPage.forms.instrument.selectBackingContainer') : t('paymentContainersPage.forms.instrument.noBackingContainer') },
    ...selectableContainers.map((container) => ({
      value: container.id,
      label: container.is_active ? container.name : t('paymentContainersPage.forms.instrument.inactiveContainerOption', { name: container.name }),
    })),
  ];

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const result = getInstrumentFormSubmission({
      name,
      kind,
      backingContainerId,
      existingInstrument: instrument,
    });

    if (!result.ok) {
      setError(result.error);
      return;
    }

    onSubmit(result.values);

    if (!instrument) {
      setName('');
      setKind('debit_card');
      setBackingContainerId('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          {instrument ? t('paymentContainersPage.forms.instrument.editTitle') : t('paymentContainersPage.forms.instrument.createTitle')}
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">{t('paymentContainersPage.forms.instrument.description')}</p>
      </div>

      <div className="space-y-4">
        <Input label={t('paymentContainersPage.forms.name')} value={name} onChange={(event) => setName(event.target.value)} error={error} placeholder={t('paymentContainersPage.forms.instrument.namePlaceholder')} />
        <Select label={t('paymentContainersPage.forms.type')} value={kind} onChange={(event) => setKind(event.target.value as PaymentInstrumentKind)} options={paymentInstrumentKindOptions.map((option) => ({ ...option, label: t(`paymentContainersPage.instrumentKinds.${option.value}`) }))} />
        <Select
          label={t('paymentContainersPage.forms.instrument.backingContainer')}
          value={backingContainerId}
          onChange={(event) => setBackingContainerId(event.target.value)}
          options={containerOptions}
          helperText={requiresBackingContainer ? t('paymentContainersPage.forms.instrument.backingRequiredHelp') : t('paymentContainersPage.forms.instrument.backingOptionalHelp')}
        />
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <Button type="submit" isLoading={isSubmitting}>{instrument ? t('paymentContainersPage.forms.instrument.save') : t('paymentContainersPage.forms.instrument.create')}</Button>
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>{t('paymentContainersPage.actions.cancel')}</Button>
        )}
      </div>
    </form>
  );
}
