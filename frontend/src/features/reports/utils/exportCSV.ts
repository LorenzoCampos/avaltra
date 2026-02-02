import type { ReportData } from '@/types/report';

/**
 * Export expenses by category to CSV
 */
export const exportExpensesCategoryCSV = (
  data: ReportData,
  currency: string
): void => {
  if (!data.expensesByCategory || data.expensesByCategory.length === 0) {
    alert('No expense data to export');
    return;
  }

  const headers = ['Category', 'Amount', 'Percentage'];
  const rows = data.expensesByCategory.map((item) => [
    item.categoryName,
    item.total.toFixed(2),
    item.percentage.toFixed(2) + '%',
  ]);

  downloadCSV(headers, rows, `expenses-by-category-${Date.now()}.csv`);
};

/**
 * Export monthly comparison to CSV
 */
export const exportMonthlyComparisonCSV = (
  data: ReportData,
  currency: string
): void => {
  if (!data.monthlyComparison || data.monthlyComparison.length === 0) {
    alert('No monthly data to export');
    return;
  }

  const headers = ['Month', 'Income', 'Expenses', 'Balance'];
  const rows = data.monthlyComparison.map((item) => [
    item.monthLabel,
    item.income.toFixed(2),
    item.expenses.toFixed(2),
    item.balance.toFixed(2),
  ]);

  downloadCSV(headers, rows, `monthly-comparison-${Date.now()}.csv`);
};

/**
 * Export balance evolution to CSV
 */
export const exportBalanceEvolutionCSV = (
  data: ReportData,
  currency: string
): void => {
  if (!data.balanceEvolution || data.balanceEvolution.length === 0) {
    alert('No balance data to export');
    return;
  }

  const headers = ['Date', 'Balance'];
  const rows = data.balanceEvolution.map((item) => [
    item.date,
    item.balance.toFixed(2),
  ]);

  downloadCSV(headers, rows, `balance-evolution-${Date.now()}.csv`);
};

/**
 * Export complete report summary to CSV
 */
export const exportFullReportCSV = (
  data: ReportData,
  currency: string
): void => {
  const lines: string[] = [];

  // Header
  lines.push(`Financial Report - ${data.metrics.period}`);
  lines.push(`Currency: ${currency}`);
  lines.push('');

  // Summary Metrics
  lines.push('SUMMARY');
  lines.push(`Total Income,${data.metrics.totalIncome.toFixed(2)}`);
  lines.push(`Total Expenses,${data.metrics.totalExpenses.toFixed(2)}`);
  lines.push(`Net Balance,${data.metrics.balance.toFixed(2)}`);
  lines.push('');

  // Expenses by Category
  if (data.expensesByCategory.length > 0) {
    lines.push('EXPENSES BY CATEGORY');
    lines.push('Category,Amount,Percentage');
    data.expensesByCategory.forEach((item) => {
      lines.push(`${item.categoryName},${item.total.toFixed(2)},${item.percentage.toFixed(2)}%`);
    });
    lines.push('');
  }

  // Incomes by Category
  if (data.incomesByCategory.length > 0) {
    lines.push('INCOMES BY CATEGORY');
    lines.push('Category,Amount,Percentage');
    data.incomesByCategory.forEach((item) => {
      lines.push(`${item.categoryName},${item.total.toFixed(2)},${item.percentage.toFixed(2)}%`);
    });
    lines.push('');
  }

  // Monthly Comparison
  if (data.monthlyComparison.length > 0) {
    lines.push('MONTHLY COMPARISON');
    lines.push('Month,Income,Expenses,Balance');
    data.monthlyComparison.forEach((item) => {
      lines.push(
        `${item.monthLabel},${item.income.toFixed(2)},${item.expenses.toFixed(2)},${item.balance.toFixed(2)}`
      );
    });
    lines.push('');
  }

  // Balance Evolution
  if (data.balanceEvolution.length > 0) {
    lines.push('BALANCE EVOLUTION');
    lines.push('Date,Balance');
    data.balanceEvolution.forEach((item) => {
      lines.push(`${item.date},${item.balance.toFixed(2)}`);
    });
  }

  // Download
  const csvContent = lines.join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', `financial-report-${Date.now()}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Helper function to download CSV
 */
const downloadCSV = (
  headers: string[],
  rows: (string | number)[][],
  filename: string
): void => {
  const csvContent = [
    headers.join(','),
    ...rows.map((row) => row.join(',')),
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
