import type { MoneyByContainer } from '@/types/dashboard';

export interface DashboardMoneyByContainerItem {
  key: string;
  label: string;
  total: number;
  percentage: number;
  isUnassigned: boolean;
}

export const getDashboardMoneyByContainerItems = (
  moneyByContainer: MoneyByContainer[] | undefined,
  unassignedLabel: string,
): DashboardMoneyByContainerItem[] => {
  if (!moneyByContainer) return [];

  return moneyByContainer
    .filter((item) => item.total > 0)
    .map((item) => ({
      key: item.container_id ?? 'unassigned',
      label: item.is_unassigned ? unassignedLabel : item.name,
      total: item.total,
      percentage: item.percentage,
      isUnassigned: item.is_unassigned,
    }));
};
