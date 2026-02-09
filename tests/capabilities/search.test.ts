import { describe, it, expect, afterEach, vi } from 'vitest';
import { withSearch } from '../../src/capabilities/search.js';
import { mockFetch, getCapturedParams, createTestCore } from '../helpers.js';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('withSearch', () => {
  describe('search()', () => {
    it('calls do_search with correct RS parameter names', async () => {
      const mock = mockFetch([{ ref: 1 }, { ref: 2 }]);
      const client = withSearch(createTestCore());

      await client.search('landscape', { limit: 10, offset: 5 });

      const params = getCapturedParams(mock);
      expect(params.get('function')).toBe('do_search');
      expect(params.get('search')).toBe('landscape');
      expect(params.get('fetchrows')).toBe('10'); // NOT "limit"
      expect(params.get('offset')).toBe('5');
      expect(params.get('order_by')).toBe('relevance');
    });

    it('returns count (not total) representing page size', async () => {
      mockFetch([{ ref: 1 }, { ref: 2 }, { ref: 3 }]);
      const client = withSearch(createTestCore());

      const result = await client.search('test');

      expect(result.count).toBe(3);
      expect(result.resources).toHaveLength(3);
      expect(result.offset).toBe(0);
    });

    it('passes resourceTypes as restypes', async () => {
      const mock = mockFetch([]);
      const client = withSearch(createTestCore());

      await client.search('test', { resourceTypes: '1,2,3' });

      const params = getCapturedParams(mock);
      expect(params.get('restypes')).toBe('1,2,3');
    });

    it('passes data_joins as comma-separated field IDs', async () => {
      const mock = mockFetch([]);
      const client = withSearch(createTestCore());

      await client.search('test', { dataJoins: [8, 3, 12] });

      const params = getCapturedParams(mock);
      expect(params.get('data_joins')).toBe('8,3,12');
    });

    it('handles empty results', async () => {
      mockFetch([]);
      const client = withSearch(createTestCore());

      const result = await client.search('nonexistent');

      expect(result.resources).toEqual([]);
      expect(result.count).toBe(0);
    });

    it('handles null response (RS returns null for no results)', async () => {
      mockFetch(null);
      const client = withSearch(createTestCore());

      const result = await client.search('nothing');

      expect(result.resources).toEqual([]);
      expect(result.count).toBe(0);
    });
  });

  describe('searchByField()', () => {
    it('constructs RS field search syntax', async () => {
      const mock = mockFetch([{ ref: 42 }]);
      const client = withSearch(createTestCore());

      await client.searchByField(8, 'sunset');

      const params = getCapturedParams(mock);
      expect(params.get('search')).toBe('!field8=sunset');
      expect(params.get('function')).toBe('do_search');
    });

    it('uses fetchrows not limit', async () => {
      const mock = mockFetch([]);
      const client = withSearch(createTestCore());

      await client.searchByField(3, 'value', { limit: 50 });

      const params = getCapturedParams(mock);
      expect(params.get('fetchrows')).toBe('50');
      expect(params.has('limit')).toBe(false);
    });
  });
});
