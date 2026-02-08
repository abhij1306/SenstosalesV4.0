/**
 * useListData Hook
 * 
 * Consolidates common patterns for paginated list data fetching:
 * - isFirstLoad ref pattern
 * - queryParams memoization
 * - useEffect for data fetching with AbortController
 * - Loading/error state management
 * 
 * Usage:
 * const {
 *   data,
 *   setData,
 *   loading,
 *   error,
 *   queryParams,
 *   isFirstLoad,
 *   fetchData,
 *   refresh
 * } = useListData({
 *   initialData,
 *   fetchFn: (params, signal) => api.listDCs(params, { signal }),
 * });
 */

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useTableState } from './useTableState';

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages?: number;
}

export interface UseListDataOptions<T> {
  /** Initial data from server */
  initialData: PaginatedResponse<T> | null;
  /** Fetch function that returns a Promise */
  fetchFn: (params: Record<string, any>, signal?: AbortSignal) => Promise<PaginatedResponse<T>>;
  /** Custom table state options */
  tableOptions?: {
    defaultLimit?: number;
    defaultSortBy?: string;
    defaultSortOrder?: 'asc' | 'desc';
  };
  /** Callback when data changes */
  onDataChange?: (data: PaginatedResponse<T>) => void;
  /** Error message prefix for display */
  errorPrefix?: string;
}

export interface UseListDataReturn<T> {
  /** The current data */
  data: PaginatedResponse<T> | null;
  /** Set data directly */
  setData: React.Dispatch<React.SetStateAction<PaginatedResponse<T> | null>>;
  /** Loading state */
  loading: boolean;
  /** Error message */
  error: string | null;
  /** Query parameters for API calls */
  queryParams: Record<string, any>;
  /** Ref to track first load */
  isFirstLoad: React.MutableRefObject<boolean>;
  /** Table state */
  table: ReturnType<typeof useTableState>;
  /** Manual fetch function */
  fetchData: () => Promise<void>;
  /** Refresh data */
  refresh: () => void;
}

export function useListData<T>({
  initialData,
  fetchFn,
  tableOptions = {},
  onDataChange,
  errorPrefix = 'Failed to load data'
}: UseListDataOptions<T>): UseListDataReturn<T> {
  const [data, setData] = useState<PaginatedResponse<T> | null>(initialData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Track first load to prevent redundant fetch on mount
  const isFirstLoad = useRef(true);

  // Use table state for pagination/sorting/filtering
  const table = useTableState({
    defaultLimit: tableOptions.defaultLimit ?? 10,
    defaultSortBy: tableOptions.defaultSortBy ?? 'created_at',
    defaultSortOrder: tableOptions.defaultSortOrder ?? 'desc',
  });

  // Memoize query parameters
  const queryParams = useMemo(() => ({
    limit: table.limit,
    offset: table.offset,
    sort_by: table.sortBy,
    order: table.sortOrder,
    search: table.search,
  }), [table.limit, table.offset, table.sortBy, table.sortOrder, table.search]);

  // Manual fetch function
  const fetchData = useCallback(async () => {
    const controller = new AbortController();

    try {
      setLoading(true);
      setError(null);
      const result = await fetchFn(queryParams, controller.signal);
      setData(result);
      onDataChange?.(result);
    } catch (err: unknown) {
      const error = err as { name?: string; message?: string };
      if (error.name === 'AbortError') return;
      console.error(`${errorPrefix}:`, err);
      setError(`${errorPrefix}. Please try again.`);
    } finally {
      setLoading(false);
    }
  }, [fetchFn, queryParams, errorPrefix, onDataChange]);

  // Fetch on mount and when dependencies change
  useEffect(() => {
    // Skip initial fetch if we have server-provided data
    if (isFirstLoad.current) {
      isFirstLoad.current = false;
      // If we have initial data, don't fetch again
      if (initialData) return;
    }

    const controller = new AbortController();

    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);
        const result = await fetchFn(queryParams, controller.signal);
        setData(result);
        onDataChange?.(result);
      } catch (err: unknown) {
        const error = err as { name?: string; message?: string };
        if (error.name === 'AbortError') return;
        console.error(`${errorPrefix}:`, err);
        setError(`${errorPrefix}. Please try again.`);
      } finally {
        setLoading(false);
      }
    };

    loadData();

    return () => controller.abort();
  }, [table.limit, table.offset, table.sortBy, table.sortOrder, table.search]);

  // Refresh helper
  const refresh = useCallback(() => {
    isFirstLoad.current = true;
    fetchData();
  }, [fetchData]);

  return {
    data,
    setData,
    loading,
    error,
    queryParams,
    isFirstLoad,
    table,
    fetchData,
    refresh,
  };
}
