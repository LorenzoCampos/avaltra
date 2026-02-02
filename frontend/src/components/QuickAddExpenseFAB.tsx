import { useState } from 'react';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { QuickAddExpenseModal } from './QuickAddExpenseModal';
import { useExpenses } from '@/hooks/useExpenses';
import type { Currency } from '@/schemas/account.schema';

export const QuickAddExpenseFAB = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { createExpense, isCreatingExpense } = useExpenses();

  const handleSubmit = (data: {
    amount: number;
    description: string;
    currency: Currency;
    date: string;
    category_id?: string | null;
    family_member_id?: string | null;
  }) => {
    createExpense(data, {
      onSuccess: () => {
        toast.success('Expense added successfully!');
        setIsModalOpen(false);
      },
      onError: (error: any) => {
        const message = error?.response?.data?.error || 'Failed to add expense';
        toast.error(message);
      },
    });
  };

  return (
    <>
      {/* FAB - Solo visible en mobile, arriba del bottom nav */}
      <button
        onClick={() => setIsModalOpen(true)}
        className="md:hidden fixed bottom-20 right-6 z-30 w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center active:scale-95"
        aria-label="Quick add expense"
      >
        <Plus className="w-6 h-6" />
      </button>

      {/* Modal */}
      <QuickAddExpenseModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleSubmit}
        isSubmitting={isCreatingExpense}
      />
    </>
  );
};
