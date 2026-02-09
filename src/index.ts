// Core
export { RSClientCore } from './core/client.js';
export { validateConfig, configFromEnv } from './core/config.js';
export {
  ResourceSpaceError,
  PermissionError,
  ConfigurationError,
  BatchSizeLimitError,
  SecurityError,
} from './core/errors.js';

// Types
export type {
  RSConfig,
  AuthMode,
  RSLogger,
  Resource,
  SearchResult,
  ResourceFieldData,
  Collection,
  User,
  FieldDefinition,
  FieldOption,
  Node,
  ResourceType,
  SystemStatus,
  AlternativeFile,
  SearchOptions,
  ResourcePathOptions,
  UserUpdateData,
  CreateUserParams,
  CreateCollectionParams,
} from './core/types.js';

// Capabilities (mixins)
export { withSearch, type SearchCapability } from './capabilities/search.js';
export { withResources, type ResourcesCapability } from './capabilities/resources.js';
export { withCollections, type CollectionsCapability } from './capabilities/collections.js';
export { withFields, type FieldsCapability } from './capabilities/fields.js';
export { withUsers, type UsersCapability } from './capabilities/users.js';
export { withSystem, type SystemCapability } from './capabilities/system.js';
export { withBatch, type BatchCapability } from './capabilities/batch.js';
export { withUpload, type UploadCapability } from './capabilities/upload.js';

// Factories
export {
  createBasicClient,
  createReadOnlyClient,
  createStandardClient,
  createAdminClient,
  createClient,
} from './factories.js';

// Utilities
export { generateSignature } from './utils/signature.js';
export { buildSignedQuery, buildQueryString } from './utils/query-builder.js';
export { normalizeResponse, ensureArray, toNumber } from './utils/response.js';
export { rewriteToInternalUrl } from './utils/url-rewriter.js';
