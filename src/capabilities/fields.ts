import type { RSClientCore } from '../core/client.js';
import type { FieldDefinition, FieldOption, Node } from '../core/types.js';
import { ensureArray, toNumber } from '../utils/response.js';

export interface FieldsCapability {
  /** Get all field definitions, optionally filtered by resource type. */
  getFields(resourceType?: number): Promise<FieldDefinition[]>;

  /** Get dropdown/checkbox options for a field. */
  getFieldOptions(fieldId: number): Promise<FieldOption[]>;

  /**
   * Get all distinct values used in a field.
   * @note Uses `get_field_values` which is not in the official RS API index.
   */
  getFieldValues(fieldId: number): Promise<string[]>;

  /** Get hierarchical nodes for a field. */
  getNodes(fieldId: number, parent?: number): Promise<Node[]>;

  /** Create or get a node for a field. Returns the node ID. */
  setNode(fieldId: number, name: string, parent?: number): Promise<number>;

  /** Update a single field value on a resource. */
  updateField(resourceId: number, fieldId: number, value: string): Promise<boolean>;

  /**
   * Resolve a field value that may be a node ref (dropdown) to its display name.
   * If the value looks like a numeric node ref, fetches field options and returns
   * the option name. Otherwise returns the value as-is.
   */
  resolveFieldDisplayName(fieldId: number, value: string | number | null): Promise<string>;
}

export function withFields<T extends RSClientCore>(client: T): T & FieldsCapability {
  const methods: FieldsCapability = {
    async getFields(resourceType?: number): Promise<FieldDefinition[]> {
      // RS get_resource_type_fields params: $by_resource_types, $find, $by_types
      const params: Record<string, string | number> = {};
      if (resourceType !== undefined) params.by_resource_types = resourceType;

      const data = await client.makeRequest<unknown[]>('get_resource_type_fields', params);
      const fields = ensureArray<Record<string, unknown>>(data);

      return fields.map((field): FieldDefinition => ({
        ref: toNumber(field.ref as string | number) ?? 0,
        name: field.name as string,
        title: field.title as string,
        type: toNumber(field.type as string | number) ?? 0,
        resource_type: field.resource_type !== undefined
          ? (toNumber(field.resource_type as string | number) ?? undefined)
          : undefined,
        ...field,
      }));
    },

    async getFieldOptions(fieldId: number): Promise<FieldOption[]> {
      const data = await client.makeRequest<FieldOption[]>('get_field_options', {
        ref: fieldId.toString(),
      });
      return ensureArray<FieldOption>(data);
    },

    async getFieldValues(fieldId: number): Promise<string[]> {
      const data = await client.makeRequest<string[]>('get_field_values', {
        field: fieldId.toString(),
      });
      return Array.isArray(data) ? data : [];
    },

    async getNodes(fieldId: number, parent?: number): Promise<Node[]> {
      // RS get_nodes params: $ref (field ID), $parent, $recursive, $offset, $rows, $name, ...
      const params: Record<string, string | number> = { ref: fieldId.toString() };
      if (parent !== undefined) params.parent = parent;

      const data = await client.makeRequest<Node[]>('get_nodes', params);
      return ensureArray<Node>(data);
    },

    async setNode(fieldId: number, name: string, parent?: number): Promise<number> {
      // RS set_node params: $ref, $resource_type_field, $name, $parent, $order_by, $returnexisting
      // $ref=NULL for creating new nodes; $returnexisting=true to get existing node if name matches
      const params: Record<string, string | number | boolean> = {
        ref: 'null',
        resource_type_field: fieldId,
        name,
        returnexisting: true,
      };
      if (parent !== undefined) params.parent = parent;

      const result = await client.makeRequest<number | { ref: number }>('set_node', params);
      const ref = typeof result === 'object' && result !== null ? toNumber(result.ref) : toNumber(result);
      if (ref === null) throw new Error('set_node returned invalid ref');
      return ref;
    },

    async updateField(resourceId: number, fieldId: number, value: string): Promise<boolean> {
      const result = await client.makeRequest<unknown>('update_field', {
        resource: resourceId.toString(),
        field: fieldId.toString(),
        value,
      });
      return result !== false;
    },

    async resolveFieldDisplayName(fieldId: number, value: string | number | null): Promise<string> {
      if (value === null || value === undefined) return '';
      const str = String(value).trim();
      if (!str) return '';

      const num = parseInt(str, 10);
      if (String(num) !== str) return str; // Not a numeric ref, use as display value

      const options = await methods.getFieldOptions(fieldId);
      const option = options.find(o => o.ref === num);
      return option?.name?.trim() || str;
    },
  };

  return Object.assign(client, methods);
}
