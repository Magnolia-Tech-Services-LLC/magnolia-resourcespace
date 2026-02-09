# magnolia-resourcespace: Shared ResourceSpace API Client Library

## Context

Both **magnolia-canopy** (copyright protection) and **magnolia-photos-frontend** (photo gallery) integrate with ResourceSpace. Both are early-stage projects that will grow. Building a shared, neutral RS client now — while both consumers are malleable — avoids painful retrofitting later. Additional future projects may also need RS access.

The photos-frontend already has a mature ~960-line RS client with hard-won production knowledge (auth quirks, response normalization, security patterns). We'll adopt that code as the starting point rather than building from scratch.

**Key design principle:** The library is fully featured, but consumers opt into only the capabilities they need — enforced at the TypeScript type level via a mixin/capability pattern. An app that only needs search never sees `deleteResource` in autocomplete.

---

## Architecture

### Capability-Based Mixin Pattern

```
RSClientCore (auth, signing, HTTP, response normalization)
  + withSearch()        → search, searchByField
  + withResources()     → getResource, getResourcePath, createResource, copyResource, deleteResource, ...
  + withCollections()   → getCollections, createCollection, addToCollection, ...
  + withFields()        → getFields, getFieldOptions, getNodes, updateField, ...
  + withUsers()         → getUser, getUsers, createUser, saveUser, ...
  + withSystem()        → getResourceTypes, getApiVersion, getSystemStatus
  + withBatch()         → batchFieldUpdate, batchDelete, batchCollectionAdd, ...
  + withUpload()        → uploadFile, addAlternativeFile
```

Each `with*()` function returns the client with additional methods added at the type level. Consumers compose what they need:

```typescript
// Guest app — read-only, no dangerous methods exist on the type
const api = createClient(config, withSearch, withResources, withCollections);

// Admin app — full access
const api = createClient(config, withSearch, withResources, withCollections, withFields, withUsers, withBatch);
```

### Pre-composed factory functions for common patterns

```typescript
createReadOnlyClient(config)  → search + resources (read) + collections (read) + fields (read) + system
createStandardClient(config)  → above + resources (write) + collections (write) + fields (write)
createAdminClient(config)     → above + users + batch + upload
```

---

## Security Model

### Tiered API Classification

**Safe (read-only):** search, get_resource_data, get_resource_path, get_resource_field_data, get_field_options, get_nodes, get_resource_types, get_featured_collections, get_users, etc.

**Mutating (limited risk):** update_field, create_resource, create_collection, add_to_collection, upload_file, set_node — RS enforces resource-level permissions.

**Dangerous (require explicit opt-in via capabilities):**
- `save_user` — MUST use field allowlist: `fullname, email, password, comments` only. Block `usergroup`, `approved`, `ip_restrict`.
- `new_user` — MUST accept usergroup as a library config option, never from caller input.
- `delete_resource`, `batch_delete` — available only via `withResources()` or `withBatch()`.
- `batch_*` operations — enforce configurable max batch size (default 100).
- System config mutations — NOT exposed in the library at all.

### Hardcoded Security Controls (built into the library, not configurable)

1. **save_user field allowlist** — only safe fields pass through, always
2. **new_user usergroup** — read from client config, never from function parameters
3. **approved=0 enforcement** — new users always created as pending
4. **Batch size limits** — configurable but enforced
5. **Sensitive data redaction** — passwords/keys never appear in logs

---

## File Structure

```
magnolia-resourcespace/
├── package.json
├── tsconfig.json
├── tsup.config.ts
├── vitest.config.ts
├── .gitignore
├── CLAUDE.md                     (update existing)
├── PLAN.md                       (update existing)
├── README.md
├── src/
│   ├── index.ts                  # Public API exports
│   ├── core/
│   │   ├── client.ts             # RSClientCore class (auth, signing, HTTP, response normalization)
│   │   ├── config.ts             # Configuration types and validation
│   │   ├── errors.ts             # ResourceSpaceError hierarchy
│   │   └── types.ts              # Shared types (Resource, Collection, User, Field, etc.)
│   ├── capabilities/
│   │   ├── search.ts             # withSearch()
│   │   ├── resources.ts          # withResources()
│   │   ├── collections.ts        # withCollections()
│   │   ├── fields.ts             # withFields()
│   │   ├── users.ts              # withUsers() — includes security hardening
│   │   ├── system.ts             # withSystem()
│   │   ├── batch.ts              # withBatch() — includes size limits
│   │   └── upload.ts             # withUpload()
│   ├── factories.ts              # createReadOnlyClient, createStandardClient, createAdminClient
│   └── utils/
│       ├── signature.ts          # SHA256 signing (extracted from photos-frontend)
│       ├── query-builder.ts      # URLSearchParams construction with ordering
│       ├── response.ts           # Response normalization (JSON strings, error detection, etc.)
│       └── url-rewriter.ts       # Docker internal URL rewriting
├── tests/
│   ├── core/
│   │   ├── signature.test.ts
│   │   ├── query-builder.test.ts
│   │   ├── response.test.ts
│   │   └── client.test.ts
│   ├── capabilities/
│   │   ├── search.test.ts
│   │   ├── resources.test.ts
│   │   ├── users.test.ts         # Security tests (field allowlist, usergroup hardcoding)
│   │   └── batch.test.ts         # Batch size limit tests
│   └── security/
│       ├── save-user-allowlist.test.ts
│       ├── new-user-usergroup.test.ts
│       └── batch-limits.test.ts
└── dist/                         # Build output (ESM + CJS)
```

---

## Implementation Phases

### Phase 1: Repository Setup
- package.json, tsconfig.json, tsup.config.ts, vitest.config.ts, .gitignore
- ESM + CJS dual output via tsup
- Vitest for testing

**Files:** package.json, tsconfig.json, tsup.config.ts, vitest.config.ts, .gitignore

### Phase 2: Core Infrastructure
Adopt from `/Users/greer/dev/magnolia-photos-frontend/lib/resourcespace-api.ts`:
- **Signature generation** (lines 36-44): `SHA256(secret + queryString)`
- **Query building** (lines 47-58): URLSearchParams with user prepended
- **Signed query with authmode handling** (lines 64-85): authmode excluded from signature, appended after
- **Response normalization** (lines 122-259): JSON string parsing, error string detection, null handling
- **URL rewriting** (lines 102-120): Docker internal URL substitution
- **Error classes**: typed errors preserving RS context

**Key RS quirks to encode:**
- All requests MUST be GET (RS validates signature against QUERY_STRING)
- `authmode=sessionkey` added AFTER signature computation
- RS returns errors as 200 responses with error strings
- `get_resource_path` returns JSON-encoded string, not plain string
- Response formats vary: arrays, wrapped objects `{resources:[...]}`, strings, null

**Files:** src/core/client.ts, src/core/config.ts, src/core/errors.ts, src/core/types.ts, src/utils/signature.ts, src/utils/query-builder.ts, src/utils/response.ts, src/utils/url-rewriter.ts

### Phase 3: Capability System + Search
- Implement mixin pattern infrastructure
- `withSearch()`: search, searchByField (via do_search with `!field` syntax)
- Wire up factories (createReadOnlyClient, etc.)
- First tests

**Files:** src/capabilities/search.ts, src/factories.ts, src/index.ts, tests/capabilities/search.test.ts

### Phase 4: Resources Capability
Adopt from photos-frontend `getResource`, `getResourceFieldData`, `getResourcePath` methods:
- Read: getResource, getResourceData, getResourcePath, getResourceFieldData, getResourceLog, getRelatedResources
- Write: createResource, copyResource, deleteResource, updateField

**Files:** src/capabilities/resources.ts, tests/capabilities/resources.test.ts

### Phase 5: Collections Capability
Adopt from photos-frontend `getCollectionResources`, `getAllFeaturedCollections`, `getFeaturedCollections`:
- getCollections, getCollectionResources, createCollection, deleteCollection
- addToCollection, removeFromCollection
- getFeaturedCollections, getAllFeaturedCollections
- searchCollections, shareCollection

**Files:** src/capabilities/collections.ts, tests/capabilities/collections.test.ts

### Phase 6: Fields Capability
Adopt from photos-frontend `getFields`, `getFieldOptions`, `resolveFieldOptionDisplayName`:
- getFields, getFieldOptions, getFieldValues, getNodes
- updateField, setNode
- resolveFieldOptionDisplayName (node ref → display name)

**Files:** src/capabilities/fields.ts, tests/capabilities/fields.test.ts

### Phase 7: Users Capability (Security-Critical)
Adopt from photos-frontend `saveUser`, `getUser`, `getFullUser`, `getUserRef` AND from `resourcespace-user-creator.ts`:
- getUser, getUsers, getUserRef
- createUser — hardcoded usergroup from config, approved=0 enforced
- saveUser — field allowlist enforced (fullname, email, password, comments only)
- checkCredentials (login)

Security tests:
- Verify save_user strips disallowed fields (usergroup, approved, ip_restrict)
- Verify createUser always uses config usergroup, never caller-provided
- Verify createUser sets approved=0

**Files:** src/capabilities/users.ts, tests/capabilities/users.test.ts, tests/security/save-user-allowlist.test.ts, tests/security/new-user-usergroup.test.ts

### Phase 8: System, Batch, Upload Capabilities
- `withSystem()`: getResourceTypes, getApiVersion, getSystemStatus
- `withBatch()`: batchFieldUpdate, batchDelete, batchCollectionAdd/Remove, batchNodesAdd/Remove, batchArchiveStatus — all enforce configurable max batch size
- `withUpload()`: uploadFile, addAlternativeFile

**Files:** src/capabilities/system.ts, src/capabilities/batch.ts, src/capabilities/upload.ts, tests/capabilities/batch.test.ts, tests/security/batch-limits.test.ts

### Phase 9: Documentation + Final Tests
- README.md with usage examples for each capability level
- Verify build output (ESM + CJS)
- Run full test suite

**Files:** README.md, CLAUDE.md (update)

---

## Verification

1. `npm run build` — produces dist/ with ESM + CJS output
2. `npm run test` — all tests pass including security tests
3. `npm run typecheck` — no TypeScript errors
4. **Type-level verification**: confirm dangerous methods don't appear on read-only clients (write a test file that should fail typecheck)
5. **Security verification**: tests confirm field allowlists, usergroup hardcoding, batch limits
6. **Signature compatibility**: verify signature output matches both photos-frontend and canopy implementations for identical inputs
