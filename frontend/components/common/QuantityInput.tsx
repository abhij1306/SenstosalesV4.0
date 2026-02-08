"use client";

import React from "react";
import { Input } from "./Input";
import { cn } from "@/lib/utils";

interface QuantityInputProps {
    value: number;
    max?: number;
    onChange: (val: number) => void;
    className?: string;
    placeholder?: string;
    disabled?: boolean;
    error?: boolean;
}

/**
 * Standardized Numeric Input for SenstoSales
 * 
 * Solves:
 * 1. The "0 persistence" bug by using onFocus={(e) => e.target.select()}
 * 2. Type Safety: Ensures parent always receives a clean number/0, never string or NaN
 * 3. Enforces 'max' balance limits in real-time
 */
export function QuantityInput({
    value,
    max,
    onChange,
    className,
    placeholder = "0",
    disabled = false,
    error = false
}: QuantityInputProps) {
    const [localValue, setLocalValue] = React.useState<string>(value === 0 ? "" : String(value));

    // Sync with external state changes (e.g. resets, server updates)
    React.useEffect(() => {
        const numLocal = parseFloat(localValue) || 0;
        if (numLocal !== value) {
            setLocalValue(value === 0 ? "" : String(value));
        }
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const raw = e.target.value;

        // 1. Allow anything that looks like a partial number while typing (empty string, decimal point, etc.)
        setLocalValue(raw);

        // 2. Parse and notify parent
        const num = parseFloat(raw);
        if (!isNaN(num)) {
            // 3. Strict schema safety: Coerce to 0 if negative
            const safeNum = Math.max(0, num);

            // 4. Enforce Max Limit
            if (max !== undefined && safeNum > max) {
                setLocalValue(String(max));
                onChange(max);
            } else {
                setLocalValue(raw);
                onChange(safeNum);
            }
        } else {
            // If raw is empty or nonsense, notify parent of 0
            onChange(0);
        }
    };

    return (
        <Input
            type="number"
            value={localValue}
            onChange={handleChange}
            onFocus={(e) => e.target.select()} // FIX: Replace '0' immediately on type
            className={cn(
                "text-center tabular-nums h-8 border-border-default/20 focus:border-action-primary shadow-sm",
                className
            )}
            placeholder={placeholder}
            disabled={disabled}
            error={error}
            min={0}
            step="any"
        />
    );
}
