interface ProgressBarProps {
  current: number;
  target: number;
  percentage: number;
  showLabels?: boolean;
  currency?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const ProgressBar = ({
  current,
  target,
  percentage,
  showLabels = true,
  currency = 'ARS',
  size = 'md',
}: ProgressBarProps) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const clampedPercentage = Math.min(Math.max(percentage, 0), 100);
  const isComplete = clampedPercentage >= 100;

  // Determine bar height based on size
  const heightClass = {
    sm: 'h-2',
    md: 'h-3',
    lg: 'h-4',
  }[size];

  // Determine bar color based on progress
  const getBarColor = () => {
    if (isComplete) return 'bg-green-500 dark:bg-green-400';
    if (clampedPercentage >= 75) return 'bg-blue-500 dark:bg-blue-400';
    if (clampedPercentage >= 50) return 'bg-yellow-500 dark:bg-yellow-400';
    if (clampedPercentage >= 25) return 'bg-orange-500 dark:bg-orange-400';
    return 'bg-red-500 dark:bg-red-400';
  };

  return (
    <div className="w-full">
      {/* Labels */}
      {showLabels && (
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            {formatCurrency(current)}
          </span>
          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
            {clampedPercentage.toFixed(1)}%
          </span>
          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            {formatCurrency(target)}
          </span>
        </div>
      )}

      {/* Progress Bar */}
      <div className={`w-full bg-gray-200 dark:bg-gray-700 rounded-full ${heightClass} overflow-hidden`}>
        <div
          className={`${heightClass} ${getBarColor()} rounded-full transition-all duration-500 ease-out`}
          style={{ width: `${clampedPercentage}%` }}
        />
      </div>

      {/* Complete Badge */}
      {isComplete && (
        <div className="mt-2 flex items-center justify-center gap-2">
          <span className="text-xs font-semibold text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-3 py-1 rounded-full">
            🎉 Goal Completed!
          </span>
        </div>
      )}
    </div>
  );
};
