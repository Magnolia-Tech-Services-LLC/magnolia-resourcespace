import type { RSConfig } from './types.js';
import { ConfigurationError } from './errors.js';

const DEFAULT_TIMEOUT = 30000;
const DEFAULT_MAX_BATCH_SIZE = 100;
const MIN_SECRET_LENGTH = 32;

/**
 * Validate an RSConfig and return it with defaults applied.
 * Throws ConfigurationError on invalid input.
 */
export function validateConfig(config: RSConfig): Required<Pick<RSConfig, 'timeout' | 'maxBatchSize'>> & RSConfig {
  if (!config.baseUrl) {
    throw new ConfigurationError('baseUrl is required');
  }
  if (!config.user) {
    throw new ConfigurationError('user is required');
  }
  if (!config.secret) {
    throw new ConfigurationError('secret is required');
  }
  if (config.secret.length < MIN_SECRET_LENGTH) {
    throw new ConfigurationError(
      `secret must be at least ${MIN_SECRET_LENGTH} characters (got ${config.secret.length})`,
    );
  }
  if (config.authMode !== 'apiKey' && config.authMode !== 'sessionKey') {
    throw new ConfigurationError(`authMode must be "apiKey" or "sessionKey", got "${config.authMode}"`);
  }

  return {
    ...config,
    timeout: config.timeout ?? DEFAULT_TIMEOUT,
    maxBatchSize: config.maxBatchSize ?? DEFAULT_MAX_BATCH_SIZE,
  };
}

/**
 * Build an RSConfig from environment variables.
 * Returns null if required vars are missing (fail-safe).
 *
 * @param prefix - optional prefix for env vars, e.g. "RS" → RS_BASE_URL
 */
export function configFromEnv(prefix = 'RESOURCESPACE'): RSConfig | null {
  const p = prefix ? `${prefix}_` : '';
  const baseUrl = process.env[`${p}API_URL`] ?? process.env[`${p}URL`];
  const user = process.env[`${p}API_USER`] ?? process.env[`${p}USER`];
  const secret = process.env[`${p}API_KEY`] ?? process.env[`${p}SECRET`];
  const internalUrl = process.env[`${p}INTERNAL_URL`];
  const authMode = (process.env[`${p}AUTH_MODE`] as RSConfig['authMode']) || 'apiKey';

  if (!baseUrl || !user || !secret) return null;

  const timeoutStr = process.env[`${p}TIMEOUT`];
  const maxBatchStr = process.env[`${p}MAX_BATCH_SIZE`];
  const signupGroupStr = process.env[`${p}SIGNUP_USERGROUP`];

  return {
    baseUrl,
    user,
    secret,
    authMode,
    ...(internalUrl ? { internalUrl } : {}),
    ...(timeoutStr ? { timeout: parseInt(timeoutStr, 10) } : {}),
    ...(maxBatchStr ? { maxBatchSize: parseInt(maxBatchStr, 10) } : {}),
    ...(signupGroupStr ? { signupUsergroup: parseInt(signupGroupStr, 10) } : {}),
  };
}
