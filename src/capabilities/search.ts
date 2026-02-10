import type { RSClientCore } from '../core/client.js';
import type { Resource, SearchResult, SearchOptions } from '../core/types.js';
import { ensureArray } from '../utils/response.js';
import { validateId } from '../core/errors.js';
import { assignCapability } from '../utils/assign-capability.js';

const DEFAULT_LIMIT = 24;

export interface SearchCapability {
  /**
   * Full-text search for resources.
   *
   * @param query - Search query (e.g. "sunset", "!collection42", "!field8=value")
   * @param options - Search options (offset, limit, orderBy, dataJoins, etc.)
   */
  search(query: string, options?: SearchOptions): Promise<SearchResult>;

  /**
   * Search by specific field value.
   * Uses RS's `!field<id>=<value>` syntax under the hood.
   */
  searchByField(fieldId: number, value: string, options?: SearchOptions): Promise<Resource[]>;
}

/**
 * Add search capabilities to an RS client.
 */
export function withSearch<T extends RSClientCore>(client: T): T & SearchCapability {
  const searchMethods: SearchCapability = {
    async search(query: string, options: SearchOptions = {}): Promise<SearchResult> {
      const {
        orderBy = 'relevance',
        sort,
        offset = 0,
        limit = DEFAULT_LIMIT,
        resourceTypes,
        archive,
        dataJoins,
      } = options;

      // RS do_search params: $search, $restypes, $order_by, $archive, $fetchrows, $sort, $offset
      // Request one extra row so we can detect whether more results exist
      // beyond this page (RS do_search only returns an array, no total count).
      const params: Record<string, string | number | boolean> = {
        search: query,
        order_by: orderBy,
        offset,
        fetchrows: limit + 1,
      };

      if (sort) params.sort = sort;
      if (resourceTypes) params.restypes = resourceTypes;
      if (archive !== undefined) params.archive = archive;
      if (dataJoins && dataJoins.length > 0) {
        params.data_joins = dataJoins.join(',');
      }

      const resources = await client.makeRequest<Resource[]>('do_search', params);
      const result = ensureArray<Resource>(resources);

      // If we got more than `limit`, there are additional results on the server.
      const hasMore = result.length > limit;
      const page = hasMore ? result.slice(0, limit) : result;

      return {
        resources: page,
        count: page.length,
        offset,
        hasMore,
      };
    },

    async searchByField(fieldId: number, value: string, options: SearchOptions = {}): Promise<Resource[]> {
      validateId(fieldId, 'field ID');
      const {
        orderBy = 'relevance',
        offset = 0,
        limit = DEFAULT_LIMIT,
        dataJoins,
      } = options;

      const params: Record<string, string | number | boolean> = {
        search: `!field${fieldId}=${value}`,
        order_by: orderBy,
        offset,
        fetchrows: limit,
      };

      if (dataJoins && dataJoins.length > 0) {
        params.data_joins = dataJoins.join(',');
      }

      const resources = await client.makeRequest<Resource[]>('do_search', params);
      return ensureArray<Resource>(resources);
    },
  };

  return assignCapability(client, searchMethods);
}
