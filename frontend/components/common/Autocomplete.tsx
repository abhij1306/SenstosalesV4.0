"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Search01Icon, Loading03Icon, Sorting05Icon, Tick02Icon, Cancel01Icon } from "@hugeicons/core-free-icons";
import { Label } from "@/components/ui";
import { cn } from "@/lib/utils";
import { Input } from "./Input";
import { Button } from "./Button";

interface Option {
    value: string;
    label: string;
    subLabel?: string;
    metadata?: any;
}

interface AutocompleteProps {
    options: Option[];
    value?: string;
    onChange: (value: string, option?: Option) => void;
    placeholder?: string;
    loading?: boolean;
    onSearch?: (query: string) => void;
    className?: string;
    disabled?: boolean;
    defaultValue?: string;
}

export const Autocomplete = React.memo(({
    options,
    value,
    onChange,
    placeholder = "Select...",
    loading = false,
    onSearch,
    className,
    disabled = false,
}: AutocompleteProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState("");
    const wrapperRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Track if we should update query from value
    // We only update query from value if the user isn't actively typing (isOpen check helps)
    // or if the value changed externally.
    useEffect(() => {
        if (value) {
            const selected = options.find((opt) => opt.value === value);
            if (selected) {
                setQuery(selected.label);
            } else if (!isOpen) {
                // Only fallback to value if not open (prevent overwriting user typing if they are searching)
                // But wait, if user types "A", value is still old value until they select.
                // So this logic is tricky.
                // Better: Only reset query if value changes. 
                // But value relies on selection.
                // Let's stick to: if value is present, find match.
                // If no match found but value exists, show value? Or empty?
                // If filtered, match might not be in options.
            }
        } else {
            if (!isOpen) setQuery("");
        }
    }, [value, options, isOpen]);

    // Click outside handler
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                // On blur without selection, should we reset query?
                // If value is set, reset to value label.
                if (value) {
                    const selected = options.find((opt) => opt.value === value);
                    if (selected) setQuery(selected.label);
                } else {
                    setQuery("");
                }
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [options, value]);

    const handleSelect = useCallback((option: Option) => {
        onChange(option.value, option);
        setQuery(option.label);
        setIsOpen(false);
    }, [onChange]);

    const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setQuery(val);
        setIsOpen(true);
        if (onSearch) {
            onSearch(val);
        }
    }, [onSearch]);

    const handleClear = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        setQuery("");
        onChange("");
        inputRef.current?.focus();
    }, [onChange]);

    return (
        <div ref={wrapperRef} className={cn("relative w-full", className)}>
            <div className="relative">
                <Input
                    ref={inputRef}
                    disabled={disabled}
                    value={query}
                    onChange={handleInputChange}
                    onFocus={() => setIsOpen(true)}
                    placeholder={placeholder}
                    className={cn(
                        "flex h-11 w-full rounded-2xl border-none !border-none bg-surface-variant/30 px-3 pl-10 py-2 typo-body-md text-foreground outline-none !outline-none ring-0 !ring-0 shadow-none !shadow-none placeholder:text-subtle/60 focus:bg-surface focus:outline-none focus:ring-0 disabled:cursor-not-allowed disabled:opacity-50 transition-all font-sans",
                        isOpen && "bg-surface shadow-md"
                    )}
                />
                <HugeiconsIcon icon={Search01Icon} className="absolute left-3 top-2.5 h-4 w-4 text-subtle/40 pointer-events-none" />
                {loading && (
                    <div className="absolute right-3 top-2.5">
                        <HugeiconsIcon icon={Loading03Icon} className="h-4 w-4 animate-spin text-action-primary" />
                    </div>
                )}
                {!loading && query && (
                    <Button
                        onClick={handleClear}
                        className="absolute right-3 top-2.5 hover:bg-surface-variant/50 rounded-full p-0.5 transition-colors h-auto min-h-0 bg-transparent border-none shadow-none"
                        type="button"
                    >
                        <HugeiconsIcon icon={Cancel01Icon} className="h-3 w-3 text-subtle/40" />
                    </Button>
                )}
            </div>

            {isOpen && (
                <div className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-2xl bg-white dark:bg-surface p-1 shadow-2xl animate-in fade-in zoom-in-95 duration-100">
                    {options.length === 0 && !loading && (
                        <div className="py-6 text-center typo-body-sm text-subtle">
                            {query ? "No results found." : "Type to search..."}
                        </div>
                    )}
                    {options.map((option) => (
                        <div
                            key={option.value}
                            onClick={() => handleSelect(option)}
                            className={cn(
                                "relative flex cursor-pointer select-none items-center rounded-lg px-3 py-2 typo-body-md outline-none transition-colors hover:bg-primary/10 hover:text-primary",
                                value === option.value && "bg-primary/5 text-primary"
                            )}
                        >
                            <div className="flex flex-col gap-0.5">
                                <span className="typo-body-md">{option.label}</span>
                                {option.subLabel && (
                                    <Label size="sm" field className="text-tertiary">{option.subLabel}</Label>
                                )}
                            </div>
                            {value === option.value && (
                                <HugeiconsIcon icon={Tick02Icon} className="ml-auto h-4 w-4" />
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
});

Autocomplete.displayName = 'Autocomplete';
