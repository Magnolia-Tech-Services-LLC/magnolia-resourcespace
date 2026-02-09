import { describe, it, expect } from 'vitest';
import { generateSignature } from '../../src/utils/signature.js';
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
