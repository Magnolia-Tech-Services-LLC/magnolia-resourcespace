# Shared ResourceSpace Library

## Context

Both **magnolia-canopy** and **magnolia-photos-frontend** integrate with ResourceSpace using identical signature generation. Rather than a minimal core, we're creating a **comprehensive ResourceSpace API client** as a standalone repo that can be used as a git submodule in both projects.

**Goals:**
1. Create a new standalone repository for the ResourceSpace client library
2. Support **all ResourceSpace API endpoints** (not just the ones currently used)
3. Maintain backwards compatibility with existing project implementations
4. Use git submodules for integration
5. Create GitHub issues for future enhancements

---

## Library Design

### Repository
- **Name:** `magnolia-resourcespace`
- **Location:** `Magnolia-Tech-Services-LLC/magnolia-resourcespace`
- **Language:** TypeScript with ESM + CJS dual output
- **Dependencies:** Minimal (only `crypto` from Node.js)

### Architecture

```
magnolia-resourcespace/
├── package.json
├── tsconfig.json
├── README.md
├── src/
│   ├── index.ts                    # Main exports
│   ├── client.ts                   # ResourceSpaceClient class
│   ├── auth/
│   │   ├── signature.ts            # SHA256 signing
│   │   └── session.ts              # Session key auth
│   ├── api/
│   │   ├── resources.ts            # Resource CRUD operations
│   │   ├── search.ts               # Search functionality
│   │   ├── collections.ts          # Collection management
│   │   ├── users.ts                # User management
│   │   ├── fields.ts               # Field/metadata operations
│   │   ├── upload.ts               # File upload
│   │   └── system.ts               # System info, stats
│   ├── types/
│   │   ├── config.ts               # Configuration interfaces
│   │   ├── resource.ts             # Resource types
│   │   ├── collection.ts           # Collection types
│   │   ├── user.ts                 # User types
│   │   └── api-responses.ts        # API response shapes
│   └── utils/
│       ├── query-builder.ts        # URL query construction
│       ├── url-rewriter.ts         # Docker-aware URL rewriting
│       └── errors.ts               # Custom error classes
├── tests/
│   └── *.test.ts
└── dist/                           # Compiled output
```

### Core Client Class

```typescript
// src/client.ts
export class ResourceSpaceClient {
  constructor(config: ResourceSpaceConfig)

  // Configuration
  static fromEnv(prefix?: string): ResourceSpaceClient
  validateConfig(): { valid: boolean; errors: string[] }

  // Auth modes
  withApiKey(user: string, key: string): ResourceSpaceClient
  withSessionKey(user: string, sessionKey: string): ResourceSpaceClient

  // Resource operations (all RS API functions)
  getResource(ref: number): Promise<Resource>
  getResourceData(ref: number): Promise<ResourceData>
  getResourcePath(ref: number, options?: PathOptions): Promise<string>
  getResourceFieldData(ref: number, field: number): Promise<FieldData>
  updateField(ref: number, field: number, value: string): Promise<boolean>
  createResource(type: number, archive?: number): Promise<number>
  copyResource(from: number): Promise<number>
  deleteResource(ref: number): Promise<boolean>

  // Search
  search(query: string, options?: SearchOptions): Promise<SearchResult>
  searchByField(field: number, value: string): Promise<Resource[]>
  advancedSearch(params: AdvancedSearchParams): Promise<SearchResult>

  // Collections
  getCollections(user?: number): Promise<Collection[]>
  getCollectionResources(collection: number): Promise<Resource[]>
  createCollection(name: string): Promise<number>
  addToCollection(collection: number, resource: number): Promise<boolean>
  getFeaturedCollections(parent?: number): Promise<Collection[]>

  // Users
  getUser(identifier: string | number): Promise<User>
  createUser(params: CreateUserParams): Promise<number>
  updateUser(ref: number, data: Partial<User>): Promise<boolean>
  checkCredentials(username: string, password: string): Promise<SessionKey | null>

  // Fields & Metadata
  getFields(resourceType?: number): Promise<Field[]>
  getFieldOptions(field: number): Promise<FieldOption[]>
  getNodes(field: number): Promise<Node[]>

  // System
  getSystemStatus(): Promise<SystemStatus>
  getResourceTypes(): Promise<ResourceType[]>
  getApiVersion(): Promise<string>
}
```

### Configuration Interface

```typescript
// src/types/config.ts
export interface ResourceSpaceConfig {
  baseUrl: string           // e.g., "https://dam.magnolia.photos"
  user: string              // API user or username
  secret: string            // API key or session key
  authMode: "apiKey" | "sessionKey"

  // Optional
  internalUrl?: string      // Docker internal URL for server-side
  timeout?: number          // Request timeout (default: 30000)
  retries?: number          // Retry count (default: 0)
}

export function createConfig(options: Partial<ResourceSpaceConfig>): ResourceSpaceConfig
export function configFromEnv(prefix?: string): ResourceSpaceConfig | null
```

---

## Backwards Compatibility

### For magnolia-canopy

Current usage in `src/lib/resourcespace.ts`:
- `getResource(ref)` ✅ Supported
- `getResourceField(ref, field)` ✅ Supported as `getResourceFieldData`
- `getPreviewUrl(ref, size)` ✅ Supported via `getResourcePath`
- `getResourcePath(ref, size, watermarked)` ✅ Supported
- `isConfigured()` ✅ Supported via `validateConfig`

**Migration:** Create thin wrapper that uses the new client internally.

### For magnolia-photos-frontend

Current usage across 4 files:
- All `ResourceSpaceAPI` methods ✅ Mapped to new client
- `ResourceSpaceAuth` methods ✅ Included in client
- Session key authentication ✅ Supported via `authMode: "sessionKey"`
- Docker URL rewriting ✅ Via `internalUrl` config option

**Migration:** Replace internal implementation with new client, keep existing public API.

---

## Git Submodule Integration

### Adding to Projects

```bash
# In magnolia-canopy
git submodule add https://github.com/Magnolia-Tech-Services-LLC/magnolia-resourcespace.git lib/resourcespace-client
git submodule update --init

# In magnolia-photos-frontend
git submodule add https://github.com/Magnolia-Tech-Services-LLC/magnolia-resourcespace.git lib/resourcespace-client
git submodule update --init
```

### Package.json Reference

```json
{
  "dependencies": {
    "@magnolia/resourcespace": "file:./lib/resourcespace-client"
  }
}
```

### Updating Submodule

```bash
cd lib/resourcespace-client
git pull origin main
cd ..
git add lib/resourcespace-client
git commit -m "chore: update resourcespace client"
```

---

## Implementation Phases

### Phase 1: Repository Setup (30 min)
1. Create GitHub repo `Magnolia-Tech-Services-LLC/magnolia-resourcespace`
2. Initialize with TypeScript, ESLint, Vitest
3. Set up dual ESM/CJS build with tsup
4. Add CI workflow for tests

### Phase 2: Core Infrastructure (1 hour)
1. Implement signature generation
2. Implement query builder with auth modes
3. Create base client class with HTTP handling
4. Add configuration validation
5. Add custom error classes

### Phase 3: API Methods - Resources (1.5 hours)
1. `get_resource_data` - Get resource metadata
2. `get_resource_field_data` - Get field value
3. `get_resource_path` - Get image URL
4. `update_field` - Update metadata
5. `create_resource` - Create new resource
6. `copy_resource` - Duplicate resource
7. `delete_resource` - Remove resource
8. `get_resource_log` - Activity history
9. `get_related_resources` - Related items

### Phase 4: API Methods - Search (1 hour)
1. `do_search` - Full-text search
2. `search_get_previews` - Search with previews
3. `get_search_results` - Paginated results

### Phase 5: API Methods - Collections (45 min)
1. `get_user_collections` - User's collections
2. `get_collection_resources` - Collection contents
3. `create_collection` - New collection
4. `add_resource_to_collection` - Add item
5. `remove_resource_from_collection` - Remove item
6. `get_featured_collections` - Featured/public
7. `get_featured_collection_categories` - Categories

### Phase 6: API Methods - Users (45 min)
1. `get_user` - User lookup
2. `get_users` - List users
3. `new_user` - Create user
4. `save_user` - Update user
5. `get_user_by_username` - Username lookup
6. `check_credentials` - Login validation

### Phase 7: API Methods - Fields (30 min)
1. `get_resource_type_fields` - Field definitions
2. `get_field_options` - Dropdown options
3. `get_nodes` - Hierarchical nodes

### Phase 8: API Methods - System (30 min)
1. `get_resource_types` - Available types
2. `get_api_version` - API version
3. `get_system_status` - Health check

### Phase 9: Testing & Documentation (1 hour)
1. Unit tests for all methods
2. Integration tests with mock server
3. README with examples
4. JSDoc comments
5. Type exports

### Phase 10: Project Integration (1 hour)
1. Add submodule to magnolia-canopy
2. Update canopy's resourcespace.ts wrapper
3. Add submodule to magnolia-photos-frontend
4. Update frontend's ResourceSpaceAPI class
5. Test both projects end-to-end

---

## GitHub Issues to Create

After initial implementation, create these enhancement issues:

### High Priority
1. **Add request caching layer** - Cache responses for configurable TTL
2. **Add request queuing/rate limiting** - Prevent API throttling
3. **Add retry logic with exponential backoff** - Handle transient failures
4. **Add streaming upload support** - Large file uploads

### Medium Priority
5. **Add webhook signature validation** - Verify RS webhooks
6. **Add batch operations** - Bulk update/delete
7. **Add resource watching** - Poll for changes
8. **Add offline mode** - Queue operations when offline

### Documentation
9. **Add API reference docs** - Generated from JSDoc
10. **Add migration guide** - From project-specific implementations
11. **Add cookbook examples** - Common use cases

---

## Files to Create/Modify

### New Repository Files
```
magnolia-resourcespace/
├── package.json
├── tsconfig.json
├── tsup.config.ts          # Build config
├── vitest.config.ts        # Test config
├── .github/workflows/ci.yml
├── README.md
├── src/index.ts
├── src/client.ts
├── src/auth/signature.ts
├── src/auth/session.ts
├── src/api/resources.ts
├── src/api/search.ts
├── src/api/collections.ts
├── src/api/users.ts
├── src/api/fields.ts
├── src/api/system.ts
├── src/types/*.ts
├── src/utils/*.ts
└── tests/*.test.ts
```

### magnolia-canopy Updates
- `package.json` - Add submodule dependency
- `.gitmodules` - Add submodule entry
- `src/lib/resourcespace.ts` - Use new client (thin wrapper)

### magnolia-photos-frontend Updates
- `package.json` - Add submodule dependency
- `.gitmodules` - Add submodule entry
- `lib/resourcespace-api.ts` - Use new client internally

---

## Verification

1. **New library tests pass:** `npm test` in magnolia-resourcespace
2. **Canopy integration:** Trigger a scan, verify ResourceSpace URLs work
3. **Frontend integration:** Test login, gallery loading, user profile
4. **Signature compatibility:** Both projects generate identical signatures
5. **Session key auth:** Frontend login flow still works

---

## Estimate

| Phase | Time |
|-------|------|
| Repository setup | 30 min |
| Core infrastructure | 1 hour |
| Resource API methods | 1.5 hours |
| Search API methods | 1 hour |
| Collections API methods | 45 min |
| Users API methods | 45 min |
| Fields API methods | 30 min |
| System API methods | 30 min |
| Testing & documentation | 1 hour |
| Project integration | 1 hour |
| **Total** | **~8 hours** |
