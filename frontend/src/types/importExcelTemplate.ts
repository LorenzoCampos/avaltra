import type { Currency } from '@/types/api';
import type { CategoryType } from '@/types/category';
import type { PaymentMethod } from '@/types/paymentMethod';

export type ImportExcelTemplateClassification = 'importable' | 'invalid' | 'excluded';
export type ImportExcelTemplateMappingStatus = 'resolved' | 'required' | 'not_applicable';

export interface ImportExcelTemplatePreviewRow {
  row_id: string;
  sheet: string;
  sheet_row: number;
  classification: ImportExcelTemplateClassification;
  normalized_type: CategoryType | null;
  date: string | null;
  description: string;
  amount: number | null;
  raw_category: string | null;
  raw_payment_method: string | null;
  payment_method: PaymentMethod | null;
  category_mapping_status: ImportExcelTemplateMappingStatus;
  mapping_key?: string | null;
  reason_codes: string[];
}

export interface ImportExcelTemplateSummary {
  importable: number;
  invalid: number;
  excluded: number;
}

export interface ImportExcelTemplateCategoryMappingItem {
  source_category: string;
  suggested_category_id: string | null;
  suggested_category_name: string | null;
  mapping_status: Extract<ImportExcelTemplateMappingStatus, 'resolved' | 'required'>;
  mapping_key: string;
}

export interface ImportExcelTemplatePreviewResponse {
  summary: ImportExcelTemplateSummary;
  importable: ImportExcelTemplatePreviewRow[];
  invalid: ImportExcelTemplatePreviewRow[];
  excluded: ImportExcelTemplatePreviewRow[];
  category_mappings: {
    expense: ImportExcelTemplateCategoryMappingItem[];
    income: ImportExcelTemplateCategoryMappingItem[];
  };
}

export interface ImportExcelTemplateCommitDecisions {
  approved_row_ids: string[];
  category_map: Record<string, string>;
}

export interface ImportExcelTemplatePreviewRequest {
  accountId: string;
  currency: Currency;
  file: File;
}

export interface ImportExcelTemplateCommitRequest extends ImportExcelTemplatePreviewRequest {
  decisions: ImportExcelTemplateCommitDecisions;
}

export interface ImportExcelTemplateCommitResponse {
  created: {
    income: number;
    expense: number;
  };
  skipped: {
    total: number;
    by_reason: Record<string, number>;
  };
}
