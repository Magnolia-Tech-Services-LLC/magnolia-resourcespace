import { describe, it, expect, afterEach, vi } from 'vitest';
import { withResources } from '../../src/capabilities/resources.js';
import { mockFetch, getCapturedParams, createTestCore } from '../helpers.js';
import { ResourceSpaceError } from '../../src/core/errors.js';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('withResources', () => {
  describe('getResource()', () => {
    it('calls get_resource_data with resource param', async () => {
      const mock = mockFetch({ ref: 42, resource_type: 1 });
      const client = withResources(createTestCore());

      const result = await client.getResource(42);

      const params = getCapturedParams(mock);
      expect(params.get('function')).toBe('get_resource_data');
      expect(params.get('resource')).toBe('42');
      expect(result?.ref).toBe(42);
    });

    it('returns null for null/empty response', async () => {
      mockFetch(null);
      const client = withResources(createTestCore());

      const result = await client.getResource(999);

      expect(result).toBeNull();
    });
  });

  describe('getResourcePath()', () => {
    it('passes correct RS parameter names', async () => {
      const mock = mockFetch('"https://dam.example.com/filestore/1/pre.jpg"');
      const client = withResources(createTestCore());

      await client.getResourcePath(42);

      const params = getCapturedParams(mock);
      expect(params.get('function')).toBe('get_resource_path');
      expect(params.get('ref')).toBe('42');
      expect(params.get('size')).toBe('pre');
      expect(params.get('generate')).toBe('1'); // boolean → 1/0
      expect(params.has('getfilepath')).toBe(false); // removed invalid param
    });

    it('passes generate=0 when createIfMissing is false', async () => {
      const mock = mockFetch('"https://dam.example.com/filestore/1/pre.jpg"');
      const client = withResources(createTestCore());

      await client.getResourcePath(42, { createIfMissing: false });

      const params = getCapturedParams(mock);
      expect(params.get('generate')).toBe('0');
    });

    it('does not hardcode extension and page', async () => {
      const mock = mockFetch('"https://dam.example.com/filestore/1/pre.jpg"');
      const client = withResources(createTestCore());

      await client.getResourcePath(42);

      const params = getCapturedParams(mock);
      expect(params.has('extension')).toBe(false); // not hardcoded
      expect(params.has('page')).toBe(false); // not hardcoded
    });

    it('passes extension and page when provided', async () => {
      const mock = mockFetch('"https://dam.example.com/filestore/1/pre.png"');
      const client = withResources(createTestCore());

      await client.getResourcePath(42, { extension: 'png', page: 3 });

      const params = getCapturedParams(mock);
      expect(params.get('extension')).toBe('png');
      expect(params.get('page')).toBe('3');
    });

    it('applies internal URL rewriting', async () => {
      mockFetch('"https://dam.example.com/filestore/1/pre.jpg"');
      const client = withResources(createTestCore({
        internalUrl: 'http://rs-internal:80/api/',
      }));

      const result = await client.getResourcePath(42);

      expect(result).toContain('rs-internal');
    });

    it('throws ResourceSpaceError for error responses', async () => {
      mockFetch('"error: resource not found"');
      const client = withResources(createTestCore());

      // Error strings are caught by the response normalizer and thrown
      await expect(client.getResourcePath(999)).rejects.toThrow(ResourceSpaceError);
    });

    it('returns empty string for empty/null response', async () => {
      mockFetch(null);
      const client = withResources(createTestCore());

      const result = await client.getResourcePath(999);

      expect(result).toBe('');
    });
  });

  describe('getResourceFieldData()', () => {
    it('calls get_resource_field_data', async () => {
      const mock = mockFetch([{ ref: 1, name: 'title', value: 'Test' }]);
      const client = withResources(createTestCore());

      const result = await client.getResourceFieldData(42);

      const params = getCapturedParams(mock);
      expect(params.get('function')).toBe('get_resource_field_data');
      expect(params.get('resource')).toBe('42');
      expect(result).toHaveLength(1);
      expect(result[0].value).toBe('Test');
    });
  });

  describe('createResource()', () => {
    it('calls create_resource and returns ref', async () => {
      const mock = mockFetch(123);
      const client = withResources(createTestCore());

      const ref = await client.createResource(1);

      const params = getCapturedParams(mock);
      expect(params.get('function')).toBe('create_resource');
      expect(params.get('resource_type')).toBe('1');
      expect(ref).toBe(123);
    });
  });

  describe('deleteResource()', () => {
    it('calls delete_resource', async () => {
      const mock = mockFetch(true);
      const client = withResources(createTestCore());

      const result = await client.deleteResource(42);

      const params = getCapturedParams(mock);
      expect(params.get('function')).toBe('delete_resource');
      expect(params.get('resource')).toBe('42');
      expect(result).toBe(true);
    });
  });
});
