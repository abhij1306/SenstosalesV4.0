"use client";

import React, { InputHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

/* ==========================================================================
   INPUT COMPONENT - Aether Design System
   
   Variants:
   - default: Standard input with border
   - filled: Filled background, no border
   - flushed: Bottom border only
   
   Sizes:
   - sm, md, lg: Height and padding variations
   
   States:
   - error: Error state styling
   - disabled: Disabled state styling
   ========================================================================== */

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "size"> {
  variant?: "default" | "filled" | "flushed";
  size?: "sm" | "md" | "lg";
  error?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const variantStyles = {
  default: [
    "bg-surface",
    "border border-border",
    "rounded-lg",
    "placeholder:text-tertiary",
    "hover:border-border-strong",
    "focus:border-primary focus:ring-2 focus:ring-primary/20",
  ],
  filled: [
    "bg-surface-sunken",
    "border-2 border-transparent",
    "rounded-lg",
    "placeholder:text-tertiary",
    "hover:bg-surface",
    "focus:bg-surface focus:border-primary focus:ring-2 focus:ring-primary/20",
  ],
  flushed: [
    "bg-transparent",
    "border-0 border-b-2 border-border",
    "rounded-none",
    "px-0",
    "placeholder:text-tertiary",
    "hover:border-border-strong",
    "focus:border-primary focus:ring-0",
  ],
};

const sizeStyles = {
  sm: "h-8 px-3 typo-body-sm",
  md: "h-10 px-4 typo-body-md",
  lg: "h-12 px-4 typo-body-lg",
};

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      variant = "default",
      size = "md",
      error,
      leftIcon,
      rightIcon,
      disabled,
      ...props
    },
    ref
  ) => {
    const inputClasses = cn(
      // Base styles
      "w-full",
      "text-foreground",
      "transition-all duration-200 ease-out",
      "outline-none",
      "disabled:opacity-50 disabled:cursor-not-allowed",

      // Variant & Size
      variantStyles[variant],
      sizeStyles[size],

      // Icon padding
      leftIcon && "pl-10",
      rightIcon && "pr-10",

      // Error state
      error && [
        "border-error",
        "focus:border-error focus:ring-2 focus:ring-error/20",
        "placeholder:text-error/50",
      ],

      className
    );

    // If no icons, render simple input
    if (!leftIcon && !rightIcon) {
      return (
        <input
          ref={ref}
          className={inputClasses}
          disabled={disabled}
          {...props}
        />
      );
    }

    // With icons, wrap in relative container
    return (
      <div className="relative w-full">
        {leftIcon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-tertiary pointer-events-none">
            {leftIcon}
          </div>
        )}
        <input
          ref={ref}
          className={inputClasses}
          disabled={disabled}
          {...props}
        />
        {rightIcon && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-tertiary pointer-events-none">
            {rightIcon}
          </div>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";

// Label Component
interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean;
  error?: boolean;
}

export const Label = forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, children, required, error, ...props }, ref) => {
    return (
      <label
        ref={ref}
        className={cn(
          "block typo-label-lg text-secondary mb-1.5",
          error && "text-error",
          className
        )}
        {...props}
      >
        {children}
        {required && <span className="text-error ml-0.5">*</span>}
      </label>
    );
  }
);

Label.displayName = "Label";

// Helper Text Component
interface HelperTextProps extends React.HTMLAttributes<HTMLParagraphElement> {
  error?: boolean;
}

export const HelperText = forwardRef<HTMLParagraphElement, HelperTextProps>(
  ({ className, children, error, ...props }, ref) => {
    return (
      <p
        ref={ref}
        className={cn(
          "mt-1.5 typo-body-sm",
          error ? "text-error" : "text-tertiary",
          className
        )}
        {...props}
      >
        {children}
      </p>
    );
  }
);

HelperText.displayName = "HelperText";

// Form Group Component
interface FormGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  label?: string;
  helperText?: string;
  required?: boolean;
  error?: boolean;
}

export const FormGroup = forwardRef<HTMLDivElement, FormGroupProps>(
  (
    { className, children, label, helperText, required, error, ...props },
    ref
  ) => {
    return (
      <div ref={ref} className={cn("w-full", className)} {...props}>
        {label && (
          <Label required={required} error={error}>
            {label}
          </Label>
        )}
        {children}
        {helperText && <HelperText error={error}>{helperText}</HelperText>}
      </div>
    );
  }
);

FormGroup.displayName = "FormGroup";
