/**
 * Performance Constants
 * 
 * Centralized configuration for performance-related settings.
 * Replaces magic numbers throughout the codebase.
 */

// API and Caching
export const CACHE_REFRESH_INTERVAL = 30_000; // 30 seconds - interval for polling cache
export const API_RETRY_DELAY_MS = 1000; // 1 second - initial retry delay
export const API_MAX_RETRY_ATTEMPTS = 3; // Maximum retry attempts

// Debouncing
export const DEFAULT_DEBOUNCE_DELAY = 300; // 300ms - default debounce for inputs
export const SEARCH_DEBOUNCE_DELAY = 300; // 300ms - debounce for search inputs
export const FORM_DEBOUNCE_DELAY = 300; // 300ms - debounce for form inputs

// Pagination
export const DEFAULT_PAGE_SIZE = 10; // Default items per page
export const LARGE_PAGE_SIZE = 50; // Items per page for large lists
export const SMALL_PAGE_SIZE = 5; // Items per page for small lists

// Animation
export const TRANSITION_DURATION_MS = 300; // 300ms - standard transition duration
export const MODAL_TRANSITION_DURATION = 200; // 200ms - modal animation
export const TOAST_DURATION = 4000; // 4 seconds - toast notification duration

// Timeouts
export const FETCH_TIMEOUT_MS = 30_000; // 30 seconds - fetch request timeout
export const SESSION_TIMEOUT_MS = 300_000; // 5 minutes - session idle timeout
export const TOAST_TIMEOUT = 5000; // 5 seconds - toast auto-dismiss

// Local Storage Keys (for reference)
export const LS_THEME_KEY = 'theme';
export const LS_LANGUAGE_KEY = 'language';
export const LS_PREFERENCES_KEY = 'user-preferences';

// Validation
export const MIN_PASSWORD_LENGTH = 8;
export const MAX_FILE_SIZE_MB = 10;
export const MAX_UPLOAD_FILES = 5;

// Grid/Table
export const TABLE_ROW_HEIGHT = 48; // pixels
export const TABLE_HEADER_HEIGHT = 56; // pixels
export const BATCH_OPERATION_SIZE = 100; // items per batch operation
