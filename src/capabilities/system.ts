import type { RSClientCore } from '../core/client.js';
import type { ResourceType, SystemStatus } from '../core/types.js';
import { ensureArray } from '../utils/response.js';
import { assignCapability } from '../utils/assign-capability.js';

export interface SystemCapability {
  /** Get all available resource types. */
  getResourceTypes(): Promise<ResourceType[]>;

  /**
   * Get the RS API version string.
   * @note Uses `get_api_version` which is not in the official RS API index.
   */
  getApiVersion(): Promise<string>;

  /**
   * Get system health status.
   * @note Uses `get_system_status` which is not in the official RS API index.
   */
  getSystemStatus(): Promise<SystemStatus>;
}

export function withSystem<T extends RSClientCore>(client: T): T & SystemCapability {
  const methods: SystemCapability = {
    async getResourceTypes(): Promise<ResourceType[]> {
      const data = await client.makeRequest<ResourceType[]>('get_resource_types', {});
      return ensureArray<ResourceType>(data);
    },

    async getApiVersion(): Promise<string> {
      const result = await client.makeRequest<string>('get_api_version', {});
      return typeof result === 'string' ? result : '';
    },

    async getSystemStatus(): Promise<SystemStatus> {
      const data = await client.makeRequest<SystemStatus>('get_system_status', {});
      return data ?? {};
    },
  };

  return assignCapability(client, methods);
}
