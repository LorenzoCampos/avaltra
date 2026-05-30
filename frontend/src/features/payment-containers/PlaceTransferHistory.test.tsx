import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import '@/i18n';
import type { PlaceTransfer } from '@/types/placeTransfer';
import { PlaceTransferHistory } from './PlaceTransferHistory';

const transfer = (overrides: Partial<PlaceTransfer> = {}): PlaceTransfer => ({
  id: 'transfer-1',
  account_id: 'account-1',
  source_container_id: 'place-1',
  source_container_name: 'Main bank account',
  destination_container_id: 'place-2',
  destination_container_name: 'Wallet',
  amount: 1250.5,
  currency: 'ARS',
  date: '2026-05-30T00:00:00Z',
  note: 'Rent split',
  created_at: '2026-05-30T10:00:00Z',
  updated_at: '2026-05-30T10:00:00Z',
  ...overrides,
});

describe('place transfer history', () => {
  it('renders visible transfer history with source, destination, amount, and note', () => {
    const html = renderToStaticMarkup(React.createElement(PlaceTransferHistory, { transfers: [transfer()], isLoading: false }));

    expect(html).toContain('Main bank account');
    expect(html).toContain('Wallet');
    expect(html).toContain('ARS');
    expect(html).toContain('1,250.50');
    expect(html).toContain('Rent split');
  });
});
