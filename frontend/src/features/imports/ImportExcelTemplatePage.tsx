import { useMemo, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { useAccounts } from '@/hooks/useAccounts';
import { useExpenseCategories, useIncomeCategories } from '@/hooks/useCategories';
import {
  useImportExcelTemplateCommit,
  useImportExcelTemplatePreview,
} from '@/hooks/useImportExcelTemplate';
import {
  buildImportExcelTemplateCommitDecisions,
  buildImportExcelTemplatePaymentMethodPreview,
  formatImportRowReasonLabels,
  getRequiredImportCategoryMappings,
  type ImportCategoryMappingRequirement,
} from '@/features/imports/ImportExcelTemplatePage.helpers';
import type { Currency } from '@/types/api';
import type { Account } from '@/types/account';
import type {
  ImportExcelTemplateCommitResponse,
  ImportExcelTemplatePreviewResponse,
  ImportExcelTemplatePreviewRow,
} from '@/types/importExcelTemplate';

type ImportWizardStep = 'upload' | 'review' | 'confirm' | 'result';

type CategoryOption = {
  value: string;
  label: string;
};

type ImportExcelTemplateWizardViewProps = {
  currentStep: ImportWizardStep;
  accounts: Array<Pick<Account, 'id' | 'name' | 'currency'>>;
  selectedAccountId: string;
  selectedCurrency: Currency;
  selectedFileName: string | null;
  preview: ImportExcelTemplatePreviewResponse | null;
  result: ImportExcelTemplateCommitResponse | null;
  mappings: Record<string, string>;
  pendingMappings: ImportCategoryMappingRequirement[];
  categoryOptions: {
    expense: CategoryOption[];
    income: CategoryOption[];
  };
  previewError: string | null;
  commitError: string | null;
  isPreviewPending: boolean;
  isCommitPending: boolean;
  onAccountChange: (accountId: string) => void;
  onCurrencyChange: (currency: Currency) => void;
  onFileChange: (file: File | null) => void;
  onMappingChange: (key: string, categoryId: string) => void;
  onSubmitPreview: () => void;
  onBackToUpload: () => void;
  onGoToConfirm: () => void;
  onBackToReview: () => void;
  onSubmitCommit: () => void;
  onStartOver: () => void;
};

const CURRENCY_OPTIONS: Array<{ value: Currency; label: string }> = [
  { value: 'ARS', label: 'ARS' },
  { value: 'USD', label: 'USD' },
  { value: 'EUR', label: 'EUR' },
];

const getInitialImportCategoryMappings = (preview: ImportExcelTemplatePreviewResponse | null) => {
  if (!preview) {
    return {};
  }

  const initialMappings: Record<string, string> = {};
  const mappingEntries = [
    ...preview.category_mappings.expense.map((item) => ({ item })),
    ...preview.category_mappings.income.map((item) => ({ item })),
  ];

  mappingEntries.forEach(({ item }) => {
    if (item.suggested_category_id) {
      initialMappings[item.mapping_key] = item.suggested_category_id;
    }
  });

  return initialMappings;
};

const ImportRowsSection = ({
  title,
  rows,
}: {
  title: string;
  rows: ImportExcelTemplatePreviewRow[];
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {rows.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">No rows in this section.</p>
        ) : (
          rows.map((row) => (
            <div
              key={row.row_id}
              className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-2"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">{row.description || '—'}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {row.sheet.trim()} · row {row.sheet_row} · {row.date ?? 'No date'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{row.amount ?? '—'}</p>
                  <p className="text-xs uppercase text-gray-500 dark:text-gray-400">
                    {row.normalized_type ?? row.classification}
                  </p>
                </div>
              </div>

              <p className="text-sm text-gray-600 dark:text-gray-300">
                Category: {row.raw_category ?? '—'}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {buildImportExcelTemplatePaymentMethodPreview(row.raw_payment_method, row.payment_method)}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-300">{formatImportRowReasonLabels(row)}</p>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
};

const ImportSummaryCards = ({ preview }: { preview: ImportExcelTemplatePreviewResponse }) => {
  const cards = [
    { label: 'Importable', value: preview.summary.importable },
    { label: 'Invalid', value: preview.summary.invalid },
    { label: 'Excluded', value: preview.summary.excluded },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {cards.map((card) => (
        <Card key={card.label}>
          <CardContent className="space-y-1">
            <p className="text-sm text-gray-500 dark:text-gray-400">{card.label}</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">{card.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

const ImportCategoryMappingsSection = ({
  preview,
  mappings,
  categoryOptions,
  onMappingChange,
}: {
  preview: ImportExcelTemplatePreviewResponse;
  mappings: Record<string, string>;
  categoryOptions: ImportExcelTemplateWizardViewProps['categoryOptions'];
  onMappingChange: ImportExcelTemplateWizardViewProps['onMappingChange'];
}) => {
  const renderMappingSelects = (
    type: 'expense' | 'income',
    items: ImportExcelTemplateCategoryMappingItem[],
  ) => {
    if (items.length === 0) {
      return null;
    }

    return (
      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          {type === 'expense' ? 'Expense categories' : 'Income categories'}
        </h3>
        {items.map((item) => {
          const key = item.mapping_key;

          return (
            <div
              key={key}
              className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-2"
            >
              <p className="font-medium text-gray-900 dark:text-white">{item.source_category}</p>
              {item.suggested_category_name ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Suggested: {item.suggested_category_name}
                </p>
              ) : null}
              <Select
                value={mappings[key] ?? ''}
                onChange={(event) => onMappingChange(key, event.target.value)}
              >
                <option value="">Choose destination category</option>
                {categoryOptions[type].map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Category mappings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-gray-600 dark:text-gray-300">
          Each distinct Excel `CATEGORIA` used by importable rows needs an explicit destination category mapping before commit.
        </p>
        {renderMappingSelects('expense', preview.category_mappings.expense)}
        {renderMappingSelects('income', preview.category_mappings.income)}
      </CardContent>
    </Card>
  );
};

const ImportCommitResult = ({ result }: { result: ImportExcelTemplateCommitResponse }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Import result</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
        <p>Created incomes: {result.created.income}</p>
        <p>Created expenses: {result.created.expense}</p>
        <p>Skipped rows: {result.skipped.total}</p>
        <div className="space-y-1">
          {Object.entries(result.skipped.by_reason).length === 0 ? (
            <p>No skipped reasons returned.</p>
          ) : (
            Object.entries(result.skipped.by_reason).map(([reason, total]) => (
              <p key={reason}>
                {reason}: {total}
              </p>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export const ImportExcelTemplateWizardView = ({
  currentStep,
  accounts,
  selectedAccountId,
  selectedCurrency,
  selectedFileName,
  preview,
  result,
  mappings,
  pendingMappings,
  categoryOptions,
  previewError,
  commitError,
  isPreviewPending,
  isCommitPending,
  onAccountChange,
  onCurrencyChange,
  onFileChange,
  onMappingChange,
  onSubmitPreview,
  onBackToUpload,
  onGoToConfirm,
  onBackToReview,
  onSubmitCommit,
  onStartOver,
}: ImportExcelTemplateWizardViewProps) => {
  const pendingMappingsLabel =
    pendingMappings.length === 1
      ? 'Complete 1 required category mapping'
      : `Complete ${pendingMappings.length} required category mappings`;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Import Excel template</h1>
        <p className="text-gray-600 dark:text-gray-400">
          MVP flow: upload workbook → review rows and mappings → confirm import.
        </p>
      </div>

      {currentStep === 'upload' ? (
        <Card>
          <CardHeader>
            <CardTitle>1. Upload workbook</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Select label="Target account" value={selectedAccountId} onChange={(event) => onAccountChange(event.target.value)}>
              <option value="">Choose account</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name} ({account.currency})
                </option>
              ))}
            </Select>

            <Select
              label="Assumed currency"
              value={selectedCurrency}
              onChange={(event) => onCurrencyChange(event.target.value as Currency)}
              options={CURRENCY_OPTIONS}
            />

            <Input
              label="Workbook (.xlsx)"
              type="file"
              accept=".xlsx"
              onChange={(event) => onFileChange(event.target.files?.[0] ?? null)}
            />

            {selectedFileName ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">Selected file: {selectedFileName}</p>
            ) : null}

            {previewError ? <p className="text-sm text-red-600 dark:text-red-400">{previewError}</p> : null}

            <Button onClick={onSubmitPreview} isLoading={isPreviewPending} disabled={!selectedAccountId || !selectedFileName}>
              Preview workbook
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {currentStep === 'review' && preview ? (
        <div className="space-y-6">
          <ImportSummaryCards preview={preview} />

          <ImportCategoryMappingsSection
            preview={preview}
            mappings={mappings}
            categoryOptions={categoryOptions}
            onMappingChange={onMappingChange}
          />

          {pendingMappings.length > 0 ? (
            <Card>
              <CardContent>
                <p className="text-sm text-amber-700 dark:text-amber-300">{pendingMappingsLabel}</p>
              </CardContent>
            </Card>
          ) : null}

          <ImportRowsSection title="Importable rows" rows={preview.importable} />
          <ImportRowsSection title="Invalid rows" rows={preview.invalid} />
          <ImportRowsSection title="Excluded rows" rows={preview.excluded} />

          <div className="flex flex-wrap gap-3">
            <Button variant="secondary" onClick={onBackToUpload}>
              Back
            </Button>
            <Button onClick={onGoToConfirm} disabled={pendingMappings.length > 0}>
              Continue to confirm
            </Button>
          </div>
        </div>
      ) : null}

      {currentStep === 'confirm' && preview ? (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>3. Confirm import</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
              <p>Workbook: {selectedFileName ?? '—'}</p>
              <p>Approved rows: {preview.importable.length}</p>
              <p>Mappings selected: {Object.values(mappings).filter(Boolean).length}</p>
              <p>Invalid rows stay skipped. Excluded rows like `Ahorro` are never committed.</p>
              {commitError ? <p className="text-red-600 dark:text-red-400">{commitError}</p> : null}
            </CardContent>
          </Card>

          <div className="flex flex-wrap gap-3">
            <Button variant="secondary" onClick={onBackToReview}>
              Back to review
            </Button>
            <Button onClick={onSubmitCommit} isLoading={isCommitPending}>
              Commit import
            </Button>
          </div>
        </div>
      ) : null}

      {currentStep === 'result' && result ? (
        <div className="space-y-4">
          <ImportCommitResult result={result} />
          <Button onClick={onStartOver}>Import another workbook</Button>
        </div>
      ) : null}
    </div>
  );
};

export const ImportExcelTemplatePage = () => {
  const { accounts } = useAccounts();
  const { data: expenseCategoriesData } = useExpenseCategories();
  const { data: incomeCategoriesData } = useIncomeCategories();
  const previewMutation = useImportExcelTemplatePreview();
  const commitMutation = useImportExcelTemplateCommit();

  const [currentStep, setCurrentStep] = useState<ImportWizardStep>('upload');
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [selectedCurrency, setSelectedCurrency] = useState<Currency | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportExcelTemplatePreviewResponse | null>(null);
  const [result, setResult] = useState<ImportExcelTemplateCommitResponse | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [commitError, setCommitError] = useState<string | null>(null);
  const [mappings, setMappings] = useState<Record<string, string>>({});

  const selectedAccount = useMemo(() => {
    if (selectedAccountId) {
      return accounts.find((account) => account.id === selectedAccountId) ?? null;
    }

    return accounts[0] ?? null;
  }, [accounts, selectedAccountId]);

  const effectiveSelectedAccountId = selectedAccountId || selectedAccount?.id || '';
  const effectiveSelectedCurrency = selectedCurrency ?? selectedAccount?.currency ?? 'ARS';

  const categoryOptions = useMemo(() => {
    return {
      expense: (expenseCategoriesData?.expense_categories ?? []).map((category) => ({
        value: category.id,
        label: category.name,
      })),
      income: (incomeCategoriesData?.income_categories ?? []).map((category) => ({
        value: category.id,
        label: category.name,
      })),
    };
  }, [expenseCategoriesData?.expense_categories, incomeCategoriesData?.income_categories]);

  const pendingMappings = useMemo(() => getRequiredImportCategoryMappings(preview, mappings), [preview, mappings]);

  const handlePreview = async () => {
    if (!selectedFile) {
      setPreviewError('Choose an .xlsx workbook first.');
      return;
    }

    if (!selectedAccountId) {
      setPreviewError('Choose a target account.');
      return;
    }

    setPreviewError(null);
    setCommitError(null);

    try {
        const previewResponse = await previewMutation.mutateAsync({
        accountId: effectiveSelectedAccountId,
        currency: effectiveSelectedCurrency,
        file: selectedFile,
      });

      setPreview(previewResponse);
      setMappings(getInitialImportCategoryMappings(previewResponse));
      setResult(null);
      setCurrentStep('review');
    } catch (error) {
      setPreviewError(
        (error as { response?: { data?: { error?: string; details?: string } } })?.response?.data?.error ??
          'Preview request failed.',
      );
    }
  };

  const handleCommit = async () => {
    if (!selectedFile || !preview) {
      setCommitError('Preview the workbook before commit.');
      return;
    }

    if (pendingMappings.length > 0) {
      setCommitError('Complete all required mappings before commit.');
      return;
    }

    setCommitError(null);

    try {
        const commitResponse = await commitMutation.mutateAsync({
        accountId: effectiveSelectedAccountId,
        currency: effectiveSelectedCurrency,
        file: selectedFile,
        decisions: buildImportExcelTemplateCommitDecisions(preview, mappings),
      });

      setResult(commitResponse);
      setCurrentStep('result');
    } catch (error) {
      setCommitError(
        (error as { response?: { data?: { error?: string; details?: string } } })?.response?.data?.error ??
          'Commit request failed.',
      );
    }
  };

  const handleStartOver = () => {
    setCurrentStep('upload');
    setSelectedAccountId('');
    setSelectedCurrency(null);
    setSelectedFile(null);
    setPreview(null);
    setResult(null);
    setPreviewError(null);
    setCommitError(null);
    setMappings({});
  };

  return (
    <ImportExcelTemplateWizardView
      currentStep={currentStep}
      accounts={accounts}
      selectedAccountId={effectiveSelectedAccountId}
      selectedCurrency={effectiveSelectedCurrency}
      selectedFileName={selectedFile?.name ?? null}
      preview={preview}
      result={result}
      mappings={mappings}
      pendingMappings={pendingMappings}
      categoryOptions={categoryOptions}
      previewError={previewError}
      commitError={commitError}
      isPreviewPending={previewMutation.isPending}
      isCommitPending={commitMutation.isPending}
      onAccountChange={(accountId) => {
        setSelectedAccountId(accountId);
        const selectedAccount = accounts.find((account) => account.id === accountId);
        setSelectedCurrency(selectedAccount?.currency ?? null);
      }}
      onCurrencyChange={setSelectedCurrency}
      onFileChange={setSelectedFile}
      onMappingChange={(key, categoryId) => {
        setMappings((currentMappings) => ({
          ...currentMappings,
          [key]: categoryId,
        }));
      }}
      onSubmitPreview={handlePreview}
      onBackToUpload={() => setCurrentStep('upload')}
      onGoToConfirm={() => setCurrentStep('confirm')}
      onBackToReview={() => setCurrentStep('review')}
      onSubmitCommit={handleCommit}
      onStartOver={handleStartOver}
    />
  );
};

export type { ImportExcelTemplatePreviewResponse } from '@/types/importExcelTemplate';
