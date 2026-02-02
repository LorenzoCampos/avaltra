import { useState, useMemo } from 'react';

export interface FilterState {
  searchText: string;
  dateFrom: string;
  dateTo: string;
  amountMin: number | null;
  amountMax: number | null;
  categoryIds: string[];
  familyMemberIds: string[];
}

interface FilterableItem {
  description: string;
  date: string;
  amount: number;
  amount_in_primary_currency?: number | null; // Para gastos/ingresos multi-currency
  category_id?: string | null;
  family_member_id?: string | null;
}

export const useFilters = <T extends FilterableItem>(data: T[]) => {
  const [filters, setFilters] = useState<FilterState>({
    searchText: '',
    dateFrom: '',
    dateTo: '',
    amountMin: null,
    amountMax: null,
    categoryIds: [],
    familyMemberIds: [],
  });

  // Contar filtros activos (para mostrar badge)
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.searchText) count++;
    if (filters.dateFrom || filters.dateTo) count++;
    if (filters.amountMin !== null || filters.amountMax !== null) count++;
    if (filters.categoryIds.length > 0) count++;
    if (filters.familyMemberIds.length > 0) count++;
    return count;
  }, [filters]);

  // Filtrado de datos
  const filteredData = useMemo(() => {
    return data.filter((item) => {
      // 1. Search text (descripción)
      if (filters.searchText) {
        const searchLower = filters.searchText.toLowerCase();
        if (!item.description.toLowerCase().includes(searchLower)) {
          return false;
        }
      }

      // 2. Date range
      if (filters.dateFrom && item.date < filters.dateFrom) {
        return false;
      }
      if (filters.dateTo && item.date > filters.dateTo) {
        return false;
      }

      // 3. Amount range (usar amount_in_primary_currency si existe - multi-currency)
      // Esto asegura que un gasto de USD 20 = ARS 31,000 se filtre correctamente
      const amountToCompare = item.amount_in_primary_currency ?? item.amount;
      
      if (filters.amountMin !== null && amountToCompare < filters.amountMin) {
        return false;
      }
      if (filters.amountMax !== null && amountToCompare > filters.amountMax) {
        return false;
      }

      // 4. Categories (multi-select)
      if (filters.categoryIds.length > 0) {
        if (!item.category_id || !filters.categoryIds.includes(item.category_id)) {
          return false;
        }
      }

      // 5. Family members (multi-select)
      if (filters.familyMemberIds.length > 0) {
        if (!item.family_member_id || !filters.familyMemberIds.includes(item.family_member_id)) {
          return false;
        }
      }

      return true;
    });
  }, [data, filters]);

  // Helper functions para actualizar filtros
  const setSearchText = (text: string) => {
    setFilters((prev) => ({ ...prev, searchText: text }));
  };

  const setDateRange = (from: string, to: string) => {
    setFilters((prev) => ({ ...prev, dateFrom: from, dateTo: to }));
  };

  const setAmountRange = (min: number | null, max: number | null) => {
    setFilters((prev) => ({ ...prev, amountMin: min, amountMax: max }));
  };

  const setCategoryIds = (ids: string[]) => {
    setFilters((prev) => ({ ...prev, categoryIds: ids }));
  };

  const setFamilyMemberIds = (ids: string[]) => {
    setFilters((prev) => ({ ...prev, familyMemberIds: ids }));
  };

  const clearFilters = () => {
    setFilters({
      searchText: '',
      dateFrom: '',
      dateTo: '',
      amountMin: null,
      amountMax: null,
      categoryIds: [],
      familyMemberIds: [],
    });
  };

  return {
    filters,
    filteredData,
    activeFiltersCount,
    setSearchText,
    setDateRange,
    setAmountRange,
    setCategoryIds,
    setFamilyMemberIds,
    clearFilters,
  };
};
