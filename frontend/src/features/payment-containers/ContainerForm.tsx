import { useState } from 'react';
import type { FormEvent } from 'react';
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation('navigation');
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
          {container ? t('paymentContainersPage.forms.container.editTitle') : t('paymentContainersPage.forms.container.createTitle')}
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">{t('paymentContainersPage.forms.container.description')}</p>
      </div>

      <div className="space-y-4">
        <Input label={t('paymentContainersPage.forms.name')} value={name} onChange={(event) => setName(event.target.value)} error={error} placeholder={t('paymentContainersPage.forms.container.namePlaceholder')} />
        <Select label={t('paymentContainersPage.forms.type')} value={kind} onChange={(event) => setKind(event.target.value as PaymentContainerKind)} options={paymentContainerKindOptions.map((option) => ({ ...option, label: t(`paymentContainersPage.containerKinds.${option.value}`) }))} />
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <Button type="submit" isLoading={isSubmitting}>{container ? t('paymentContainersPage.forms.container.save') : t('paymentContainersPage.forms.container.create')}</Button>
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>{t('paymentContainersPage.actions.cancel')}</Button>
        )}
      </div>
    </form>
  );
}
