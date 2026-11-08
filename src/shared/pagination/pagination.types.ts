export interface PageMeta {
  page: number;
  pageSize: number;
  pageCount: number;
  total: number;
}

export interface Page<T> {
  items: T[];
  meta: PageMeta;
}

export interface ListParams {
  page: number;
  pageSize: number;
  search?: string;
}
