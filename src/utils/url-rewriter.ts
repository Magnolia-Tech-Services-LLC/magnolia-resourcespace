/**
 * Rewrite an external RS URL to use internal Docker networking.
 *
 * ResourceSpace returns absolute URLs using its configured $baseurl (e.g.
 * https://dam.example.com/pages/download.php?...). When the client
 * and RS are on the same Docker network, we can route these requests
 * internally via the container alias instead of going through the public
 * internet (which causes hairpin NAT latency and intermittent DNS failures).
 *
 * @param url - The URL returned by ResourceSpace
 * @param externalBaseUrl - The external RS base URL (e.g. "https://dam.example.com/api/")
 * @param internalBaseUrl - The internal Docker URL (e.g. "http://resourcespace-web/api")
 * @returns The rewritten URL, or the original if no rewriting is needed
 */
export function rewriteToInternalUrl(
  url: string,
  externalBaseUrl: string,
  internalBaseUrl?: string,
): string {
  if (!internalBaseUrl) return url;

  // Strip /api/ suffix to get the base domain
  const externalBase = externalBaseUrl.replace(/\/api\/?$/, '').replace(/\/+$/, '');
  if (!externalBase || !url.startsWith(externalBase)) return url;

  const internalBase = internalBaseUrl.replace(/\/api\/?$/, '').replace(/\/+$/, '');
  return internalBase + url.slice(externalBase.length);
}
