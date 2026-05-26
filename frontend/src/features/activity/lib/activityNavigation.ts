import type { ActivityItem } from '@/hooks/useActivity';

type ActivityTransactionTarget = Pick<ActivityItem, 'id' | 'type'>;

export function getActivityTransactionRoute(activity: ActivityTransactionTarget): string | null {
  if (!activity.id) return null;

  if (activity.type === 'expense') {
    return `/expenses/edit/${activity.id}`;
  }

  if (activity.type === 'income') {
    return `/incomes/edit/${activity.id}`;
  }

  return null;
}

export function shouldHandleActivityNavigationKey(key: string): boolean {
  return key === 'Enter' || key === ' ';
}
