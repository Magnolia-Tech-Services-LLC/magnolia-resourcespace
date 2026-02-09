import crypto from 'node:crypto';

/**
 * Generate a ResourceSpace API signature.
 *
 * Both API key and session key authentication use the same algorithm:
 *   SHA256(secret + queryString)
 *
 * See ResourceSpace api_functions.php check_api_key() — it hashes
 * the userkey + querystring regardless of whether authmode is
 * 'userkey' (API key) or 'sessionkey'.
 */
export function generateSignature(secret: string, queryString: string): string {
  return crypto
    .createHash('sha256')
    .update(secret + queryString)
    .digest('hex');
}
