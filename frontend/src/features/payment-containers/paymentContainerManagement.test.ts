import { readFile } from 'node:fs/promises';

import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import '@/i18n';
import type { PaymentContainer } from '@/types/paymentContainer';
import type { PaymentInstrument } from '@/types/paymentInstrument';
import { isCardPaymentInstrumentKind, paymentInstrumentRequiresBackingContainer } from '@/types/paymentInstrument';
import { getContainerFormSubmission, getInstrumentFormSubmission } from './formSubmissions';
import { PaymentContainersPage } from './PaymentContainersPage';

const hookState = vi.hoisted(() => ({
  containersQuery: {
    data: undefined as { payment_containers: PaymentContainer[]; count: number } | undefined,
    isLoading: false,
    error: null as Error | null,
  },
  instrumentsQuery: {
    data: undefined as { payment_instruments: PaymentInstrument[]; count: number } | undefined,
    isLoading: false,
    error: null as Error | null,
  },
  createContainer: { mutate: vi.fn(), isPending: false },
  updateContainer: { mutate: vi.fn(), isPending: false },
  deactivateContainer: { mutate: vi.fn(), isPending: false },
  createInstrument: { mutate: vi.fn(), isPending: false },
  updateInstrument: { mutate: vi.fn(), isPending: false },
  deactivateInstrument: { mutate: vi.fn(), isPending: false },
}));

vi.mock('@/hooks/usePaymentContainers', () => ({
  usePaymentContainers: vi.fn(() => hookState.containersQuery),
  useCreatePaymentContainer: vi.fn(() => hookState.createContainer),
  useUpdatePaymentContainer: vi.fn(() => hookState.updateContainer),
  useDeactivatePaymentContainer: vi.fn(() => hookState.deactivateContainer),
}));

vi.mock('@/hooks/usePaymentInstruments', () => ({
  usePaymentInstruments: vi.fn(() => hookState.instrumentsQuery),
  useCreatePaymentInstrument: vi.fn(() => hookState.createInstrument),
  useUpdatePaymentInstrument: vi.fn(() => hookState.updateInstrument),
  useDeactivatePaymentInstrument: vi.fn(() => hookState.deactivateInstrument),
}));

const readSource = (relativePath: string) => readFile(new URL(`../../${relativePath}`, import.meta.url), 'utf8');

const container = (overrides: Partial<PaymentContainer> = {}): PaymentContainer => ({
  id: 'container-1',
  account_id: 'account-1',
  institution_id: null,
  name: 'Main bank account',
  kind: 'bank',
  is_active: true,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  ...overrides,
});

const instrument = (overrides: Partial<PaymentInstrument> = {}): PaymentInstrument => ({
  id: 'instrument-1',
  account_id: 'account-1',
  institution_id: null,
  backing_container_id: 'container-1',
  name: 'Visa debit',
  kind: 'debit_card',
  is_active: true,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  ...overrides,
});

const renderManagementPage = () => renderToStaticMarkup(React.createElement(PaymentContainersPage));

describe('payment container management behavior', () => {
  beforeEach(() => {
    hookState.containersQuery = { data: { payment_containers: [], count: 0 }, isLoading: false, error: null };
    hookState.instrumentsQuery = { data: { payment_instruments: [], count: 0 }, isLoading: false, error: null };
    hookState.createContainer.mutate.mockReset();
    hookState.updateContainer.mutate.mockReset();
    hookState.deactivateContainer.mutate.mockReset();
    hookState.createInstrument.mutate.mockReset();
    hookState.updateInstrument.mutate.mockReset();
    hookState.deactivateInstrument.mutate.mockReset();
  });

  it('renders the loading state while either management query is loading', () => {
    hookState.containersQuery = { data: undefined, isLoading: true, error: null };

    expect(renderManagementPage()).toContain('Cargando lugares y medios…');
  });

  it('renders the error state when a management query fails', () => {
    hookState.instrumentsQuery = { data: undefined, isLoading: false, error: new Error('network failed') };

    expect(renderManagementPage()).toContain('No se pudieron cargar los lugares y medios de pago. Intentá de nuevo.');
  });

  it('renders empty management lists without hiding the create forms', () => {
    const html = renderManagementPage();

    expect(html).toContain('Nuevo lugar');
    expect(html).toContain('Nuevo medio');
    expect(html).toContain('Todavía no hay lugares cargados.');
    expect(html).toContain('Todavía no hay medios cargados.');
  });

  it('renders active and inactive containers and instruments with backing-container labels', () => {
    hookState.containersQuery = {
      data: {
        payment_containers: [container(), container({ id: 'container-2', name: 'Cash box', kind: 'cash', is_active: false })],
        count: 2,
      },
      isLoading: false,
      error: null,
    };
    hookState.instrumentsQuery = {
      data: {
        payment_instruments: [instrument(), instrument({ id: 'instrument-2', name: 'Manual transfer', kind: 'transfer', backing_container_id: null, is_active: false })],
        count: 2,
      },
      isLoading: false,
      error: null,
    };

    const html = renderManagementPage();

    expect(html).toContain('Main bank account');
    expect(html).toContain('Cuenta bancaria');
    expect(html).toContain('Cash box');
    expect(html).toContain('Inactivo');
    expect(html).toContain('Visa debit');
    expect(html).toContain('Tarjeta de débito asociado a Main bank account');
    expect(html).toContain('Manual transfer');
    expect(html).toContain('Transferencia bancaria');
  });

  it('validates container submissions and trims names before create/update mutation payloads', () => {
    expect(getContainerFormSubmission({ name: '   ', kind: 'bank' })).toEqual({ ok: false, error: 'Name is required' });

    expect(getContainerFormSubmission({ name: '  Main wallet  ', kind: 'wallet' })).toEqual({
      ok: true,
      values: { name: 'Main wallet', kind: 'wallet' },
    });

    expect(getContainerFormSubmission({ name: 'Cash box', kind: 'cash', existingContainer: container({ is_active: false }) })).toEqual({
      ok: true,
      values: { name: 'Cash box', kind: 'cash' },
    });
  });

  it('does not reactivate inactive entities when editing only their name or type', () => {
    expect(getContainerFormSubmission({ name: '  Cash box  ', kind: 'cash', existingContainer: container({ is_active: false }) })).toEqual({
      ok: true,
      values: { name: 'Cash box', kind: 'cash' },
    });

    expect(getInstrumentFormSubmission({
      name: '  Old debit  ',
      kind: 'debit_card',
      backingContainerId: 'container-1',
      existingInstrument: instrument({ is_active: false }),
    })).toEqual({
      ok: true,
      values: { name: 'Old debit', kind: 'debit_card', backing_container_id: 'container-1' },
    });
  });

  it('keeps an inactive backing container selectable while editing its existing instrument', async () => {
    const form = await readSource('features/payment-containers/InstrumentForm.tsx');

    expect(form).toContain('container.is_active || container.id === instrument?.backing_container_id');
    expect(form).toContain('inactiveContainerOption');
  });

  it('enforces card backing at form-submit payload level before instrument mutations run', () => {
    expect(isCardPaymentInstrumentKind('credit_card')).toBe(true);
    expect(paymentInstrumentRequiresBackingContainer('debit_card')).toBe(true);

    expect(getInstrumentFormSubmission({ name: 'Visa debit', kind: 'debit_card', backingContainerId: '' })).toEqual({
      ok: false,
      error: 'Card instruments require a backing container',
    });

    expect(getInstrumentFormSubmission({ name: '  Visa debit  ', kind: 'debit_card', backingContainerId: 'container-1' })).toEqual({
      ok: true,
      values: { name: 'Visa debit', kind: 'debit_card', backing_container_id: 'container-1' },
    });

    expect(getInstrumentFormSubmission({ name: 'Wire transfer', kind: 'transfer', backingContainerId: '' })).toEqual({
      ok: true,
      values: { name: 'Wire transfer', kind: 'transfer', backing_container_id: null },
    });
  });

  it('keeps transaction form/list work out of the PR3 management slice', async () => {
    const page = await readSource('features/payment-containers/PaymentContainersPage.tsx');

    expect(page).toContain('usePaymentContainers');
    expect(page).toContain('usePaymentInstruments');
    expect(page).not.toContain('ExpenseForm');
    expect(page).not.toContain('IncomeForm');
  });
});
