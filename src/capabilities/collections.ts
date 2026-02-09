import type { RSClientCore } from '../core/client.js';
import type { Resource, Collection, SearchOptions, CreateCollectionParams } from '../core/types.js';
import { ensureArray, toNumber } from '../utils/response.js';

export interface CollectionsCapability {
  /** Get collections for the current user (or specified user). */
  getCollections(userId?: number): Promise<Collection[]>;

  /**
   * Get resources in a collection, respecting collection sort order.
   * Uses do_search with `!collection<ID>` + `order_by=collection`.
   */
  getCollectionResources(collectionId: number, options?: SearchOptions): Promise<Resource[]>;

  /** Get all featured (public) collections. */
  getAllFeaturedCollections(): Promise<Collection[]>;

  /** Get featured collections by parent category. */
  getFeaturedCollections(parent: number): Promise<Collection[]>;

  /** Search public collections. */
  searchCollections(query: string): Promise<Collection[]>;

  /** Create a new collection. Returns the collection ID. */
  createCollection(params: CreateCollectionParams): Promise<number>;

  /** Delete a collection. */
  deleteCollection(collectionId: number): Promise<boolean>;

  /** Add a resource to a collection. */
  addToCollection(collectionId: number, resourceId: number): Promise<boolean>;

  /** Remove a resource from a collection. */
  removeFromCollection(collectionId: number, resourceId: number): Promise<boolean>;

  /**
   * Share a collection via email.
   * @note Uses `collection_email` which is not in the official RS API index.
   * The internal RS function is `email_collection()`.
   */
  shareCollection(collectionId: number, emails: string[], message?: string): Promise<boolean>;
}

/** Normalize RS collection rows (ref/parent often come as strings). */
function normalizeCollection(row: Record<string, unknown>): Collection {
  return {
    ...row,
    ref: toNumber(row.ref as string | number) ?? 0,
    parent: row.parent === null ? null : (toNumber(row.parent as string | number) ?? null),
    order_by: row.order_by !== undefined
      ? (toNumber(row.order_by as string | number) ?? undefined)
      : undefined,
  } as Collection;
}

export function withCollections<T extends RSClientCore>(client: T): T & CollectionsCapability {
  const methods: CollectionsCapability = {
    async getCollections(userId?: number): Promise<Collection[]> {
      const params: Record<string, string | number> = {};
      if (userId !== undefined) params.user = userId;
      const data = await client.makeRequest<unknown[]>('get_user_collections', params);
      return ensureArray<Record<string, unknown>>(data).map(normalizeCollection);
    },

    async getCollectionResources(collectionId: number, options: SearchOptions = {}): Promise<Resource[]> {
      const { limit = 9999, dataJoins } = options;
      // Uses do_search with collection syntax; param is $fetchrows not $limit
      const params: Record<string, string | number | boolean> = {
        search: `!collection${collectionId}`,
        order_by: 'collection',
        sort: 'ASC',
        offset: 0,
        fetchrows: limit,
      };
      if (dataJoins && dataJoins.length > 0) {
        params.data_joins = dataJoins.join(',');
      }
      const data = await client.makeRequest<Resource[]>('do_search', params);
      return ensureArray<Resource>(data);
    },

    async getAllFeaturedCollections(): Promise<Collection[]> {
      const data = await client.makeRequest<unknown[]>('get_all_featured_collections', {});
      return ensureArray<Record<string, unknown>>(data)
        .map(normalizeCollection)
        .filter(c => Number.isFinite(c.ref));
    },

    async getFeaturedCollections(parent: number): Promise<Collection[]> {
      const data = await client.makeRequest<unknown[]>('get_featured_collections', {
        parent: parent.toString(),
      });
      return ensureArray<Record<string, unknown>>(data)
        .map(normalizeCollection)
        .filter(c => Number.isFinite(c.ref));
    },

    async searchCollections(query: string): Promise<Collection[]> {
      const data = await client.makeRequest<unknown[]>('search_public_collections', {
        search: query,
      });
      return ensureArray<Record<string, unknown>>(data).map(normalizeCollection);
    },

    async createCollection(params: CreateCollectionParams): Promise<number> {
      // RS create_collection params: $name, $forupload
      // Note: public/allow_changes are NOT documented API params.
      // Set these properties after creation if needed.
      const reqParams: Record<string, string | number | boolean> = {
        name: params.name,
      };

      const result = await client.makeRequest<number | { ref: number }>('create_collection', reqParams);
      const ref = typeof result === 'object' && result !== null ? toNumber(result.ref) : toNumber(result);
      if (ref === null) throw new Error('create_collection returned invalid ref');
      return ref;
    },

    async deleteCollection(collectionId: number): Promise<boolean> {
      // RS delete_collection param: $collection
      const result = await client.makeRequest<unknown>('delete_collection', {
        collection: collectionId.toString(),
      });
      return result !== false;
    },

    async addToCollection(collectionId: number, resourceId: number): Promise<boolean> {
      const result = await client.makeRequest<unknown>('add_resource_to_collection', {
        resource: resourceId.toString(),
        collection: collectionId.toString(),
      });
      return result !== false;
    },

    async removeFromCollection(collectionId: number, resourceId: number): Promise<boolean> {
      const result = await client.makeRequest<unknown>('remove_resource_from_collection', {
        resource: resourceId.toString(),
        collection: collectionId.toString(),
      });
      return result !== false;
    },

    async shareCollection(collectionId: number, emails: string[], message?: string): Promise<boolean> {
      const params: Record<string, string | number> = {
        ref: collectionId.toString(),
        emails: emails.join(','),
      };
      if (message) params.message = message;
      const result = await client.makeRequest<unknown>('collection_email', params);
      return result !== false;
    },
  };

  return Object.assign(client, methods);
}
