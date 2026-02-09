import crypto from 'node:crypto';

/**
 * Generate a ResourceSpace API signature.
 *
 * SECURITY CRITICAL: Do not modify concatenation order (secret + queryString).
 * ResourceSpace validates signatures server-side using this exact format.
 * If comparing signatures client-side, use constantTimeCompare() to prevent timing attacks.
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

/**
 * Constant-time string comparison to prevent timing attacks.
 *
 * Use this when comparing signatures, tokens, or other secrets.
 * Standard string comparison (`===`) leaks information about how many
 * characters match through timing differences.
 *
 * Uses Node.js crypto.timingSafeEqual under the hood.
 */
export function constantTimeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    // Still perform a comparison to avoid leaking length info through timing
    const dummy = Buffer.alloc(a.length);
    crypto.timingSafeEqual(dummy, dummy);
    return false;
  }
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}
