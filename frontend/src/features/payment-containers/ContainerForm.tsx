import { useState } from 'react';
import type { FormEvent } from 'react';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import type { PaymentContainer, PaymentContainerKind } from '@/types/paymentContainer';
import { paymentContainerKindOptions } from '@/types/paymentContainer';
import { getContainerFormSubmission } from './formSubmissions';

type ContainerFormProps = {
  container?: PaymentContainer | null;
  isSubmitting?: boolean;
  onSubmit: (values: { name: string; kind: PaymentContainerKind; is_active?: boolean }) => void;
  onCancel?: () => void;
};

export function ContainerForm({ container, isSubmitting = false, onSubmit, onCancel }: ContainerFormProps) {
  const [name, setName] = useState(container?.name ?? '');
  const [kind, setKind] = useState<PaymentContainerKind>(container?.kind ?? 'bank');
  const [error, setError] = useState('');

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const result = getContainerFormSubmission({ name, kind, existingContainer: container });

    if (!result.ok) {
      setError(result.error);
      return;
    }

    onSubmit(result.values);

    if (!container) {
      setName('');
      setKind('bank');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          {container ? 'Edit container' : 'New container'}
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">Where money is held, such as a bank account, wallet, or cash.</p>
      </div>

      <div className="space-y-4">
        <Input label="Name" value={name} onChange={(event) => setName(event.target.value)} error={error} placeholder="Main bank account" />
        <Select label="Type" value={kind} onChange={(event) => setKind(event.target.value as PaymentContainerKind)} options={paymentContainerKindOptions} />
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <Button type="submit" isLoading={isSubmitting}>{container ? 'Save container' : 'Create container'}</Button>
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
        )}
      </div>
    </form>
  );
}
