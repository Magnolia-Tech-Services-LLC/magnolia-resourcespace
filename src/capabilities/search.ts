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
      const params: Record<string, string | number | boolean> = {
        search: query,
        order_by: orderBy,
        offset,
        fetchrows: limit,
      };

      if (sort) params.sort = sort;
      if (resourceTypes) params.restypes = resourceTypes;
      if (archive !== undefined) params.archive = archive;
      if (dataJoins && dataJoins.length > 0) {
        params.data_joins = dataJoins.join(',');
      }

      const resources = await client.makeRequest<Resource[]>('do_search', params);
      const result = ensureArray<Resource>(resources);

      return {
        resources: result,
        count: result.length,
        offset,
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
