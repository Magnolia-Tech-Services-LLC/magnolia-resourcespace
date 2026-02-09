/**
 * Base error for all ResourceSpace API errors.
 * Preserves the original RS error context for debugging.
 */
export class ResourceSpaceError extends Error {
  constructor(
    message: string,
    public readonly functionName: string,
    public readonly statusCode?: number,
    public readonly rsError?: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'ResourceSpaceError';
  }
}

/**
 * Thrown when RS returns a permission/access error.
 */
export class PermissionError extends ResourceSpaceError {
  constructor(functionName: string, detail?: string) {
    super(
      `Permission denied for ${functionName}${detail ? `: ${detail}` : ''}`,
      functionName,
    );
    this.name = 'PermissionError';
  }
}

/**
 * Thrown when RS configuration is invalid or missing.
 */
export class ConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigurationError';
  }
}

/**
 * Thrown when a batch operation exceeds the configured size limit.
 */
export class BatchSizeLimitError extends Error {
  constructor(actual: number, max: number) {
    super(`Batch size ${actual} exceeds maximum ${max}`);
    this.name = 'BatchSizeLimitError';
  }
}

/**
 * Thrown when a security constraint blocks an operation
 * (e.g. disallowed fields in save_user).
 */
export class SecurityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SecurityError';
  }
}
