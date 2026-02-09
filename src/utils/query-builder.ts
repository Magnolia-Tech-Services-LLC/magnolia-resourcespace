import type { AuthMode } from '../core/types.js';
import { generateSignature } from './signature.js';

/**
 * Build a query string with `user` prepended.
 * Parameter ordering matters — RS validates signatures against the exact
 * query string sent, so we always prepend `user` first, then function params.
 */
export function buildQueryString(
  user: string,
  params: Record<string, string | number | boolean>,
): string {
  const qs = new URLSearchParams();
  qs.append('user', user);

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) {
      qs.append(key, String(value));
    }
  }

  return qs.toString();
}

/**
 * Build the full signed query string for an RS API request.
 *
 * IMPORTANT: `authmode=sessionkey` is added AFTER the signature is computed.
 * ResourceSpace strips authmode from the query before validating the signature.
 * See api/index.php: str_ireplace("authmode=" . $query_params['authmode'], "!|!|", $query)
 */
export function buildSignedQuery(
  user: string,
  secret: string,
  authMode: AuthMode,
  functionName: string,
  params: Record<string, string | number | boolean> = {},
): { query: string; sign: string } {
  const allParams = { function: functionName, ...params };

  // Build query WITHOUT authmode for signature calculation
  const queryForSignature = buildQueryString(user, allParams);
  const sign = generateSignature(secret, queryForSignature);

  // Add authmode to the actual query (after signature is computed)
  const query =
    authMode === 'sessionKey'
      ? `${queryForSignature}&authmode=sessionkey`
      : queryForSignature;

  return { query, sign };
}
