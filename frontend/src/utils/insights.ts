type ExpenseCategoryInsight = {
  category_name: string;
  total: number;
  percentage: number;
};

type SavingsGoalInsight = {
  name: string;
  current_amount: number;
  target_amount: number;
  progress_percentage: number;
};

export function getPreviousMonth(currentMonth: string): string {
  const [year, month] = currentMonth.split('-').map(Number);

  if (!year || !month) {
    throw new Error('Invalid month format. Expected YYYY-MM');
  }

  const date = new Date(year, month - 2, 1);
  const previousYear = date.getFullYear();
  const previousMonth = String(date.getMonth() + 1).padStart(2, '0');

  return `${previousYear}-${previousMonth}`;
}

export function calculateMonthOverMonth(current: number, previous: number): {
  percentChange: number;
  trend: 'up' | 'down' | 'flat';
  difference: number;
} {
  const difference = current - previous;

  if (difference === 0) {
    return {
      percentChange: 0,
      trend: 'flat',
      difference: 0,
    };
  }

  if (previous === 0) {
    return {
      percentChange: current === 0 ? 0 : 100,
      trend: difference > 0 ? 'up' : 'down',
      difference,
    };
  }

  return {
    percentChange: Math.round(Math.abs((difference / previous) * 100)),
    trend: difference > 0 ? 'up' : 'down',
    difference,
  };
}

export function getTopSpendingCategory(
  expensesByCategory: ExpenseCategoryInsight[]
): {
  name: string;
  total: number;
  percentage: number;
} | null {
  if (!expensesByCategory.length) return null;

  const topCategory = expensesByCategory.reduce((top, current) =>
    current.total > top.total ? current : top
  );

  return {
    name: topCategory.category_name,
    total: topCategory.total,
    percentage: topCategory.percentage,
  };
}

export function getBestSavingsInsight(
  goals: SavingsGoalInsight[]
): {
  goalName: string;
  current: number;
  target: number;
  progress: number;
  remaining: number;
  message: string;
} | null {
  if (!goals.length) return null;

  const bestGoal = goals.reduce((best, current) => {
    if (current.progress_percentage !== best.progress_percentage) {
      return current.progress_percentage > best.progress_percentage ? current : best;
    }

    return current.current_amount > best.current_amount ? current : best;
  });

  const progress = Math.min(Math.round(bestGoal.progress_percentage), 100);
  const remaining = Math.max(bestGoal.target_amount - bestGoal.current_amount, 0);

  let message = `${remaining} away from goal`;
  if (progress >= 100) {
    message = 'Completed!';
  } else if (progress > 80) {
    message = 'Almost there!';
  }

  return {
    goalName: bestGoal.name,
    current: bestGoal.current_amount,
    target: bestGoal.target_amount,
    progress,
    remaining,
    message,
  };
}
