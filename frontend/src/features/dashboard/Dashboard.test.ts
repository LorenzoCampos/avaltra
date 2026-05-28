// @vitest-environment happy-dom

import { readFileSync } from 'node:fs';
import path from 'node:path';

import { act, createElement, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import dashboardEn from '@/i18n/locales/en/dashboard.json';
import tourEn from '@/i18n/locales/en/tour.json';
import dashboardEs from '@/i18n/locales/es/dashboard.json';
import tourEs from '@/i18n/locales/es/tour.json';
import { Dashboard } from './Dashboard';
import { getDashboardErrorMessage } from './dashboardErrorMessage';
import { getDashboardCardAmounts } from './dashboardSummaryCards';
import { getDashboardCurrency } from './dashboardCurrency';
import { getDashboardMoneyByContainerItems } from './dashboardMoneyByContainer';

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  useDashboard: vi.fn(),
  forecastTitle: "Next month's recurring expenses",
  forecastSubtitle: 'Projected total for the next calendar month',
  forecastTooltip: 'Backend-provided recurring expense forecast',
}));

vi.mock('react-router-dom', () => ({ useNavigate: () => mocks.navigate }));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, values?: Record<string, unknown>) => {
      if (key === 'welcome') return `Welcome, ${values?.name ?? ''}`;
      if (key === 'overview') return `Overview for ${values?.period}`;
      if (key === 'recurringForecast.title') return mocks.forecastTitle;
      if (key === 'recurringForecast.subtitle') return mocks.forecastSubtitle;
      if (key === 'recurringForecast.tooltip') return mocks.forecastTooltip;
      return key;
    },
  }),
}));
vi.mock('@/hooks/useDashboard', () => ({ useDashboard: mocks.useDashboard }));
vi.mock('@/hooks/useAccounts', () => ({ useAccounts: () => undefined }));
vi.mock('@/stores/account.store', () => ({
  useAccountStore: () => ({
    activeAccountId: 'account-1',
    activeAccount: { id: 'account-1', name: 'Main', currency: 'ARS', type: 'personal' },
  }),
}));
vi.mock('@/stores/auth.store', () => ({ useAuthStore: () => ({ user: { name: 'User' } }) }));
vi.mock('@/hooks/useMoneyFormatter', () => ({ useMoneyFormatter: () => ({ formatMoney: (amount: number, currency: string) => `${currency} ${amount}` }) }));
vi.mock('@/components/InfoTooltip', () => ({ InfoTooltip: ({ content }: { content: string }) => content }));
vi.mock('@/components/ErrorBoundary', () => ({ FeatureErrorBoundary: ({ children }: { children: ReactNode }) => children }));
vi.mock('./InsightsCard', () => ({ InsightsCard: () => null }));
vi.mock('@/components/QuickAddExpenseFAB', () => ({ QuickAddExpenseFAB: () => null }));

const apiDocPath = path.resolve(__dirname, '../../../../API.md');
const featuresDocPath = path.resolve(__dirname, '../../../../FEATURES.md');
const dashboardSourcePath = path.resolve(__dirname, './Dashboard.tsx');
const apiDoc = readFileSync(apiDocPath, 'utf8');
const featuresDoc = readFileSync(featuresDocPath, 'utf8');
const dashboardSource = readFileSync(dashboardSourcePath, 'utf8');

const renderDashboard = () => {
  mocks.useDashboard.mockReturnValue({
    dashboard: {
      period: '2026-05',
      primary_currency: 'ARS',
      available_balance: 0,
      current_available_balance: 0,
      total_expenses: 0,
      total_income: 0,
      total_assigned_to_goals: 0,
      next_month_recurring_expense_total: 1234.56,
      expenses_by_category: [],
      top_expenses: [],
      recent_transactions: [],
      upcoming_recurring: { count: 0, items: [] },
      money_by_container: [],
    },
    isLoading: false,
    error: null,
  });

  const container = document.createElement('div');
  const root = createRoot(container);
  document.body.appendChild(container);
  act(() => root.render(createElement(Dashboard)));
  return { container, root };
};

beforeEach(() => {
  mocks.navigate.mockReset();
  mocks.useDashboard.mockReset();
});

afterEach(() => {
  document.body.innerHTML = '';
});

describe('dashboard summary card semantics', () => {
	it('uses current_available_balance for the main balance card and keeps monthly flows unchanged', () => {
		expect(
			getDashboardCardAmounts({
				available_balance: 150,
				current_available_balance: 1300,
				total_expenses: 400,
				total_income: 1000,
			}),
		).toEqual({
			currentAvailableBalance: 1300,
			totalExpenses: 400,
			totalIncome: 1000,
		});
	});

	it('falls back to zeroes when dashboard data is missing', () => {
		expect(getDashboardCardAmounts()).toEqual({
			currentAvailableBalance: 0,
			totalExpenses: 0,
			totalIncome: 0,
		});
	});

	it('falls back to legacy available_balance when current_available_balance is absent', () => {
		expect(
			getDashboardCardAmounts({
				available_balance: 725,
				total_expenses: 120,
				total_income: 845,
			}),
		).toEqual({
			currentAvailableBalance: 725,
			totalExpenses: 120,
			totalIncome: 845,
		});
	});
});

describe('dashboard currency resolution', () => {
	it('uses the dashboard primary currency when it is explicit', () => {
		expect(getDashboardCurrency('USD', 'ARS')).toBe('USD');
	});

	it('falls back to the active account currency when the summary currency is implicit', () => {
		expect(getDashboardCurrency(undefined, 'EUR')).toBe('EUR');
	});
});

describe('dashboard money by container breakdown', () => {
	it('keeps backend percentages and labels the unassigned bucket', () => {
		expect(
			getDashboardMoneyByContainerItems([
				{
					container_id: 'wallet-1',
					name: 'Mercado Pago',
					type: 'wallet',
					total: 800,
					percentage: 80,
					is_unassigned: false,
				},
				{
					container_id: null,
					name: 'Unassigned',
					type: null,
					total: 200,
					percentage: 20,
					is_unassigned: true,
				},
			], 'Unassigned'),
		).toEqual([
			{ key: 'wallet-1', label: 'Mercado Pago', total: 800, percentage: 80, isUnassigned: false },
			{ key: 'unassigned', label: 'Unassigned', total: 200, percentage: 20, isUnassigned: true },
		]);
	});

	it('shows only places with a current positive available balance', () => {
		expect(
			getDashboardMoneyByContainerItems([
				{
					container_id: 'wallet-1',
					name: 'Mercado Pago',
					type: 'wallet',
					total: 800,
					percentage: 80,
					is_unassigned: false,
				},
				{
					container_id: 'cash-1',
					name: 'Cash',
					type: 'cash',
					total: 0,
					percentage: 0,
					is_unassigned: false,
				},
				{
					container_id: 'bank-1',
					name: 'Overdrawn bank',
					type: 'bank',
					total: -50,
					percentage: 0,
					is_unassigned: false,
				},
			], 'Unassigned'),
		).toEqual([
			{ key: 'wallet-1', label: 'Mercado Pago', total: 800, percentage: 80, isUnassigned: false },
		]);
	});

	it('returns an empty list when the backend omits the optional field', () => {
		expect(getDashboardMoneyByContainerItems(undefined, 'Unassigned')).toEqual([]);
	});
});

describe('dashboard next-month recurring forecast', () => {
	it('has localized copy for the backend-provided forecast insight', () => {
		expect(dashboardEn.recurringForecast.title).toContain("Next month's recurring expenses");
		expect(dashboardEn.recurringForecast.subtitle).toContain('next calendar month');
		expect(dashboardEs.recurringForecast.title).toContain('Gastos recurrentes');
		expect(dashboardEs.recurringForecast.subtitle).toContain('próximo mes calendario');
	});

  it('renders the backend next_month_recurring_expense_total field without client recurrence aggregation', () => {
		expect(dashboardSource).toContain('next_month_recurring_expense_total');
		expect(dashboardSource).toContain("t('recurringForecast.title')");
		expect(dashboardSource).not.toContain('ShouldOccurOnDate');
		expect(dashboardSource).not.toContain('recurrence_frequency');
    expect(dashboardSource).not.toContain('recurrence_interval');
  });

  it('shows the forecast card using the backend-provided amount', () => {
    const { container, root } = renderDashboard();

    expect(container.textContent).toContain("Next month's recurring expenses");
    expect(container.textContent).toContain('ARS 1234.56');
    expect(container.textContent).toContain('next calendar month');

    act(() => root.unmount());
  });
});

describe('dashboard copy clarifies current balance vs monthly flow', () => {
	it('updates Spanish dashboard and tour copy', () => {
		expect(dashboardEs.cards.availableBalance.title).toContain('Actual');
		expect(dashboardEs.cards.availableBalance.subtitle).toContain('acumulado');
		expect(dashboardEs.cards.availableBalance.subtitle).toContain('hoy');
		expect(dashboardEs.cards.expenses.title).toContain('Mes');
		expect(dashboardEs.cards.income.title).toContain('Mes');
		expect(dashboardEs.tooltips.availableBalance).toContain('acumulado');
		expect(dashboardEs.moneyByContainer.title).toContain('actual');
		expect(dashboardEs.tooltips.moneyByContainer).toContain('disponible actual');
		expect(tourEs.steps.availableBalance).toContain('actual');
	});

	it('updates English dashboard and tour copy', () => {
		expect(dashboardEn.cards.availableBalance.title).toContain('Current');
		expect(dashboardEn.cards.expenses.title).toContain("Month");
		expect(dashboardEn.cards.income.title).toContain("Month");
		expect(dashboardEn.cards.expenses.subtitle).toContain('this month');
		expect(dashboardEn.cards.income.subtitle).toContain('this month');
		expect(dashboardEn.tooltips.availableBalance).toContain('accumulated');
		expect(dashboardEn.moneyByContainer.title).toContain('current');
		expect(dashboardEn.tooltips.moneyByContainer).toContain('current available');
		expect(tourEn.steps.availableBalance).toContain('current');
	});
});

describe('dashboard error messaging', () => {
	it('prefers API error details before generic fallback copy', () => {
		expect(
			getDashboardErrorMessage(
				{
					response: {
						data: {
							error: 'Backend exploded',
						},
					},
					message: 'Network failed',
				},
				'Fallback message',
			),
		).toBe('Backend exploded');
	});

	it('falls back to generic copy when the error is unknown', () => {
		expect(getDashboardErrorMessage(null, 'Fallback message')).toBe('Fallback message');
	});
});

describe('dashboard docs explain current balance vs monthly flow', () => {
	it('documents the API semantics and UI usage', () => {
		expect(apiDoc).toContain('`available_balance`: Campo legacy con semántica mensual.');
		expect(apiDoc).toContain('`current_available_balance`: Campo recomendado para UI nueva.');
		expect(apiDoc).toContain('La tarjeta principal del dashboard usa `current_available_balance`; ingresos y gastos siguen siendo métricas mensuales');
	});

	it('documents the product semantics in FEATURES', () => {
		expect(featuresDoc).toContain('La tarjeta principal del dashboard usa `current_available_balance` para mostrar el saldo actual acumulado.');
		expect(featuresDoc).toContain('Las tarjetas de ingresos y gastos siguen mostrando únicamente el flujo mensual del `month` pedido.');
		expect(featuresDoc).toContain('Campo legacy mensual');
		expect(featuresDoc).toContain('saldo disponible actual acumulado');
	});
});
