import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import {
  buildImportExcelTemplateCommitDecisions,
  buildImportExcelTemplatePaymentMethodPreview,
  getRequiredImportCategoryMappings,
} from './ImportExcelTemplatePage.helpers';
import {
  type ImportExcelTemplatePreviewResponse,
  ImportExcelTemplateWizardView,
} from './ImportExcelTemplatePage';

const preview: ImportExcelTemplatePreviewResponse = {
  summary: {
    importable: 1,
    invalid: 1,
    excluded: 1,
  },
  importable: [
    {
      row_id: 'enero:8',
      sheet: 'Enero ',
      sheet_row: 8,
      classification: 'importable',
      normalized_type: 'expense',
      date: '2026-01-08',
      description: 'Supermercado',
      amount: 1200,
      raw_category: 'Comida Casa',
      raw_payment_method: 'Mercado Pago',
      payment_method: 'digital_wallet',
      category_mapping_status: 'required',
      mapping_key: 'expense:Comida Casa',
      reason_codes: [],
    },
  ],
  invalid: [
    {
      row_id: 'enero:9',
      sheet: 'Enero ',
      sheet_row: 9,
      classification: 'invalid',
      normalized_type: 'expense',
      date: '2026-01-09',
      description: 'Taxi',
      amount: 450,
      raw_category: 'Traslado',
      raw_payment_method: 'Crypto',
      payment_method: null,
      category_mapping_status: 'resolved',
      reason_codes: ['unsupported_payment_method'],
    },
  ],
  excluded: [
    {
      row_id: 'enero:10',
      sheet: 'Enero ',
      sheet_row: 10,
      classification: 'excluded',
      normalized_type: null,
      date: '2026-01-10',
      description: 'Fondo de reserva',
      amount: 500,
      raw_category: 'Ahorro',
      raw_payment_method: 'Efectivo',
      payment_method: 'cash',
      category_mapping_status: 'not_applicable',
      reason_codes: ['unsupported_type_ahorro'],
    },
  ],
  category_mappings: {
    expense: [
      {
        source_category: ' Comida Casa ',
        suggested_category_id: null,
        suggested_category_name: null,
        mapping_status: 'required',
        mapping_key: 'expense:Comida Casa',
      },
    ],
    income: [],
  },
};

describe('ImportExcelTemplatePage helpers', () => {
  it('blocks confirm until required category mappings are filled and builds commit decisions deterministically', () => {
    expect(getRequiredImportCategoryMappings(preview, {})).toEqual([
      {
        key: 'expense:Comida Casa',
        type: 'expense',
        source_category: ' Comida Casa ',
      },
    ]);

    expect(
      buildImportExcelTemplateCommitDecisions(preview, {
        'expense:Comida Casa': 'expense-category-1',
      }),
    ).toEqual({
      approved_row_ids: ['enero:8'],
      category_map: {
        'expense:Comida Casa': 'expense-category-1',
      },
    });
  });

  it('renders importable, invalid, and excluded sections with MEDIO and payment_method visibility', () => {
    const markup = renderToStaticMarkup(
      React.createElement(ImportExcelTemplateWizardView, {
        currentStep: 'review',
        accounts: [{ id: 'acc-1', name: 'Casa', currency: 'ARS' }],
        selectedAccountId: 'acc-1',
        selectedCurrency: 'ARS',
        selectedFileName: 'Planilla.xlsx',
        preview,
        result: null,
        mappings: {},
        pendingMappings: getRequiredImportCategoryMappings(preview, {}),
        categoryOptions: {
          expense: [{ value: 'expense-category-1', label: 'Alimentos' }],
          income: [],
        },
        previewError: null,
        commitError: null,
        isPreviewPending: false,
        isCommitPending: false,
        onAccountChange: () => {},
        onCurrencyChange: () => {},
        onFileChange: () => {},
        onMappingChange: () => {},
        onSubmitPreview: () => {},
        onBackToUpload: () => {},
        onGoToConfirm: () => {},
        onBackToReview: () => {},
        onSubmitCommit: () => {},
        onStartOver: () => {},
      }),
    );

    expect(markup).toContain('Importable rows');
    expect(markup).toContain('Invalid rows');
    expect(markup).toContain('Excluded rows');
    expect(markup).toContain('MEDIO: Mercado Pago');
    expect(markup).toContain('payment_method: digital_wallet');
    expect(markup).toContain('Unsupported MEDIO value.');
    expect(markup).toContain('Ahorro is excluded in this MVP.');
    expect(markup).toContain('Complete 1 required category mapping');
  });

  it('formats MEDIO and mapped payment_method consistently for preview rows', () => {
    expect(buildImportExcelTemplatePaymentMethodPreview('Mercado Pago', 'digital_wallet')).toBe(
      'MEDIO: Mercado Pago · payment_method: digital_wallet',
    );
    expect(buildImportExcelTemplatePaymentMethodPreview(null, null)).toBe('MEDIO: — · payment_method: —');
  });
});
