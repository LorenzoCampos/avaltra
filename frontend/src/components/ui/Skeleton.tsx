/**
 * Skeleton Components
 * 
 * Professional loading skeletons that show the shape of content while loading.
 * Uses TailwindCSS animate-pulse for shimmer effect.
 */

interface SkeletonProps {
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Base Skeleton component
 * Use this for simple rectangular placeholders
 */
export const Skeleton = ({ className = '', style }: SkeletonProps) => {
  return (
    <div
      className={`animate-pulse bg-gray-200 dark:bg-gray-700 rounded ${className}`}
      style={style}
      aria-hidden="true"
    />
  );
};

/**
 * Card Skeleton
 * For account/expense card loading states
 */
export const CardSkeleton = () => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700">
      {/* Title */}
      <Skeleton className="h-6 w-3/4 mb-3" />
      
      {/* Subtitle/Amount */}
      <Skeleton className="h-4 w-1/2 mb-4" />
      
      {/* Details row */}
      <div className="flex gap-4 mb-4">
        <Skeleton className="h-4 w-1/4" />
        <Skeleton className="h-4 w-1/4" />
      </div>
      
      {/* Action buttons */}
      <div className="flex gap-2 justify-end">
        <Skeleton className="h-9 w-20" />
        <Skeleton className="h-9 w-20" />
      </div>
    </div>
  );
};

/**
 * Table Skeleton
 * For expense list table loading states
 */
export const TableSkeleton = ({ rows = 5 }: { rows?: number }) => {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full bg-white dark:bg-gray-800 shadow-md rounded-lg overflow-hidden">
        <thead className="bg-gray-50 dark:bg-gray-700">
          <tr>
            {/* Table headers */}
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <th key={i} className="px-6 py-3">
                <Skeleton className="h-4 w-full" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <tr key={rowIndex} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
              {/* Date */}
              <td className="px-6 py-4">
                <Skeleton className="h-4 w-20" />
              </td>
              {/* Description */}
              <td className="px-6 py-4">
                <Skeleton className="h-4 w-32" />
              </td>
              {/* Category */}
              <td className="px-6 py-4">
                <Skeleton className="h-6 w-24 rounded-full" />
              </td>
              {/* Amount */}
              <td className="px-6 py-4">
                <Skeleton className="h-4 w-16" />
              </td>
              {/* Currency */}
              <td className="px-6 py-4">
                <Skeleton className="h-4 w-12" />
              </td>
              {/* Actions */}
              <td className="px-6 py-4">
                <div className="flex gap-2">
                  <Skeleton className="h-8 w-8 rounded" />
                  <Skeleton className="h-8 w-8 rounded" />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

/**
 * Dashboard Card Skeleton
 * For dashboard summary cards
 */
export const DashboardCardSkeleton = () => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700">
      {/* Icon + Title */}
      <div className="flex items-center gap-3 mb-4">
        <Skeleton className="h-10 w-10 rounded-full" />
        <Skeleton className="h-5 w-32" />
      </div>
      
      {/* Large amount */}
      <Skeleton className="h-8 w-3/4 mb-2" />
      
      {/* Subtitle */}
      <Skeleton className="h-4 w-1/2" />
    </div>
  );
};

/**
 * Chart Skeleton
 * For dashboard charts (expenses by category, top expenses)
 */
export const ChartSkeleton = () => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700">
      {/* Title */}
      <Skeleton className="h-6 w-1/3 mb-6" />
      
      {/* Chart bars/items */}
      <div className="space-y-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center gap-4">
            {/* Label */}
            <Skeleton className="h-4 w-24" />
            {/* Bar */}
            <Skeleton className={`h-8 flex-1`} style={{ maxWidth: `${100 - i * 15}%` }} />
            {/* Value */}
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * Form Skeleton
 * For form loading states (edit mode)
 */
export const FormSkeleton = ({ fields = 6 }: { fields?: number }) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700">
      {/* Form title */}
      <Skeleton className="h-7 w-1/3 mb-6" />
      
      {/* Form fields */}
      <div className="space-y-4">
        {Array.from({ length: fields }).map((_, i) => (
          <div key={i}>
            <Skeleton className="h-4 w-24 mb-2" />
            <Skeleton className="h-10 w-full" />
          </div>
        ))}
      </div>
      
      {/* Action buttons */}
      <div className="flex gap-3 justify-end mt-6">
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-10 w-24" />
      </div>
    </div>
  );
};

/**
 * List Skeleton
 * For transaction lists in dashboard
 */
export const ListSkeleton = ({ items = 5 }: { items?: number }) => {
  return (
    <div className="space-y-3">
      {Array.from({ length: items }).map((_, i) => (
        <div
          key={i}
          className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700"
        >
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <Skeleton className="h-5 w-3/4 mb-2" />
              <Skeleton className="h-4 w-1/2" />
            </div>
            <Skeleton className="h-6 w-20" />
          </div>
        </div>
      ))}
    </div>
  );
};
