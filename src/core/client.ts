import type { RSConfig, RSLogger } from './types.js';
import { ResourceSpaceError, PermissionError } from './errors.js';
import { validateConfig } from './config.js';
import { buildSignedQuery } from '../utils/query-builder.js';
import { normalizeResponse } from '../utils/response.js';
import { rewriteToInternalUrl } from '../utils/url-rewriter.js';

/** Silent logger used when no logger is provided */
const noopLogger: RSLogger = {
  debug() {},
  info() {},
  warn() {},
  error() {},
};

/** Fields that must NEVER appear in log output */
const SENSITIVE_PARAM_KEYS = new Set(['password', 'secret', 'key', 'session_key']);

/** Redact sensitive values from params before logging */
function redactParams(params: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(params)) {
    result[k] = SENSITIVE_PARAM_KEYS.has(k) ? '***' : v;
  }
  return result;
}

/**
 * Core ResourceSpace client.
 *
 * Handles authentication, request signing, HTTP transport, and response
 * normalization. Does NOT expose any RS API methods directly — those are
 * added via capability mixins (withSearch, withResources, etc.).
 *
 * All requests use GET because ResourceSpace validates signatures against
 * $_SERVER["QUERY_STRING"], which is empty for POST body requests.
 */
export class RSClientCore {
  /** Validated configuration with defaults applied */
  readonly config: ReturnType<typeof validateConfig>;
  readonly log: RSLogger;

  constructor(config: RSConfig) {
    this.config = validateConfig(config);
    this.log = config.logger ?? noopLogger;
  }

  /**
   * Make an authenticated request to the ResourceSpace API.
   *
   * @param functionName - RS API function name (e.g. "do_search", "get_resource_data")
   * @param params - Function parameters (param1, param2, etc. or named params)
   * @returns Normalized response of type T
   */
  async makeRequest<T>(
    functionName: string,
    params: Record<string, string | number | boolean> = {},
  ): Promise<T> {
    const { query, sign } = buildSignedQuery(
      this.config.user,
      this.config.secret,
      this.config.authMode,
      functionName,
      params,
    );

    // Use internal URL for the request if configured
    const requestBaseUrl = this.config.internalUrl || this.config.baseUrl;
    // Ensure base URL ends with /api/ or similar
    const base = requestBaseUrl.replace(/\/+$/, '');
    const url = `${base}/?${query}&sign=${sign}`;

    this.log.debug(`RS API request: ${functionName}`, {
      function: functionName,
      authMode: this.config.authMode,
      user: this.config.user,
      params: redactParams(params),
    });

    try {
      const response = await fetch(url, {
        method: 'GET',
        signal: AbortSignal.timeout(this.config.timeout),
        headers: {
          'Accept': 'application/json',
        },
      });

      if (response.status >= 500) {
        throw new ResourceSpaceError(
          `ResourceSpace server error: ${response.status}`,
          functionName,
          response.status,
        );
      }

      // Treat 401/403 as permission errors rather than silently passing through.
      // RS returns 403 with `[]` for functions requiring permissions the user lacks
      // (e.g. get_resource_type_fields needs permission 'a'). Without this check,
      // the empty array is treated as a valid (but empty) response, poisoning caches.
      if (response.status === 401 || response.status === 403) {
        throw new PermissionError(functionName, `HTTP ${response.status}`);
      }

      // Read response body as text first, then normalize
      const text = await response.text();
      let data: unknown;
      try {
        data = JSON.parse(text);
      } catch {
        // Not JSON — pass raw text to normalizer
        data = text;
      }

      const result = normalizeResponse<T>(data, functionName);

      this.log.debug(`RS API response: ${functionName}`, {
        function: functionName,
        status: response.status,
        dataType: typeof result,
        isArray: Array.isArray(result),
      });

      return result;
    } catch (error) {
      if (error instanceof ResourceSpaceError) throw error;

      const message = error instanceof Error ? error.message : String(error);
      this.log.error(`RS API error: ${functionName}`, error, {
        function: functionName,
        error: message,
      });

      throw new ResourceSpaceError(
        `API request failed: ${functionName} — ${message}`,
        functionName,
        undefined,
        undefined,
        error,
      );
    }
  }

  /**
   * Rewrite an RS-returned URL to use internal Docker networking.
   * No-op if internalUrl is not configured.
   */
  rewriteUrl(url: string): string {
    return rewriteToInternalUrl(url, this.config.baseUrl, this.config.internalUrl);
  }
}
