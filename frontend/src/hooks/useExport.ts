import { useCallback } from 'react';
import Papa from 'papaparse';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { ActivityItem } from './useActivity';
import type { Currency } from '@/schemas/account.schema';

interface ExportOptions {
  filename: string;
  accountName: string;
  currency: Currency;
  totalSaved?: number; // Total actual en savings goals
}

export const useExport = () => {
  
  // Export Activity transactions to CSV
  const exportActivityToCSV = useCallback((
    transactions: ActivityItem[],
    options: ExportOptions
  ) => {
    const data = transactions.map(t => ({
      Date: t.date,
      Type: t.type === 'expense' ? 'Expense' : t.type === 'income' ? 'Income' : t.type === 'savings_deposit' ? 'Savings Deposit' : 'Savings Withdrawal',
      Description: t.description,
      Category: t.category_name || (t.goal_name ? `Goal: ${t.goal_name}` : 'No Category'),
      Amount: t.amount,
      Currency: t.currency,
    }));

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
  }, []);

  // Export Activity transactions to PDF
  const exportActivityToPDF = useCallback((
    transactions: ActivityItem[],
    options: ExportOptions
  ) => {
    const doc = new jsPDF();

    // Header
    doc.setFontSize(20);
    doc.setTextColor(59, 130, 246); // Blue
    doc.text('Avaltra', 14, 20);
    
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text(`Activity Report - ${options.accountName}`, 14, 30);
    
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 36);

    // Summary
    const totalExpenses = transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const totalIncomes = transactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);

    const balance = totalIncomes - totalExpenses;

    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    
    // Main Balance
    doc.setFont('helvetica', 'bold');
    doc.text(`Total Incomes: ${options.currency} ${totalIncomes.toFixed(2)}`, 14, 45);
    doc.text(`Total Expenses: ${options.currency} ${totalExpenses.toFixed(2)}`, 14, 51);
    doc.text(`Net Balance: ${options.currency} ${balance.toFixed(2)}`, 14, 57);
    
    // Savings balance (current total saved)
    if (options.totalSaved !== undefined && options.totalSaved > 0) {
      doc.setTextColor(34, 197, 94); // Green
      doc.text(`Total Saved in Goals: ${options.currency} ${options.totalSaved.toFixed(2)}`, 14, 63);
      doc.setTextColor(0, 0, 0);
    }

    // Table
    const tableData = transactions.map(t => {
      let typeLabel = '';
      switch (t.type) {
        case 'expense': typeLabel = 'Expense'; break;
        case 'income': typeLabel = 'Income'; break;
        case 'savings_deposit': typeLabel = 'Save +'; break;
        case 'savings_withdrawal': typeLabel = 'Save -'; break;
      }

      return [
        t.date,
        typeLabel,
        t.description,
        t.category_name || (t.goal_name ? `Goal: ${t.goal_name}` : '-'),
        `${t.currency} ${t.amount.toFixed(2)}`,
      ];
    });

    autoTable(doc, {
      head: [['Date', 'Type', 'Description', 'Category/Goal', 'Amount']],
      body: tableData,
      startY: options.totalSaved !== undefined && options.totalSaved > 0 ? 72 : 65,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [59, 130, 246], textColor: 255 },
      alternateRowStyles: { fillColor: [245, 247, 250] },
      columnStyles: {
        0: { cellWidth: 25 },
        1: { cellWidth: 22 },
        2: { cellWidth: 60 },
        3: { cellWidth: 45 },
        4: { cellWidth: 28 },
      },
    });

    // Footer
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(
        `Page ${i} of ${pageCount}`,
        doc.internal.pageSize.getWidth() / 2,
        doc.internal.pageSize.getHeight() - 10,
        { align: 'center' }
      );
    }

    doc.save(`${options.filename}.pdf`);
  }, []);

  return {
    exportActivityToCSV,
    exportActivityToPDF,
  };
};
