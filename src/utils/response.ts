import { ResourceSpaceError, PermissionError } from '../core/errors.js';

/** Error-like strings RS embeds in 200 responses */
const ERROR_PATTERNS = [
  'error:',
  'permission denied',
  'access denied',
] as const;

/**
 * Normalize a raw RS API response.
 *
 * ResourceSpace has several response quirks:
 * 1. Some functions return JSON-encoded strings (need double-parse)
 * 2. Errors arrive as 200 responses with error text in the body
 * 3. Some functions return `{error: "..."}` objects
 * 4. Null/undefined responses where empty array is expected
 * 5. Wrapped objects like `{resources: [...]}` instead of plain arrays
 *
 * This function normalizes all of those into a consistent shape.
 */
export function normalizeResponse<T>(
  data: unknown,
  functionName: string,
): T {
  // Handle null/undefined
  if (data === null || data === undefined) {
    return null as T;
  }

  // Handle string responses (most common RS quirk)
  if (typeof data === 'string') {
    // Check for error strings in the response body
    const lower = data.toLowerCase();

    // Check permission errors first (specific)
    if (lower.includes('permission denied') || lower.includes('access denied')) {
      throw new PermissionError(functionName, data.substring(0, 200));
    }

    // Check for error patterns: "error:", "Error - ...", "Error ..." etc.
    const isError = lower.startsWith('error') || ERROR_PATTERNS.some(p => lower.includes(p));
    if (isError) {
      throw new ResourceSpaceError(
        `ResourceSpace API error: ${data.substring(0, 200)}`,
        functionName,
        undefined,
        data.substring(0, 200),
      );
    }

    // Try to parse as JSON (RS sometimes returns JSON-encoded strings)
    try {
      const parsed = JSON.parse(data);
      return parsed as T;
    } catch {
      // Not JSON — return as-is (valid for get_resource_path which returns a URL string)
      return data as T;
    }
  }

  // Handle error objects
  if (typeof data === 'object' && data !== null && 'error' in data) {
    const errorMsg = (data as { error?: string }).error || 'Unknown error';
    throw new ResourceSpaceError(
      `ResourceSpace API error: ${errorMsg}`,
      functionName,
      undefined,
      errorMsg,
    );
  }

  return data as T;
}

/**
 * Safely coerce a value that RS returns as string|number to a number.
 * RS frequently returns numeric IDs as strings.
 */
export function toNumber(value: string | number | undefined | null): number | null {
  if (value === undefined || value === null) return null;
  const n = typeof value === 'string' ? parseInt(value, 10) : value;
  return Number.isFinite(n) ? n : null;
}

/**
 * Ensure a response that should be an array actually is one.
 * RS sometimes returns single objects or wrapped arrays.
 */
export function ensureArray<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data;
  if (data === null || data === undefined) return [];
  // Check for wrapped formats
  if (typeof data === 'object' && data !== null) {
    const obj = data as Record<string, unknown>;
    if (Array.isArray(obj.resources)) return obj.resources as T[];
    if (Array.isArray(obj.data)) return obj.data as T[];
  }
  return [];
}
