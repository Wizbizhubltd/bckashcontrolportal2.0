export interface PagedResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalCount: number;
}

/** A record a bulk action left alone, and why. */
export interface BulkActionSkip {
  id: number;
  name: string;
  reason: string;
}

/** What a bulk action did: how many records it changed, and each one it skipped. */
export interface BulkActionResult {
  succeeded: number;
  skipped: BulkActionSkip[];
}
