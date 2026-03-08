/**
 * Common type definitions and utilities
 */

/**
 * Safely parse unknown error objects
 */
export interface ParsedError {
  message: string;
  code?: string | number;
  originalError?: unknown;
}

/**
 * Parse an unknown error into a typed object
 */
export function parseError(error: unknown): ParsedError {
  if (error instanceof Error) {
    return {
      message: error.message,
      originalError: error,
    };
  }

  if (typeof error === 'string') {
    return { message: error };
  }

  if (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as Record<string, unknown>).message === 'string'
  ) {
    return {
      message: (error as Record<string, unknown>).message as string,
      originalError: error,
    };
  }

  return {
    message: 'An unknown error occurred',
    originalError: error,
  };
}

/**
 * Type guard for parsed error
 */
export function isParsedError(obj: unknown): obj is ParsedError {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'message' in obj &&
    typeof (obj as Record<string, unknown>).message === 'string'
  );
}

/**
 * Safe object access utilities
 */
export function safeAccess<T = unknown>(
  obj: unknown,
  key: string | string[],
  fallback?: T,
): T | undefined {
  if (!obj || typeof obj !== 'object') {
    return fallback;
  }

  const keys = Array.isArray(key) ? key : [key];
  let current = obj as Record<string, unknown>;

  for (const k of keys) {
    if (!(k in current) || current[k] === null || current[k] === undefined) {
      return fallback;
    }
    current = current[k] as Record<string, unknown>;
  }

  return current as T;
}

/**
 * Type guard for object
 */
export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/**
 * Type guard for string
 */
export function isString(value: unknown): value is string {
  return typeof value === 'string';
}

/**
 * Type guard for number
 */
export function isNumber(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value);
}

/**
 * Type guard for array
 */
export function isArray<T = unknown>(value: unknown): value is Array<T> {
  return Array.isArray(value);
}
