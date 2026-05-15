import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import Papa from 'papaparse';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { ActivityItem } from './useActivity';
import type { Currency } from '@/schemas/account.schema';
import { getPaymentMethodLabel } from '@/lib/paymentMethods';
import { BRAND } from '@/lib/brand';

interface ActivityExportLocaleOptions {
  t: TFunction;
  language: string;
}

const getActivityTypeLabel = (t: TFunction, type: ActivityItem['type']) => t(`activity:types.${type}`);

const getActivityCategoryLabel = (t: TFunction, transaction: ActivityItem) => {
  if (transaction.category_name) {
    return transaction.category_name;
  }

  if (transaction.goal_name) {
    return t('activity:export.goalLabel', { goal: transaction.goal_name });
  }

  return t('activity:export.noCategory');
};

const getActivityPaymentMethodLabel = (t: TFunction, paymentMethod: ActivityItem['payment_method']) => {
  if (!paymentMethod) {
    return '';
  }

  return getPaymentMethodLabel(((key: string, options?: Record<string, unknown>) => t(`expenses:${key}`, options)) as TFunction, paymentMethod);
};

const formatActivityExportAmount = (amount: number, currency: string, language: string) => {
  return new Intl.NumberFormat(language, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

export const buildActivityExportRows = (transactions: ActivityItem[], { t }: ActivityExportLocaleOptions) => {
  return transactions.map((transaction) => ({
    [t('activity:export.columns.date')]: transaction.date,
    [t('activity:export.columns.type')]: getActivityTypeLabel(t, transaction.type),
    [t('activity:export.columns.description')]: transaction.description,
    [t('activity:export.columns.category')]: getActivityCategoryLabel(t, transaction),
    [t('activity:export.columns.paymentMethod')]: getActivityPaymentMethodLabel(t, transaction.payment_method),
    [t('activity:export.columns.amount')]: transaction.amount,
    [t('activity:export.columns.currency')]: transaction.currency,
  }));
};

export const buildActivityPDFHead = (t: TFunction) => ([
  t('activity:export.columns.date'),
  t('activity:export.columns.type'),
  t('activity:export.columns.description'),
  t('activity:export.columns.category'),
  t('activity:export.columns.paymentMethod'),
  t('activity:export.columns.amount'),
]);

export const buildActivityPDFRows = (transactions: ActivityItem[], { t, language }: ActivityExportLocaleOptions) => {
  return transactions.map((transaction) => {
    return [
      transaction.date,
      getActivityTypeLabel(t, transaction.type),
      transaction.description,
      getActivityCategoryLabel(t, transaction),
      getActivityPaymentMethodLabel(t, transaction.payment_method) || '—',
      formatActivityExportAmount(transaction.amount, transaction.currency, language),
    ];
  });
};

export const buildActivityPDFBranding = () => ({
  title: BRAND.name,
  titleColor: [...BRAND.pdf.primaryRgb] as [number, number, number],
  tableHeadFillColor: [...BRAND.pdf.primaryRgb] as [number, number, number],
  alternateRowFillColor: [245, 247, 250] as [number, number, number],
});

interface ExportOptions {
  filename: string;
  accountName: string;
  currency: Currency;
  totalSaved?: number; // Total actual en savings goals
}

export const useExport = () => {
  const { t, i18n } = useTranslation(['activity', 'expenses']);
  
  // Export Activity transactions to CSV
  const exportActivityToCSV = useCallback((
    transactions: ActivityItem[],
    options: ExportOptions
  ) => {
    const data = buildActivityExportRows(transactions, { t, language: i18n.resolvedLanguage || i18n.language || 'es' });

    const csv = Papa.unparse(data);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `${options.filename}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [i18n.language, i18n.resolvedLanguage, t]);

  // Export Activity transactions to PDF
  const exportActivityToPDF = useCallback((
    transactions: ActivityItem[],
    options: ExportOptions
  ) => {
    const language = i18n.resolvedLanguage || i18n.language || 'es';
    const doc = new jsPDF();
    const pdfBranding = buildActivityPDFBranding();

    // Header
    doc.setFontSize(20);
    doc.setTextColor(...pdfBranding.titleColor);
    doc.text(pdfBranding.title, 14, 20);
    
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text(t('activity:export.pdf.title', { accountName: options.accountName }), 14, 30);
    
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(
      t('activity:export.pdf.generatedAt', {
        date: new Intl.DateTimeFormat(language).format(new Date()),
      }),
      14,
      36,
    );

    // Summary
    const totalExpenses = transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount_in_primary_currency, 0);
    
    const totalIncomes = transactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount_in_primary_currency, 0);

    const balance = totalIncomes - totalExpenses;

    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    
    // Main Balance
    doc.setFont('helvetica', 'bold');
    doc.text(t('activity:export.pdf.totalIncome', { amount: formatActivityExportAmount(totalIncomes, options.currency, language) }), 14, 45);
    doc.text(t('activity:export.pdf.totalExpenses', { amount: formatActivityExportAmount(totalExpenses, options.currency, language) }), 14, 51);
    doc.text(t('activity:export.pdf.netBalance', { amount: formatActivityExportAmount(balance, options.currency, language) }), 14, 57);
    
    // Savings balance (current total saved)
    if (options.totalSaved !== undefined && options.totalSaved > 0) {
      doc.setTextColor(34, 197, 94); // Green
      doc.text(t('activity:export.pdf.totalSaved', { amount: formatActivityExportAmount(options.totalSaved, options.currency, language) }), 14, 63);
      doc.setTextColor(0, 0, 0);
    }

    // Table
    const tableData = buildActivityPDFRows(transactions, { t, language });

    autoTable(doc, {
      head: [buildActivityPDFHead(t)],
      body: tableData,
      startY: options.totalSaved !== undefined && options.totalSaved > 0 ? 72 : 65,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: pdfBranding.tableHeadFillColor, textColor: 255 },
      alternateRowStyles: { fillColor: pdfBranding.alternateRowFillColor },
      columnStyles: {
        0: { cellWidth: 25 },
        1: { cellWidth: 22 },
        2: { cellWidth: 46 },
        3: { cellWidth: 34 },
        4: { cellWidth: 28 },
        5: { cellWidth: 28 },
      },
    });

    // Footer
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(
        t('activity:export.pdf.page', { current: i, total: pageCount }),
        doc.internal.pageSize.getWidth() / 2,
        doc.internal.pageSize.getHeight() - 10,
        { align: 'center' }
      );
    }

    doc.save(`${options.filename}.pdf`);
  }, [i18n.language, i18n.resolvedLanguage, t]);

  return {
    exportActivityToCSV,
    exportActivityToPDF,
  };
};
