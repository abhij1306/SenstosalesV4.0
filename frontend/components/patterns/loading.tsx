"use client";

import React from "react";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

export const LoadingSpinner = React.memo(function LoadingSpinner({
  size = "md",
  className,
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-8 w-8",
    lg: "h-12 w-12",
  };

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div
        className={`${sizeClasses[size]} border-2 border-primary border-t-transparent rounded-full animate-spin`}
      />
    </div>
  );
});

export const PageLoading = React.memo(function PageLoading() {
  return (
    <div className="min-h-screen-50 flex items-center justify-center">
      <LoadingSpinner size="lg" />
    </div>
  );
});

export const TableLoading = React.memo(function TableLoading() {
  return (
    <div className="min-h-md flex items-center justify-center bg-surface-sunken/30 rounded-lg border border-dashed border-border">
      <div className="flex flex-col items-center gap-2">
        <LoadingSpinner size="md" />
        <span className="typo-label-md text-subtle">Loading...</span>
      </div>
    </div>
  );
});

export const CardLoading = React.memo(function CardLoading() {
  return (
    <div className="bg-surface border border-border rounded-lg p-6 animate-pulse">
      <div className="h-4 bg-surface-sunken rounded w-1/4 mb-4" />
      <div className="h-8 bg-surface-sunken rounded w-1/2 mb-2" />
      <div className="h-4 bg-surface-sunken rounded w-3/4" />
    </div>
  );
});
