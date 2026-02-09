import type { RSClientCore } from '../core/client.js';
import type { AlternativeFile } from '../core/types.js';
import { toNumber } from '../utils/response.js';
import { validateId } from '../core/errors.js';
import { assignCapability } from '../utils/assign-capability.js';

export interface UploadCapability {
  /**
   * Upload a file to an existing resource.
   * The filePath must be a path on disk local to the RS server, or a URL that RS can fetch.
   */
  uploadFile(resourceId: number, filePath: string, options?: {
    noExif?: boolean;
    autoRotate?: boolean;
    revert?: boolean;
  }): Promise<boolean>;

  /** Add an alternative file version to a resource. */
  addAlternativeFile(
    resourceId: number,
    name: string,
    description: string,
    filePath: string,
  ): Promise<number>;
}

export function withUpload<T extends RSClientCore>(client: T): T & UploadCapability {
  const methods: UploadCapability = {
    async uploadFile(resourceId: number, filePath: string, options: { noExif?: boolean; autoRotate?: boolean; revert?: boolean } = {}): Promise<boolean> {
      validateId(resourceId, 'resource ID');
      // RS upload_file params: $ref, $no_exif, $revert, $autorotate, $file_path
      const params: Record<string, string | number | boolean> = {
        ref: resourceId.toString(),
        file_path: filePath,
      };
      if (options.noExif) params.no_exif = 1;
      if (options.autoRotate) params.autorotate = 1;
      if (options.revert) params.revert = 1;

      const result = await client.makeRequest<unknown>('upload_file', params);
      return result !== false;
    },

    async addAlternativeFile(
      resourceId: number,
      name: string,
      description: string,
      filePath: string,
    ): Promise<number> {
      validateId(resourceId, 'resource ID');
      // RS add_alternative_file params: $resource, $name, $description, $file_name, $file_extension,
      // $file_size, $alt_type, $file
      const result = await client.makeRequest<number | { ref: number }>('add_alternative_file', {
        resource: resourceId.toString(),
        name,
        description,
        file: filePath,
      });
      const ref = typeof result === 'object' && result !== null ? toNumber(result.ref) : toNumber(result);
      if (ref === null) throw new Error('add_alternative_file returned invalid ref');
      return ref;
    },
  };

  return assignCapability(client, methods);
}
