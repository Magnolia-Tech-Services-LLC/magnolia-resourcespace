import type { RSClientCore } from '../core/client.js';
import type {
  Resource,
  ResourceFieldData,
  ResourcePathOptions,
  AlternativeFile,
} from '../core/types.js';
import { ensureArray, toNumber } from '../utils/response.js';
import { validateId } from '../core/errors.js';
import { assignCapability } from '../utils/assign-capability.js';

export interface ResourcesCapability {
  /** Get full resource metadata */
  getResource(ref: number): Promise<Resource | null>;

  /** Get specific field data for a resource */
  getResourceFieldData(ref: number, fieldId?: number): Promise<ResourceFieldData[]>;

  /**
   * Get a URL for a resource file/preview.
   * Returns the URL rewritten to internal Docker networking if configured.
   */
  getResourcePath(ref: number, options?: ResourcePathOptions): Promise<string>;

  /** Get activity log for a resource */
  getResourceLog(ref: number): Promise<unknown[]>;

  /** Get resources related to a specific resource */
  getRelatedResources(ref: number): Promise<Resource[]>;

  /** Get alternative files for a resource */
  getAlternativeFiles(ref: number): Promise<AlternativeFile[]>;

  /** Create a new resource. Returns the new resource ID. */
  createResource(resourceType: number, archive?: number): Promise<number>;

  /** Copy/duplicate a resource. Returns the new resource ID. */
  copyResource(ref: number): Promise<number>;

  /** Delete a resource permanently. */
  deleteResource(ref: number): Promise<boolean>;
}

/**
 * Add resource operations to an RS client.
 */
export function withResources<T extends RSClientCore>(client: T): T & ResourcesCapability {
  const methods: ResourcesCapability = {
    async getResource(ref: number): Promise<Resource | null> {
      validateId(ref, 'resource ref');
      const data = await client.makeRequest<Resource | null>('get_resource_data', {
        resource: ref.toString(),
      });
      return data || null;
    },

    async getResourceFieldData(ref: number, fieldId?: number): Promise<ResourceFieldData[]> {
      validateId(ref, 'resource ref');
      if (fieldId !== undefined) validateId(fieldId, 'field ID');
      const params: Record<string, string | number> = { resource: ref.toString() };
      if (fieldId !== undefined) params.field = fieldId;

      const data = await client.makeRequest<ResourceFieldData | ResourceFieldData[]>(
        'get_resource_field_data',
        params,
      );
      if (!data) return [];
      return Array.isArray(data) ? data : [data];
    },

    async getResourcePath(ref: number, options: ResourcePathOptions = {}): Promise<string> {
      validateId(ref, 'resource ref');
      const {
        size = 'pre',
        watermarked,
        createIfMissing = true,
        extension,
        page,
      } = options;

      // RS get_resource_path params (positional):
      // $ref, $not_used (N/A), $size, $generate (0|1), $extension, $page, $watermarked (0|1)
      const params: Record<string, string | number> = {
        ref: ref.toString(),
        size,
        generate: createIfMissing ? 1 : 0,
      };
      if (extension !== undefined) params.extension = extension;
      if (page !== undefined) params.page = page;
      if (watermarked !== undefined) params.watermarked = watermarked ? 1 : 0;

      const path = await client.makeRequest<string | null>('get_resource_path', params);

      if (!path || typeof path !== 'string' || path.trim() === '') return '';

      // Check for error-like strings
      const lower = path.toLowerCase();
      if (lower.includes('error') || lower.includes('not found') || lower.includes('invalid')) {
        return '';
      }

      // If full URL, apply internal URL rewriting
      if (path.startsWith('http://') || path.startsWith('https://')) {
        return client.rewriteUrl(path);
      }

      // Construct full URL from base
      const baseUrl = client.config.baseUrl.replace(/\/api\/?$/, '').replace(/\/+$/, '');
      const normalizedPath = path.startsWith('/') ? path : `/${path}`;
      return `${baseUrl}${normalizedPath}`;
    },

    async getResourceLog(ref: number): Promise<unknown[]> {
      validateId(ref, 'resource ref');
      const data = await client.makeRequest<unknown[]>('get_resource_log', {
        resource: ref.toString(),
      });
      return ensureArray(data);
    },

    async getRelatedResources(ref: number): Promise<Resource[]> {
      validateId(ref, 'resource ref');
      // RS get_related_resources param: $ref
      const data = await client.makeRequest<Resource[]>('get_related_resources', {
        ref: ref.toString(),
      });
      return ensureArray<Resource>(data);
    },

    async getAlternativeFiles(ref: number): Promise<AlternativeFile[]> {
      validateId(ref, 'resource ref');
      const data = await client.makeRequest<AlternativeFile[]>('get_alternative_files', {
        resource: ref.toString(),
      });
      return ensureArray<AlternativeFile>(data);
    },

    async createResource(resourceType: number, archive?: number): Promise<number> {
      validateId(resourceType, 'resource type');
      const params: Record<string, string | number> = {
        resource_type: resourceType,
      };
      if (archive !== undefined) params.archive = archive;

      const result = await client.makeRequest<number | { ref: number }>('create_resource', params);
      const ref = typeof result === 'object' && result !== null ? toNumber(result.ref) : toNumber(result);
      if (ref === null) throw new Error('create_resource returned invalid ref');
      return ref;
    },

    async copyResource(ref: number): Promise<number> {
      validateId(ref, 'resource ref');
      const result = await client.makeRequest<number | { ref: number }>('copy_resource', {
        from: ref.toString(),
      });
      const newRef = typeof result === 'object' && result !== null ? toNumber(result.ref) : toNumber(result);
      if (newRef === null) throw new Error('copy_resource returned invalid ref');
      return newRef;
    },

    async deleteResource(ref: number): Promise<boolean> {
      validateId(ref, 'resource ref');
      const result = await client.makeRequest<unknown>('delete_resource', {
        resource: ref.toString(),
      });
      return result !== false;
    },
  };

  return assignCapability(client, methods);
}
