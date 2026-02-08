/**
 * Simple Error Boundary for Small Projects
 * Provides basic crash protection without automatic recovery complexity.
 */

'use client';

import React, { Component, ComponentType, ErrorInfo, ReactNode } from 'react';
import { Button, Card, Flex } from '@/components/common';
import { Heading, Text, Label } from "@/components/ui";
import { HugeiconsIcon } from '@hugeicons/react';
import { ReloadIcon as RefreshCw, Home01Icon as Home, AlertCircleIcon as AlertCircle } from '@hugeicons/core-free-icons';

/**
 * Error boundary state
 */
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorId: string | null;
}

/**
 * Props for ErrorBoundary
 */
interface ErrorBoundaryProps {
  /** Children to wrap */
  children: ReactNode;
  /** Fallback component to show on error */
  fallback?: ReactNode | ((error: Error, reset: () => void) => ReactNode);
  /** Component name for logging */
  componentName?: string;
  /** Whether to show error details to user */
  showDetails?: boolean;
  /** Callback when error is caught */
  onError?: (error: Error, info: ErrorInfo) => void;
}

/**
 * Simple Error Boundary
 * Catches React component errors and displays a fallback UI.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorId: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
      errorId: `err-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log error to console (simplified for small projects)
    console.error('React component error:', error);
    if (errorInfo?.componentStack) {
      console.error('Component stack:', errorInfo.componentStack);
    }

    // Call onError callback if provided
    this.props.onError?.(error, errorInfo);
  }

  resetErrorBoundary = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorId: null,
    });
  };

  render(): ReactNode {
    const { hasError, error, errorId } = this.state;
    const { children, fallback } = this.props;

    if (hasError && error) {
      // Custom fallback function
      if (typeof fallback === 'function') {
        return fallback(error, this.resetErrorBoundary);
      }

      // Custom fallback component
      if (fallback) {
        return fallback;
      }

      // Default fallback UI
      return (
        <ErrorFallback
          error={error}
          errorId={errorId}
          onReset={this.resetErrorBoundary}
          showDetails={this.props.showDetails}
          componentName={this.props.componentName}
        />
      );
    }

    return children;
  }
}

/**
 * Default error fallback UI
 */
interface ErrorFallbackProps {
  error: Error;
  errorId: string | null;
  onReset: () => void;
  showDetails?: boolean;
  componentName?: string;
}

export function ErrorFallback({
  error,
  errorId,
  onReset,
  showDetails = false,
  componentName,
}: ErrorFallbackProps): ReactNode {
  const isDev = process.env.NODE_ENV === 'development';

  return (
    <div style={{ padding: 24 }}>
      <div className="spatial-card-v2" style={{ maxWidth: 600, margin: '0 auto' }}>
        <Flex direction="col" gap={4} align="stretch" className="w-full p-4">
          <div style={{ textAlign: 'center' }}>
            <HugeiconsIcon icon={AlertCircle} size={48} className="mx-auto text-error mb-4" />
            <Heading as="h2" style={{ fontWeight: 600 }}>Something went wrong</Heading>
            <Label size="sm" className="text-tertiary mt-2">
              An unexpected error occurred in {componentName || 'this component'}
            </Label>
          </div>

          {errorId && (
            <div style={{ textAlign: 'center' }}>
              <Label size="sm" className="text-tertiary">
                Error ID: {errorId}
              </Label>
            </div>
          )}

          {(showDetails || isDev) && (
            <div className="spatial-card-v2" style={{ background: 'var(--secondary)' }}>
              <Flex direction="col" gap={2} className="p-3">
                <Text size="sm"><strong>Message:</strong> {error.message}</Text>
                {error.stack && (
                  <Text size="sm" style={{ fontSize: 10, fontFamily: 'monospace' }}>
                    {error.stack.slice(0, 500)}
                  </Text>
                )}
              </Flex>
            </div>
          )}

          <Flex justify="center" gap={3} className="mt-4">
            <Button
              variant="outline"
              onClick={onReset}
            >
              <HugeiconsIcon icon={RefreshCw} className="w-4 h-4" />
              Try Again
            </Button>
            <Button
              variant="primary"
              onClick={() => (window.location.href = '/')}
            >
              <HugeiconsIcon icon={Home} className="w-4 h-4" />
              Go Home
            </Button>
          </Flex>
        </Flex>
      </div>
    </div>
  );
}

/**
 * Async Error Boundary for Suspense boundaries
 */
interface AsyncErrorBoundaryProps extends Omit<ErrorBoundaryProps, 'fallback'> {
  /** Error UI for async errors */
  errorComponent?: ReactNode;
}

interface AsyncErrorBoundaryState {
  error: Error | null;
}

export class AsyncErrorBoundary extends Component<
  AsyncErrorBoundaryProps,
  AsyncErrorBoundaryState
> {
  constructor(props: AsyncErrorBoundaryProps) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error): AsyncErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log error to console (simplified for small projects)
    console.error('Async component error:', error);
  }

  render(): ReactNode {
    const { children, errorComponent } = this.props;
    const { error } = this.state;

    if (error) {
      return (
        <ErrorFallback
          error={error}
          errorId={null}
          onReset={() => this.setState({ error: null })}
          showDetails={false}
          componentName={this.props.componentName}
        />
      );
    }

    return children;
  }
}

/**
 * HOC to wrap a component with error boundary
 */
export function withErrorBoundary<P extends object>(
  WrappedComponent: ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
): ComponentType<P> {
  return function WithErrorBoundaryWrapper(props: P) {
    return (
      <ErrorBoundary {...errorBoundaryProps}>
        <WrappedComponent {...props} />
      </ErrorBoundary>
    );
  };
}
