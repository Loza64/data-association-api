import { Page, PageMeta } from './pagination.types';

export interface PaginatedResult<T> {
  data: T[];
  pagination: PageMeta;
}

export const buildPaginatedResponse = <T, R>(
  { items, meta }: Page<T>,
  mapper: (item: T) => R,
): PaginatedResult<R> => ({
  data: items.map(mapper),
  pagination: meta,
});
