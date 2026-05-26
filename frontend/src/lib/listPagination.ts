export interface ListPaginationMeta {
  total_count: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface ListPaginationState extends ListPaginationMeta {
  from: number;
  to: number;
  hasPrevious: boolean;
  hasNext: boolean;
}

export const getListPaginationState = (meta: ListPaginationMeta): ListPaginationState => {
  const total_count = Math.max(0, meta.total_count);
  const limit = Math.max(1, meta.limit);
  const total_pages = Math.max(0, meta.total_pages);
  const page = Math.max(1, meta.page);
  const from = total_count === 0 ? 0 : (page - 1) * limit + 1;

  return {
    total_count,
    page,
    limit,
    total_pages,
    from,
    to: Math.min(page * limit, total_count),
    hasPrevious: page > 1,
    hasNext: total_pages > 0 && page < total_pages,
  };
};
