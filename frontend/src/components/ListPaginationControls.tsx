import { Button } from '@/components/ui/Button';
import type { ListPaginationState } from '@/lib/listPagination';

interface ListPaginationControlsProps {
  pagination: ListPaginationState;
  labels: {
    showing: string;
    page: string;
    previous: string;
    next: string;
    localFilterNotice?: string;
  };
  showLocalFilterNotice?: boolean;
  onPrevious: () => void;
  onNext: () => void;
}

export const ListPaginationControls = ({
  pagination,
  labels,
  showLocalFilterNotice = false,
  onPrevious,
  onNext,
}: ListPaginationControlsProps) => {
  if (pagination.total_count === 0) return null;

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-800 sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
        <p>{labels.showing}</p>
        {showLocalFilterNotice && labels.localFilterNotice ? (
          <p className="text-xs text-amber-700 dark:text-amber-300">{labels.localFilterNotice}</p>
        ) : null}
      </div>
      <div className="flex items-center justify-between gap-3 sm:justify-end">
        <Button variant="secondary" size="sm" onClick={onPrevious} disabled={!pagination.hasPrevious}>
          {labels.previous}
        </Button>
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{labels.page}</span>
        <Button variant="secondary" size="sm" onClick={onNext} disabled={!pagination.hasNext}>
          {labels.next}
        </Button>
      </div>
    </div>
  );
};
