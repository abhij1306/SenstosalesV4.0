"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  HugeiconsIcon
} from "@hugeicons/react";
import {
  Search01Icon,
  Invoice01Icon,
  DeliveryTruck01Icon,
  ShoppingCart01Icon,
  ArrowRight01Icon,
  Loading03Icon,
  PackageIcon,
  AlertCircleIcon,
  FilterHorizontalIcon,
  ArrowDown01Icon,
  ArrowUp01Icon,
  File01Icon,
  Time01Icon,
} from "@hugeicons/core-free-icons";
import * as DialogPrimitive from "@radix-ui/react-dialog";

import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { SearchResult } from "@/types";
import { Button, Badge, Input, DatePicker } from "./index";
import { fmtNum, fmtCurr } from "@/lib/formatters";

// LocalStorage keys
const RECENT_SEARCHES_KEY = "senstosales_recent_searches";

// Document type options
const DOC_TYPES = [
  { id: "po", label: "Purchase Orders", icon: ShoppingCart01Icon },
  { id: "dc", label: "Delivery Challans", icon: DeliveryTruck01Icon },
  { id: "invoice", label: "Invoices", icon: Invoice01Icon },
  { id: "srv", label: "SRVs", icon: PackageIcon },
];

interface SearchFilters {
  types: string[];
  dateFrom: string;
  dateTo: string;
  amountMin: string;
  amountMax: string;
}

interface RecentSearch {
  query: string;
  filters: SearchFilters;
  timestamp: string;
}

const defaultFilters: SearchFilters = {
  types: ["po", "dc", "invoice", "srv"],
  dateFrom: "",
  dateTo: "",
  amountMin: "",
  amountMax: "",
};

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>(defaultFilters);
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  // Load recent searches from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const recent = localStorage.getItem(RECENT_SEARCHES_KEY);
      if (recent) {
        try {
          setRecentSearches(JSON.parse(recent));
        } catch {
          setRecentSearches([]);
        }
      }
    }
  }, []);

  // Save recent searches to localStorage
  const saveRecentSearch = useCallback((searchQuery: string, searchFilters: SearchFilters) => {
    if (!searchQuery.trim()) return;
    const newRecent: RecentSearch = {
      query: searchQuery,
      filters: searchFilters,
      timestamp: new Date().toISOString(),
    };
    setRecentSearches((prev) => {
      // Remove duplicates and keep last 10
      const filtered = prev.filter((r) => r.query !== searchQuery);
      const updated = [newRecent, ...filtered].slice(0, 10);
      localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  // Load a recent search
  const loadRecentSearch = useCallback((recent: RecentSearch) => {
    setQuery(recent.query);
    setFilters(recent.filters);
    performSearch(recent.query, recent.filters);
  }, []);

  // Toggle with Ctrl+K
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  // Reset selection when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [results]);

  // Focus input when opened
  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Handle Keyboard Navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + results.length) % results.length);
    } else if (e.key === "Enter" && results[selectedIndex]) {
      handleSelect(results[selectedIndex]);
    }
  };

  // Perform search with filters
  const performSearch = useCallback(async (searchQuery: string, searchFilters: SearchFilters) => {
    // Allow search with just filters (no query) if at least one filter is active
    const hasActiveFilters =
      searchFilters.types.length !== 4 ||
      searchFilters.dateFrom ||
      searchFilters.dateTo ||
      searchFilters.amountMin ||
      searchFilters.amountMax;

    if (!searchQuery.trim() && !hasActiveFilters) {
      setResults([]);
      return;
    }

    // Use wildcard for empty query with active filters
    const effectiveQuery = searchQuery.trim() || "*";

    setLoading(true);
    try {
      const res = await api.searchGlobal(effectiveQuery, {
        types: searchFilters.types,
        dateFrom: searchFilters.dateFrom || undefined,
        dateTo: searchFilters.dateTo || undefined,
        amountMin: searchFilters.amountMin ? parseFloat(searchFilters.amountMin) : undefined,
        amountMax: searchFilters.amountMax ? parseFloat(searchFilters.amountMax) : undefined,
      });
      setResults(res || []);
      if (searchQuery.trim()) {
        saveRecentSearch(searchQuery, searchFilters);
      }
    } catch (error) {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [saveRecentSearch]);

  // Debounced Search
  useEffect(() => {
    const timer = setTimeout(() => {
      performSearch(query, filters);
    }, 150);

    return () => clearTimeout(timer);
  }, [query, filters, performSearch]);

  const handleSelect = (result: SearchResult) => {
    setOpen(false);
    setQuery("");
    setResults([]);

    const type = result.type.toLowerCase();
    switch (type) {
      case "po":
        router.push(`/po/${result.id}`);
        break;
      case "dc":
        router.push(`/dc/${result.id}`);
        break;
      case "invoice":
        router.push(`/invoice/${result.id}`);
        break;
      case "srv":
        router.push(`/srv/${result.id}`);
        break;
      default:
        break;
    }
  };

  const toggleDocType = (typeId: string) => {
    setFilters((prev) => ({
      ...prev,
      types: prev.types.includes(typeId)
        ? prev.types.filter((t) => t !== typeId)
        : [...prev.types, typeId],
    }));
  };

  const clearFilters = () => {
    setFilters(defaultFilters);
  };

  const hasActiveFilters =
    filters.types.length !== 4 ||
    filters.dateFrom ||
    filters.dateTo ||
    filters.amountMin ||
    filters.amountMax;

  const selectedResult = results[selectedIndex];

  return (
    <>
      {/* Trigger Button */}
      <button
        onClick={() => setOpen(true)}
        className="flex items-center w-full max-w-[280px] h-size-sm px-3 rounded-md border border-border bg-surface text-muted hover:text-foreground hover:border-border-strong transition-colors"
      >
        <HugeiconsIcon icon={Search01Icon} className="w-4 h-4 text-subtle mr-2" />
        <span className="typo-body-md">Search...</span>
        <kbd className="ml-auto hidden sm:inline-flex h-5 items-center px-1.5 rounded bg-surface-sunken typo-body-md border border-border">
          ⌘K
        </kbd>
      </button>

      <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50" />
          <DialogPrimitive.Content
            onKeyDown={handleKeyDown}
            className="fixed left-1/2 top-[10%] z-50 w-full max-w-4xl -translate-x-1/2 bg-surface rounded-lg border border-border shadow-2xl outline-none overflow-hidden flex flex-col max-h-[80vh]"
          >
            <DialogPrimitive.Title className="sr-only">Quick Search</DialogPrimitive.Title>
            <DialogPrimitive.Description className="sr-only">
              Search across purchase orders, delivery challans, invoices, and SRVs with filters
            </DialogPrimitive.Description>

            {/* Search Input */}
            <div className="flex items-center border-b border-border px-4 py-3">
              <HugeiconsIcon icon={Search01Icon} className="mr-3 h-4 w-4 text-subtle shrink-0" />
              <Input
                ref={inputRef}
                autoFocus
                className="flex-1 h-8 bg-transparent border-none shadow-none focus:ring-0 typo-body-md"
                placeholder="Search POs, Challans, Invoices or SRVs..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              {loading && <HugeiconsIcon icon={Loading03Icon} className="h-4 w-4 animate-spin text-primary ml-2" />}

              {/* Filter Toggle */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={cn(
                  "ml-2 p-1.5 rounded-md transition-colors",
                  showFilters || hasActiveFilters
                    ? "bg-primary/10 text-primary"
                    : "text-subtle hover:text-foreground hover:bg-surface-sunken"
                )}
                title="Toggle filters"
                aria-label="Toggle filters"
              >
                <HugeiconsIcon icon={FilterHorizontalIcon} size={16} />
              </button>

              <kbd className="hidden sm:inline-flex h-6 items-center px-2 ml-2 rounded bg-surface-sunken typo-body-md text-subtle border border-border">
                ESC
              </kbd>
            </div>

            {/* Filters Panel */}
            {showFilters && (
              <div className="border-b border-border bg-surface-sunken/30 px-4 py-3">
                <div className="flex items-center justify-between mb-3">
                  <span className="typo-body-md">Filters</span>
                  <button
                    onClick={clearFilters}
                    className="typo-body-md text-primary hover:text-primary-hover"
                  >
                    Clear all
                    <HugeiconsIcon icon={ArrowRight01Icon} className="w-5 h-5 text-text-tertiary group-hover:text-action-primary transition-colors" />
                  </button>
                </div>

                {/* Document Types */}
                <div className="mb-4">
                  <span className="typo-body-md mb-2 block">
                    Document Types
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {DOC_TYPES.map((type) => {
                      const Icon = type.icon;
                      const isSelected = filters.types.includes(type.id);
                      return (
                        <button
                          key={type.id}
                          onClick={() => toggleDocType(type.id)}
                          className={cn(
                            "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md typo-body-md transition-colors",
                            isSelected
                              ? "bg-primary text-white"
                              : "bg-surface border border-border text-muted hover:border-border-strong"
                          )}
                        >
                          <HugeiconsIcon icon={Icon} className="w-3 h-3" />
                          <HugeiconsIcon icon={FilterHorizontalIcon} className="w-4 h-4 mr-2" />
                          {type.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Date Range */}
                  <div>
                    <span className="typo-body-md mb-2 block">
                      Date Range
                    </span>
                    <div className="flex items-center gap-2">
                      <DatePicker
                        value={filters.dateFrom}
                        onChange={(val) =>
                          setFilters((prev) => ({ ...prev, dateFrom: val }))
                        }
                        className="w-40"
                        placeholder="From"
                      />
                      <span className="text-subtle">-</span>
                      <DatePicker
                        value={filters.dateTo}
                        onChange={(val) =>
                          setFilters((prev) => ({ ...prev, dateTo: val }))
                        }
                        className="w-40"
                        placeholder="To"
                      />
                    </div>
                  </div>

                  {/* Amount Range */}
                  <div>
                    <span className="typo-body-md mb-2 block">
                      Amount Range (₹)
                    </span>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        value={filters.amountMin}
                        onChange={(e) =>
                          setFilters((prev) => ({ ...prev, amountMin: e.target.value }))
                        }
                        className="h-8 typo-body-md"
                        placeholder="Min"
                        min={0}
                      />
                      <span className="text-subtle">-</span>
                      <Input
                        type="number"
                        value={filters.amountMax}
                        onChange={(e) =>
                          setFilters((prev) => ({ ...prev, amountMax: e.target.value }))
                        }
                        className="h-8 typo-body-md"
                        placeholder="Max"
                        min={0}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Main Content */}
            <div className="flex flex-1 overflow-hidden">
              {/* Left: Results */}
              <div className="w-2/5 overflow-y-auto border-r border-border bg-surface-sunken/30 min-h-[300px]">
                {!query && recentSearches.length > 0 && (
                  <div className="p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="typo-body-md text-muted flex items-center gap-1">
                        <HugeiconsIcon icon={Time01Icon} className="w-4 h-4" />
                        Recent Searches
                      </span>
                      <button
                        onClick={() => {
                          setRecentSearches([]);
                          localStorage.removeItem(RECENT_SEARCHES_KEY);
                        }}
                        className="typo-body-sm text-muted hover:text-foreground"
                      >
                        Clear
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {recentSearches.map((recent, idx) => (
                        <button
                          key={idx}
                          onClick={() => loadRecentSearch(recent)}
                          className="flex items-center gap-1 px-2 py-1 bg-surface border border-border rounded-md hover:border-border-strong transition-colors"
                        >
                          <HugeiconsIcon icon={Search01Icon} className="w-3 h-3 text-muted" />
                          <span className="typo-body-sm text-muted">{recent.query}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {query && results.length === 0 && !loading && (
                  <div className="p-8 text-center">
                    <HugeiconsIcon icon={AlertCircleIcon} className="w-8 h-8 text-subtle mx-auto mb-2" />
                    <p className="typo-body-md text-muted">No results found</p>
                    <p className="typo-body-sm text-subtle">Try adjusting your search or filters</p>
                  </div>
                )}

                {loading && (
                  <div className="p-8 text-center">
                    <HugeiconsIcon icon={Loading03Icon} className="w-6 h-6 text-primary animate-spin mx-auto" />
                  </div>
                )}

                {results.length > 0 && (
                  <div className="py-1">
                    {results.map((result, idx) => {
                      const isSelected = idx === selectedIndex;
                      return (
                        <button
                          key={result.id}
                          onClick={() => handleSelect(result)}
                          className={cn(
                            "w-full px-4 py-2.5 flex items-start gap-3 text-left transition-colors",
                            isSelected ? "bg-primary/10 border-l-2 border-primary" : "hover:bg-surface-sunken/50"
                          )}
                        >
                          <div className="mt-0.5">
                            {result.type === "PO" && <HugeiconsIcon icon={ShoppingCart01Icon} className="w-5 h-5 text-primary" />}
                            {result.type === "DC" && <HugeiconsIcon icon={DeliveryTruck01Icon} className="w-5 h-5 text-primary" />}
                            {result.type === "Invoice" && <HugeiconsIcon icon={Invoice01Icon} className="w-5 h-5 text-primary" />}
                            {result.type === "SRV" && <HugeiconsIcon icon={PackageIcon} className="w-5 h-5 text-primary" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="typo-body-md font-medium truncate">{result.title || result.number}</span>
                              <Badge variant="secondary" className="text-xs shrink-0">{result.type}</Badge>
                            </div>
                            {result.subtitle && (
                              <p className="typo-body-sm text-muted truncate">{result.subtitle}</p>
                            )}
                            <div className="flex items-center gap-3 mt-1">
                              {result.amount !== undefined && result.amount !== null && (
                                <span className="typo-body-sm font-medium text-foreground">
                                  {fmtCurr(result.amount)}
                                </span>
                              )}
                              {result.date && (
                                <span className="typo-body-sm text-muted">
                                  {result.date}
                                </span>
                              )}
                              {result.total_qty !== undefined && result.total_qty !== null && (
                                <span className="typo-body-sm text-muted">
                                  {fmtNum(result.total_qty)} units
                                </span>
                              )}
                            </div>
                          </div>
                          {isSelected && (
                            <HugeiconsIcon icon={ArrowRight01Icon} className="w-4 h-4 text-primary shrink-0 mt-1.5" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Right: Details Panel */}
              <div className="w-3/5 p-4 overflow-y-auto bg-surface">
                {selectedResult ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 pb-3 border-b border-border">
                      {selectedResult.type === "PO" && <HugeiconsIcon icon={ShoppingCart01Icon} className="w-8 h-8 text-primary" />}
                      {selectedResult.type === "DC" && <HugeiconsIcon icon={DeliveryTruck01Icon} className="w-8 h-8 text-primary" />}
                      {selectedResult.type === "Invoice" && <HugeiconsIcon icon={Invoice01Icon} className="w-8 h-8 text-primary" />}
                      {selectedResult.type === "SRV" && <HugeiconsIcon icon={PackageIcon} className="w-8 h-8 text-primary" />}
                      <div>
                        <h3 className="typo-body-lg font-semibold">{selectedResult.title || selectedResult.number}</h3>
                        <p className="typo-body-sm text-muted">{selectedResult.subtitle}</p>
                      </div>
                      <Badge variant="secondary" className="ml-auto">{selectedResult.type}</Badge>
                    </div>

                    {selectedResult.amount !== undefined && selectedResult.amount !== null && (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="typo-body-sm text-muted">Amount</p>
                          <p className="typo-body-lg font-semibold">{fmtCurr(selectedResult.amount)}</p>
                        </div>
                        {selectedResult.total_qty !== undefined && selectedResult.total_qty !== null && (
                          <div>
                            <p className="typo-body-sm text-muted">Quantity</p>
                            <p className="typo-body-lg font-semibold">{fmtNum(selectedResult.total_qty)} units</p>
                          </div>
                        )}
                      </div>
                    )}

                    {selectedResult.date && (
                      <div>
                        <p className="typo-body-sm text-muted">Date</p>
                        <p className="typo-body-lg font-semibold">{selectedResult.date}</p>
                      </div>
                    )}

                    {selectedResult.party && (
                      <div>
                        <p className="typo-body-sm text-muted">Party</p>
                        <p className="typo-body-md">{selectedResult.party}</p>
                      </div>
                    )}

                    {selectedResult.status && (
                      <div className="pt-2">
                        <Badge
                          variant={
                            selectedResult.status === "Open" ? "default" :
                            selectedResult.status === "Closed" ? "secondary" :
                            "outline"
                          }
                        >
                          {selectedResult.status}
                        </Badge>
                      </div>
                    )}

                    <Button
                      onClick={() => handleSelect(selectedResult)}
                      className="w-full mt-4"
                    >
                      Open {selectedResult.type}
                      <HugeiconsIcon icon={ArrowRight01Icon} className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center p-8">
                    <HugeiconsIcon icon={Search01Icon} className="w-12 h-12 text-subtle mb-3" />
                    <p className="typo-body-md text-muted">Select a result to view details</p>
                  </div>
                )}
              </div>
            </div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </>
  );
}
