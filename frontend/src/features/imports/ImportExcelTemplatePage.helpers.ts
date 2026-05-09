import type {
  ImportExcelTemplateCategoryMappingItem,
  ImportExcelTemplatePreviewResponse,
  ImportExcelTemplatePreviewRow,
} from '@/types/importExcelTemplate';

type ImportCategoryMappingRequirement = {
  key: string;
  type: 'expense' | 'income';
  source_category: string;
};

const IMPORT_REASON_LABELS: Record<string, string> = {
  unsupported_type_ahorro: 'Ahorro is excluded in this MVP.',
  unsupported_payment_method: 'Unsupported MEDIO value.',
  missing_category_mapping: 'Missing explicit category mapping.',
  invalid_date: 'Invalid date.',
  invalid_amount: 'Amount must be positive.',
  missing_description: 'Missing description.',
  type_category_mismatch: 'Category does not match row type.',
};

const normalizeImportReasonLabel = (reasonCode: string) => {
  return IMPORT_REASON_LABELS[reasonCode] ?? `${reasonCode.replaceAll('_', ' ')}.`;
};

export const getRequiredImportCategoryMappings = (
  preview: ImportExcelTemplatePreviewResponse | null,
  mappings: Record<string, string>,
): ImportCategoryMappingRequirement[] => {
  if (!preview) {
    return [];
  }

  const collectPendingMappings = (
    type: 'expense' | 'income',
    items: ImportExcelTemplateCategoryMappingItem[],
  ) => {
    return items
      .filter((item) => item.mapping_status === 'required')
      .map((item) => ({
        key: item.mapping_key,
        type,
        source_category: item.source_category,
      }))
      .filter((item) => !mappings[item.key]);
  };

  return [
    ...collectPendingMappings('expense', preview.category_mappings.expense),
    ...collectPendingMappings('income', preview.category_mappings.income),
  ];
};

export const buildImportExcelTemplateCommitDecisions = (
  preview: ImportExcelTemplatePreviewResponse,
  mappings: Record<string, string>,
) => {
  const categoryMap = Object.entries(mappings).reduce<Record<string, string>>((accumulator, [key, categoryId]) => {
    if (categoryId) {
      accumulator[key] = categoryId;
    }

    return accumulator;
  }, {});

  return {
    approved_row_ids: preview.importable.map((row) => row.row_id),
    category_map: categoryMap,
  };
};

export const buildImportExcelTemplatePaymentMethodPreview = (
  rawPaymentMethod: string | null,
  paymentMethod: string | null,
) => {
  return `MEDIO: ${rawPaymentMethod ?? '—'} · payment_method: ${paymentMethod ?? '—'}`;
};

export const formatImportRowReasonLabels = (row: ImportExcelTemplatePreviewRow) => {
  if (row.reason_codes.length === 0) {
    return 'No issues.';
  }

  return row.reason_codes.map(normalizeImportReasonLabel).join(' ');
};

export type { ImportCategoryMappingRequirement };
