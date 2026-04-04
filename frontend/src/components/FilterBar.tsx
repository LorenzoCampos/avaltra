import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, Filter, X, ChevronDown, ChevronUp } from 'lucide-react';

import type { FilterState } from '@/hooks/useFilters';

interface FilterBarProps {
  filters: FilterState;
  activeFiltersCount: number;
  onSearchChange: (text: string) => void;
  onDateRangeChange: (from: string, to: string) => void;
  onAmountRangeChange: (min: number | null, max: number | null) => void;
  onCategoryIdsChange: (ids: string[]) => void;
  onFamilyMemberIdsChange: (ids: string[]) => void;
  onClearFilters: () => void;
  categories?: Array<{ id: string; name: string }>;
  familyMembers?: Array<{ id: string; name: string }>;
  showFamilyMemberFilter?: boolean;
}

export const FilterBar = ({
  filters,
  activeFiltersCount,
  onSearchChange,
  onDateRangeChange,
  onAmountRangeChange,
  onCategoryIdsChange,
  onFamilyMemberIdsChange,
  onClearFilters,
  categories = [],
  familyMembers = [],
  showFamilyMemberFilter = false,
}: FilterBarProps) => {
  const { t } = useTranslation('common');
  const [isExpanded, setIsExpanded] = useState(false);

  const handleCategoryToggle = (categoryId: string) => {
    const newIds = filters.categoryIds.includes(categoryId)
      ? filters.categoryIds.filter(id => id !== categoryId)
      : [...filters.categoryIds, categoryId];
    onCategoryIdsChange(newIds);
  };

  const handleFamilyMemberToggle = (memberId: string) => {
    const newIds = filters.familyMemberIds.includes(memberId)
      ? filters.familyMemberIds.filter(id => id !== memberId)
      : [...filters.familyMemberIds, memberId];
    onFamilyMemberIdsChange(newIds);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-4">
      {/* Search Bar + Toggle Filters Button */}
      <div className="flex gap-3">
        {/* Search Input */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder={t('filters.searchPlaceholder')}
            value={filters.searchText}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-colors"
          />
        </div>

        {/* Toggle Advanced Filters Button */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-md transition-colors font-medium"
        >
          <Filter className="w-5 h-5" />
          <span className="hidden sm:inline">{t('filters.filtersButton')}</span>
          {activeFiltersCount > 0 && (
            <span className="bg-blue-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
              {activeFiltersCount}
            </span>
          )}
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {/* Clear Filters Button */}
        {activeFiltersCount > 0 && (
          <button
            onClick={onClearFilters}
            className="px-4 py-2 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 rounded-md transition-colors font-medium flex items-center gap-2"
            title={t('filters.clearAllTitle')}
          >
            <X className="w-5 h-5" />
            <span className="hidden sm:inline">{t('filters.clearAll')}</span>
          </button>
        )}
      </div>

      {/* Advanced Filters (Collapsible) */}
      {isExpanded && (
        <div className="pt-4 border-t border-gray-200 dark:border-gray-700 space-y-4 animate-scale-in">
          {/* Date Range */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('filters.fromDate')}
              </label>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => onDateRangeChange(e.target.value, filters.dateTo)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('filters.toDate')}
              </label>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => onDateRangeChange(filters.dateFrom, e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
              />
            </div>
          </div>

          {/* Amount Range */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('filters.minAmount')}
              </label>
              <input
                type="number"
                step="0.01"
                placeholder={t('filters.minAmountPlaceholder')}
                value={filters.amountMin ?? ''}
                onChange={(e) => onAmountRangeChange(
                  e.target.value ? parseFloat(e.target.value) : null,
                  filters.amountMax
                )}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('filters.maxAmount')}
              </label>
              <input
                type="number"
                step="0.01"
                placeholder={t('filters.maxAmountPlaceholder')}
                value={filters.amountMax ?? ''}
                onChange={(e) => onAmountRangeChange(
                  filters.amountMin,
                  e.target.value ? parseFloat(e.target.value) : null
                )}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
              />
            </div>
          </div>

          {/* Categories (Multi-select) */}
          {categories.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('filters.categories')}
              </label>
              <div className="flex flex-wrap gap-2">
                {categories.map((category) => {
                  const isSelected = filters.categoryIds.includes(category.id);
                  return (
                    <button
                      key={category.id}
                      onClick={() => handleCategoryToggle(category.id)}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                        isSelected
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      {category.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Family Members (Multi-select) */}
          {showFamilyMemberFilter && familyMembers.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('filters.familyMembers')}
              </label>
              <div className="flex flex-wrap gap-2">
                {familyMembers.map((member) => {
                  const isSelected = filters.familyMemberIds.includes(member.id);
                  return (
                    <button
                      key={member.id}
                      onClick={() => handleFamilyMemberToggle(member.id)}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                        isSelected
                          ? 'bg-green-600 text-white'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      {member.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Active Filters Summary */}
          {activeFiltersCount > 0 && (
            <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t('filters.activeFilters', { count: activeFiltersCount })}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
