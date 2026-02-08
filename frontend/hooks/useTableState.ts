import { useCallback, useEffect, useState, useMemo, useRef } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';

interface TableState {
    page: number;
    limit: number;
    sortBy: string;
    sortOrder: 'asc' | 'desc';
    search: string;
}

interface UseTableStateOptions {
    defaultLimit?: number;
    defaultSortBy?: string;
    defaultSortOrder?: 'asc' | 'desc';
    syncUrl?: boolean;
}

export function useTableState(options: UseTableStateOptions = {}) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const {
        defaultLimit = 100,
        defaultSortBy = 'created_at',
        defaultSortOrder = 'desc',
        syncUrl = true, // Enable URL synchronization for deep linking and shareable URLs
    } = options;

    // Track if we've done initial hydration
    const hasHydrated = useRef(false);
    const lastUrlRef = useRef<string>('');

    // Initialize state from URL or defaults (only once)
    const getInitialState = (): TableState => {
        if (!syncUrl) {
            return {
                page: 1,
                limit: defaultLimit,
                sortBy: defaultSortBy,
                sortOrder: defaultSortOrder,
                search: '',
            };
        }

        return {
            page: Number(searchParams.get('page')) || 1,
            limit: Number(searchParams.get('limit')) || defaultLimit,
            sortBy: searchParams.get('sortBy') || defaultSortBy,
            sortOrder: (searchParams.get('sortOrder') as 'asc' | 'desc') || defaultSortOrder,
            search: searchParams.get('search') || '',
        };
    };

    const [state, setState] = useState<TableState>(getInitialState);

    // Sync with localStorage after mount (avoid hydration mismatch)
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const savedLimit = localStorage.getItem('global_rpp');
            if (savedLimit) {
                const limit = Number(savedLimit);
                if (limit !== state.limit) {
                    setState(prev => ({ ...prev, limit }));
                }
            }
        }
    }, []);
    // If syncUrl is false, we're ready immediately - no async URL hydration needed
    const [isInitialLoading, setIsInitialLoading] = useState(syncUrl);
    const [isTransitioning, setIsTransitioning] = useState(false);

    // Save limit to localStorage globally
    useEffect(() => {
        if (typeof window !== 'undefined') {
            localStorage.setItem('global_rpp', String(state.limit));
        }
    }, [state.limit]);

    // Mark as hydrated after initial mount
    useEffect(() => {
        if (!syncUrl) return;
        hasHydrated.current = true;
    }, [syncUrl]);

    // Sync state with URL when state changes (only if syncUrl is true)
    useEffect(() => {
        if (!syncUrl) return;

        // Skip initial mount - we read from URL during initialization
        if (!hasHydrated.current) return;

        const nextParams = new URLSearchParams();

        const addParam = (key: string, value: string | number, defaultValue: string | number, alwaysInclude = false) => {
            const strValue = String(value);
            const strDefault = String(defaultValue);
            // Include param if: alwaysInclude is true, OR value differs from default, OR value is truthy and not 'undefined'
            if (alwaysInclude || (strValue !== strDefault && strValue && strValue !== 'undefined')) {
                nextParams.set(key, strValue);
            }
        };

        addParam('page', state.page, 1);
        addParam('limit', state.limit, defaultLimit);
        addParam('sortBy', state.sortBy, defaultSortBy);
        // Always include sortOrder to make it visible in URL (helps with debugging and sharing)
        addParam('sortOrder', state.sortOrder, defaultSortOrder, true);
        addParam('search', state.search, '');

        const nextUrl = nextParams.toString();

        // Use replaceState to avoid triggering Next.js navigation
        if (typeof window !== 'undefined' && nextUrl !== lastUrlRef.current) {
            lastUrlRef.current = nextUrl;
            const url = new URL(window.location.href);
            url.search = nextUrl;
            window.history.replaceState({}, '', url.toString());
        }

        setIsInitialLoading(false);
        setIsTransitioning(false);
    }, [state, syncUrl, defaultLimit, defaultSortBy, defaultSortOrder]);

    // Actions - with immediate transition state
    const setPage = useCallback((page: number) => {
        setState((prev) => {
            if (prev.page === page) return prev;
            return { ...prev, page };
        });
    }, []);

    const setLimit = useCallback((newLimit: number) => {
        setState((prev) => {
            if (prev.limit === newLimit) return prev;
            const itemIndex = (prev.page - 1) * prev.limit;
            const newPage = Math.floor(itemIndex / newLimit) + 1;
            return {
                ...prev,
                limit: newLimit,
                page: newPage || 1,
            };
        });
    }, []);

    const setSort = useCallback((sortBy: string, sortOrder?: 'asc' | 'desc') => {
        setState((prev) => {
            let nextOrder = sortOrder;
            if (!nextOrder) {
                if (prev.sortBy === sortBy) {
                    nextOrder = prev.sortOrder === 'asc' ? 'desc' : 'asc';
                } else {
                    nextOrder = 'desc';
                }
            }
            if (prev.sortBy === sortBy && prev.sortOrder === nextOrder) return prev;
            return {
                ...prev,
                sortBy,
                sortOrder: nextOrder,
                page: 1,
            };
        });
    }, []);

    const setSearch = useCallback((search: string) => {
        setState((prev) => {
            if (prev.search === search) return prev;
            return {
                ...prev,
                search,
                page: 1,
            };
        });
    }, []);

    const reset = useCallback(() => {
        setState({
            page: 1,
            limit: defaultLimit,
            sortBy: defaultSortBy,
            sortOrder: defaultSortOrder,
            search: '',
        });
    }, [defaultLimit, defaultSortBy, defaultSortOrder]);

    // Memoize the entire hook return to prevent unnecessary re-renders in consumer components
    return useMemo(() => ({
        ...state,
        setPage,
        setLimit,
        setSort,
        setSearch,
        reset,
        isInitialLoading,
        isTransitioning,
        offset: (state.page - 1) * state.limit,
    }), [
        state,
        setPage,
        setLimit,
        setSort,
        setSearch,
        reset,
        isInitialLoading,
        isTransitioning
    ]);
}
