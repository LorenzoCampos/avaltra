import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import '@/i18n';
import type { PaymentContainer } from '@/types/paymentContainer';
import { getPlaceTransferFormSubmission } from './placeTransferFormSubmission';
import { PlaceTransferForm } from './PlaceTransferForm';

const container = (overrides: Partial<PaymentContainer> = {}): PaymentContainer => ({
  id: 'place-1',
  account_id: 'account-1',
  institution_id: null,
  name: 'Main bank account',
  kind: 'bank',
  is_active: true,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  ...overrides,
});

describe('place transfer form', () => {
  it('rejects same-place and non-positive submissions before calling the API', () => {
    expect(getPlaceTransferFormSubmission({ sourceContainerId: 'place-1', destinationContainerId: 'place-1', amount: '100', date: '2026-05-30', note: 'Move cash' }))
      .toEqual({ ok: false, error: 'Source and destination places must be different' });
    expect(getPlaceTransferFormSubmission({ sourceContainerId: 'place-1', destinationContainerId: 'place-2', amount: '0', date: '2026-05-30', note: '' }))
      .toEqual({ ok: false, error: 'Amount must be greater than zero' });
  });

  it('builds an ARS account-currency payload and trims optional notes', () => {
    expect(getPlaceTransferFormSubmission({ sourceContainerId: 'place-1', destinationContainerId: 'place-2', amount: '1250.50', date: '2026-05-30', note: '  Rent split  ' })).toEqual({
      ok: true,
      values: {
        source_container_id: 'place-1',
        destination_container_id: 'place-2',
        amount: 1250.5,
        date: '2026-05-30',
        note: 'Rent split',
        currency: 'ARS',
      },
    });
  });

  it('renders only active places as selectable transfer endpoints', () => {
    const html = renderToStaticMarkup(React.createElement(PlaceTransferForm, {
      containers: [container({ id: 'place-1', name: 'Main bank account' }), container({ id: 'place-2', name: 'Wallet', kind: 'wallet' }), container({ id: 'place-3', name: 'Archived cash', kind: 'cash', is_active: false })],
      isSubmitting: false,
      onSubmit: vi.fn(),
    }));

    expect(html).toContain('Main bank account');
    expect(html).toContain('Wallet');
    expect(html).not.toContain('Archived cash');
    expect(html).toContain('ARS');
  });
});
