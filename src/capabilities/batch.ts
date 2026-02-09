import type { RSClientCore } from '../core/client.js';
import { BatchSizeLimitError, validateId } from '../core/errors.js';
import { assignCapability } from '../utils/assign-capability.js';

export interface BatchCapability {
  /** Update a field value on multiple resources at once. */
  batchFieldUpdate(resourceIds: number[], fieldId: number, value: string): Promise<boolean>;

  /** Delete multiple resources. */
  batchDelete(resourceIds: number[]): Promise<boolean>;

  /** Add multiple resources to a collection. */
  batchCollectionAdd(collectionId: number, resourceIds: number[]): Promise<boolean>;

  /** Remove multiple resources from a collection. */
  batchCollectionRemove(collectionId: number, resourceIds: number[]): Promise<boolean>;

  /** Add nodes (keywords/categories) to multiple resources. */
  batchNodesAdd(resourceIds: number[], nodeIds: number[]): Promise<boolean>;

  /**
   * Remove nodes from multiple resources.
   * @note Uses `remove_resource_nodes` which is not in the official RS API index.
   */
  batchNodesRemove(resourceIds: number[], nodeIds: number[]): Promise<boolean>;

  /**
   * Update archive status for multiple resources.
   * @note Uses `update_resource_archive_status` which is not in the official RS API index.
   */
  batchArchiveStatus(resourceIds: number[], archiveStatus: number): Promise<boolean>;
}

function enforceLimit(ids: number[], max: number): void {
  if (ids.length > max) {
    throw new BatchSizeLimitError(ids.length, max);
  }
}

function validateIds(ids: number[], name: string): void {
  for (const id of ids) {
    validateId(id, name);
  }
}

export function withBatch<T extends RSClientCore>(client: T): T & BatchCapability {
  const max = client.config.maxBatchSize ?? 100;

  const methods: BatchCapability = {
    async batchFieldUpdate(resourceIds: number[], fieldId: number, value: string): Promise<boolean> {
      enforceLimit(resourceIds, max);
      validateIds(resourceIds, 'resource ID');
      validateId(fieldId, 'field ID');
      const result = await client.makeRequest<unknown>('update_field', {
        resource: resourceIds.join(','),
        field: fieldId.toString(),
        value,
      });
      return result !== false;
    },

    async batchDelete(resourceIds: number[]): Promise<boolean> {
      enforceLimit(resourceIds, max);
      validateIds(resourceIds, 'resource ID');
      const result = await client.makeRequest<unknown>('delete_resource', {
        resource: resourceIds.join(','),
      });
      return result !== false;
    },

    async batchCollectionAdd(collectionId: number, resourceIds: number[]): Promise<boolean> {
      enforceLimit(resourceIds, max);
      validateId(collectionId, 'collection ID');
      validateIds(resourceIds, 'resource ID');
      for (const id of resourceIds) {
        await client.makeRequest<unknown>('add_resource_to_collection', {
          resource: id.toString(),
          collection: collectionId.toString(),
        });
      }
      return true;
    },

    async batchCollectionRemove(collectionId: number, resourceIds: number[]): Promise<boolean> {
      enforceLimit(resourceIds, max);
      validateId(collectionId, 'collection ID');
      validateIds(resourceIds, 'resource ID');
      for (const id of resourceIds) {
        await client.makeRequest<unknown>('remove_resource_from_collection', {
          resource: id.toString(),
          collection: collectionId.toString(),
        });
      }
      return true;
    },

    async batchNodesAdd(resourceIds: number[], nodeIds: number[]): Promise<boolean> {
      enforceLimit(resourceIds, max);
      validateIds(resourceIds, 'resource ID');
      validateIds(nodeIds, 'node ID');
      // RS add_resource_nodes_multi params: $resourceid (CSV), $nodes (CSV)
      // Handles multiple resources + multiple nodes in a single call
      const result = await client.makeRequest<unknown>('add_resource_nodes_multi', {
        resourceid: resourceIds.join(','),
        nodes: nodeIds.join(','),
      });
      return result !== false;
    },

    async batchNodesRemove(resourceIds: number[], nodeIds: number[]): Promise<boolean> {
      enforceLimit(resourceIds, max);
      validateIds(resourceIds, 'resource ID');
      validateIds(nodeIds, 'node ID');
      // remove_resource_nodes is not a documented API endpoint.
      // Fall back to per-resource calls with comma-separated node IDs.
      const nodestring = nodeIds.join(',');
      for (const rid of resourceIds) {
        await client.makeRequest<unknown>('remove_resource_nodes', {
          resource: rid.toString(),
          nodestring,
        });
      }
      return true;
    },

    async batchArchiveStatus(resourceIds: number[], archiveStatus: number): Promise<boolean> {
      enforceLimit(resourceIds, max);
      validateIds(resourceIds, 'resource ID');
      const result = await client.makeRequest<unknown>('update_resource_archive_status', {
        resource: resourceIds.join(','),
        archive: archiveStatus.toString(),
      });
      return result !== false;
    },
  };

  return assignCapability(client, methods);
}
