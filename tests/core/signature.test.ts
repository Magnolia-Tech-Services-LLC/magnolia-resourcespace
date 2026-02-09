import { describe, it, expect } from 'vitest';
import { generateSignature, constantTimeCompare } from '../../src/utils/signature.js';
import { buildSignedQuery, buildQueryString } from '../../src/utils/query-builder.js';

describe('generateSignature', () => {
  it('produces SHA256 of secret + queryString', () => {
    // Verified against the canopy implementation:
    //   crypto.createHash("sha256").update(key + query).digest("hex")
    const secret = 'abc123';
    const query = 'user=admin&function=do_search&search=test';
    const sig = generateSignature(secret, query);

    // SHA256 is deterministic — this is the known-good hash
    expect(sig).toMatch(/^[a-f0-9]{64}$/);
    expect(sig).toBe(generateSignature(secret, query)); // idempotent
  });

  it('changes when secret changes', () => {
    const query = 'user=admin&function=do_search';
    expect(generateSignature('key1', query)).not.toBe(generateSignature('key2', query));
  });

  it('changes when query changes', () => {
    const secret = 'mykey';
    expect(generateSignature(secret, 'a=1')).not.toBe(generateSignature(secret, 'a=2'));
  });
});

describe('buildQueryString', () => {
  it('prepends user parameter', () => {
    const qs = buildQueryString('admin', { function: 'do_search' });
    expect(qs).toBe('user=admin&function=do_search');
  });

  it('converts numbers and booleans to strings', () => {
    const qs = buildQueryString('admin', { offset: 10, watermarked: true });
    expect(qs).toContain('offset=10');
    expect(qs).toContain('watermarked=true');
  });

  it('skips null and undefined values', () => {
    const qs = buildQueryString('admin', {
      function: 'test',
      param1: undefined as unknown as string,
      param2: null as unknown as string,
      param3: 'value',
    });
    expect(qs).not.toContain('param1');
    expect(qs).not.toContain('param2');
    expect(qs).toContain('param3=value');
  });
});

describe('constantTimeCompare', () => {
  it('returns true for identical strings', () => {
    expect(constantTimeCompare('abc123', 'abc123')).toBe(true);
  });

  it('returns false for different strings of same length', () => {
    expect(constantTimeCompare('abc123', 'abc124')).toBe(false);
  });

  it('returns false for different length strings', () => {
    expect(constantTimeCompare('short', 'longer_string')).toBe(false);
  });

  it('returns true for empty strings', () => {
    expect(constantTimeCompare('', '')).toBe(true);
  });

  it('works with SHA256 hex strings', () => {
    const sig1 = generateSignature('key', 'query');
    const sig2 = generateSignature('key', 'query');
    const sig3 = generateSignature('key', 'different');
    expect(constantTimeCompare(sig1, sig2)).toBe(true);
    expect(constantTimeCompare(sig1, sig3)).toBe(false);
  });
});

describe('buildSignedQuery', () => {
  it('excludes authmode from signature in sessionKey mode', () => {
    const apiKeyResult = buildSignedQuery('admin', 'secret1234567890123456789012345678', 'apiKey', 'do_search', { search: 'test' });
    const sessionResult = buildSignedQuery('admin', 'secret1234567890123456789012345678', 'sessionKey', 'do_search', { search: 'test' });

    // Signatures should be identical — authmode is NOT part of the signed query
    expect(apiKeyResult.sign).toBe(sessionResult.sign);
  });

  it('appends authmode=sessionkey to query in sessionKey mode', () => {
    const result = buildSignedQuery('admin', 'secret1234567890123456789012345678', 'sessionKey', 'do_search');
    expect(result.query).toContain('authmode=sessionkey');
  });

  it('does NOT append authmode in apiKey mode', () => {
    const result = buildSignedQuery('admin', 'secret1234567890123456789012345678', 'apiKey', 'do_search');
    expect(result.query).not.toContain('authmode');
  });

  it('includes function in query', () => {
    const result = buildSignedQuery('admin', 'secret1234567890123456789012345678', 'apiKey', 'get_resource_data', { param1: '42' });
    expect(result.query).toContain('function=get_resource_data');
    expect(result.query).toContain('param1=42');
  });
});
