import { type ReactNode } from 'react';
import { Button } from './Button';

interface EmptyStateProps {
  /** Large emoji or icon to display */
  icon: ReactNode;
  /** Main title */
  title: string;
  /** Description text */
  description: string;
  /** Optional action button */
  action?: {
    label: string;
    onClick: () => void;
  };
  /** Optional secondary action (link style) */
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  /** Optional className for customization */
  className?: string;
}

/**
 * EmptyState - Friendly empty state component with icon, message and CTA
 * 
 * Usage:
 * ```tsx
 * <EmptyState
 *   icon="📝"
 *   title="No expenses yet"
 *   description="Start tracking your spending by adding your first expense"
 *   action={{ label: "+ Add Expense", onClick: () => navigate('/expenses/new') }}
 * />
 * ```
 */
export const EmptyState = ({
  icon,
  title,
  description,
  action,
  secondaryAction,
  className = '',
}: EmptyStateProps) => {
  return (
    <div className={`flex flex-col items-center justify-center py-12 px-4 text-center ${className}`}>
      {/* Icon */}
      <div className="text-6xl mb-4 select-none" aria-hidden="true">
        {icon}
      </div>
      
      {/* Title */}
      <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
        {title}
      </h3>
      
      {/* Description */}
      <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md">
        {description}
      </p>
      
      {/* Actions */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        {action && (
          <Button onClick={action.onClick}>
            {action.label}
          </Button>
        )}
        
        {secondaryAction && (
          <button
            onClick={secondaryAction.onClick}
            className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm font-medium transition-colors"
          >
            {secondaryAction.label}
          </button>
        )}
      </div>
    </div>
  );
};

/**
 * SearchEmptyState - Specific empty state for search/filter results
 */
interface SearchEmptyStateProps {
  searchQuery?: string;
  onClearFilters: () => void;
  className?: string;
}

export const SearchEmptyState = ({
  searchQuery,
  onClearFilters,
  className = '',
}: SearchEmptyStateProps) => {
  return (
    <EmptyState
      icon="🔍"
      title={searchQuery ? `No results for "${searchQuery}"` : 'No results found'}
      description="Try adjusting your search or filters to find what you're looking for"
      action={{
        label: 'Clear Filters',
        onClick: onClearFilters,
      }}
      className={className}
    />
  );
};
