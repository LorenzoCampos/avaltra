import { useState } from 'react';
import type { FormEvent } from 'react';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import type { PaymentContainer } from '@/types/paymentContainer';
import type { PaymentInstrument, PaymentInstrumentKind } from '@/types/paymentInstrument';
import { paymentInstrumentKindOptions, paymentInstrumentRequiresBackingContainer } from '@/types/paymentInstrument';
import { getInstrumentFormSubmission } from './formSubmissions';

type InstrumentFormProps = {
  instrument?: PaymentInstrument | null;
  activeContainers: PaymentContainer[];
  isSubmitting?: boolean;
  onSubmit: (values: { name: string; kind: PaymentInstrumentKind; backing_container_id?: string | null; is_active?: boolean }) => void;
  onCancel?: () => void;
};

export function InstrumentForm({ instrument, activeContainers, isSubmitting = false, onSubmit, onCancel }: InstrumentFormProps) {
  const [name, setName] = useState(instrument?.name ?? '');
  const [kind, setKind] = useState<PaymentInstrumentKind>(instrument?.kind ?? 'debit_card');
  const [backingContainerId, setBackingContainerId] = useState(instrument?.backing_container_id ?? '');
  const [error, setError] = useState('');

  const requiresBackingContainer = paymentInstrumentRequiresBackingContainer(kind);
  const containerOptions = [
    { value: '', label: requiresBackingContainer ? 'Select backing container' : 'No backing container' },
    ...activeContainers.map((container) => ({ value: container.id, label: container.name })),
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
          {instrument ? 'Edit instrument' : 'New instrument'}
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">How money moves, such as cards, transfers, or cash payments.</p>
      </div>

      <div className="space-y-4">
        <Input label="Name" value={name} onChange={(event) => setName(event.target.value)} error={error} placeholder="Visa debit" />
        <Select label="Type" value={kind} onChange={(event) => setKind(event.target.value as PaymentInstrumentKind)} options={paymentInstrumentKindOptions} />
        <Select
          label="Backing container"
          value={backingContainerId}
          onChange={(event) => setBackingContainerId(event.target.value)}
          options={containerOptions}
          helperText={requiresBackingContainer ? 'Required for debit and credit cards.' : 'Optional for non-card instruments.'}
        />
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <Button type="submit" isLoading={isSubmitting}>{instrument ? 'Save instrument' : 'Create instrument'}</Button>
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
        )}
      </div>
    </form>
  );
}
