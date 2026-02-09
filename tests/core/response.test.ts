import { describe, it, expect } from 'vitest';
import { normalizeResponse, ensureArray, toNumber } from '../../src/utils/response.js';
import { ResourceSpaceError, PermissionError } from '../../src/core/errors.js';

describe('normalizeResponse', () => {
  it('passes through objects unchanged', () => {
    const data = { ref: 1, name: 'test' };
    expect(normalizeResponse(data, 'test')).toEqual(data);
  });

  it('passes through arrays unchanged', () => {
    const data = [{ ref: 1 }, { ref: 2 }];
    expect(normalizeResponse(data, 'test')).toEqual(data);
  });

  it('returns null for null/undefined', () => {
    expect(normalizeResponse(null, 'test')).toBeNull();
    expect(normalizeResponse(undefined, 'test')).toBeNull();
  });

  it('parses JSON-encoded strings', () => {
    const data = JSON.stringify({ ref: 42, name: 'resource' });
    expect(normalizeResponse(data, 'test')).toEqual({ ref: 42, name: 'resource' });
  });

  it('returns non-JSON strings as-is (e.g. URLs from get_resource_path)', () => {
    const url = 'https://dam.example.com/pages/download.php?ref=42';
    expect(normalizeResponse(url, 'get_resource_path')).toBe(url);
  });

  it('throws PermissionError for "permission denied" strings', () => {
    expect(() => normalizeResponse('Permission denied for this resource', 'do_search'))
      .toThrow(PermissionError);
  });

  it('throws PermissionError for "access denied" strings', () => {
    expect(() => normalizeResponse('Access denied', 'get_resource_data'))
      .toThrow(PermissionError);
  });

  it('throws ResourceSpaceError for "error:" strings', () => {
    expect(() => normalizeResponse('Error: Invalid function', 'bad_function'))
      .toThrow(ResourceSpaceError);
  });

  it('throws ResourceSpaceError for error objects', () => {
    expect(() => normalizeResponse({ error: 'Something went wrong' }, 'test'))
      .toThrow(ResourceSpaceError);
  });
});

describe('ensureArray', () => {
  it('returns arrays as-is', () => {
    expect(ensureArray([1, 2, 3])).toEqual([1, 2, 3]);
  });

  it('returns empty array for null/undefined', () => {
    expect(ensureArray(null)).toEqual([]);
    expect(ensureArray(undefined)).toEqual([]);
  });

  it('unwraps {resources: [...]} format', () => {
    expect(ensureArray({ resources: [{ ref: 1 }] })).toEqual([{ ref: 1 }]);
  });

  it('unwraps {data: [...]} format', () => {
    expect(ensureArray({ data: [{ ref: 1 }] })).toEqual([{ ref: 1 }]);
  });

  it('returns empty array for unrecognized objects', () => {
    expect(ensureArray({ foo: 'bar' })).toEqual([]);
  });
});

describe('toNumber', () => {
  it('converts string numbers', () => {
    expect(toNumber('42')).toBe(42);
  });

  it('passes through numbers', () => {
    expect(toNumber(42)).toBe(42);
  });

  it('returns null for null/undefined', () => {
    expect(toNumber(null)).toBeNull();
    expect(toNumber(undefined)).toBeNull();
  });

  it('returns null for non-numeric strings', () => {
    expect(toNumber('abc')).toBeNull();
  });
});
