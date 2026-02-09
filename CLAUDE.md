# CLAUDE.md - Magnolia ResourceSpace Client

## Project Overview

**magnolia-resourcespace** is a comprehensive TypeScript client library for the ResourceSpace DAM (Digital Asset Management) API. It provides a neutral, fully-featured interface used by both **magnolia-canopy** and **magnolia-photos-frontend** projects, distributed as a git submodule.

**Repository:** `Magnolia-Tech-Services-LLC/magnolia-resourcespace`

## Tech Stack

- **Language:** TypeScript (strict mode, ES2022 target)
- **Build:** tsup (ESM + CJS dual output with declarations)
- **Testing:** Vitest
- **Dependencies:** Zero runtime dependencies (Node.js builtins only)

## Commands

```bash
npm run build        # Build library (dist/) — ESM + CJS + .d.ts
npm run test         # Run tests (vitest)
npm run typecheck    # TypeScript type checking (tsc --noEmit)
```

## Project Structure

```
src/
├── index.ts                 # Public API exports
├── factories.ts             # Pre-composed client factories
├── core/
│   ├── client.ts            # RSClientCore (auth, signing, HTTP, response normalization)
│   ├── config.ts            # Config validation + configFromEnv()
│   ├── errors.ts            # Error hierarchy (ResourceSpaceError, SecurityError, etc.)
│   └── types.ts             # All TypeScript interfaces
├── capabilities/
│   ├── search.ts            # withSearch() — search, searchByField
│   ├── resources.ts         # withResources() — CRUD, paths, logs, alternatives
│   ├── collections.ts       # withCollections() — CRUD, featured, sharing
│   ├── fields.ts            # withFields() — options, nodes, display names
│   ├── users.ts             # withUsers() — SECURITY HARDENED (field allowlist, usergroup locking)
│   ├── system.ts            # withSystem() — resource types, API version, status
│   ├── batch.ts             # withBatch() — bulk ops with size limits
│   └── upload.ts            # withUpload() — file upload, alternatives
└── utils/
    ├── signature.ts         # SHA256(secret + queryString)
    ├── query-builder.ts     # URL query construction with auth handling
    ├── response.ts          # RS response normalization (JSON strings, error detection)
    └── url-rewriter.ts      # Docker internal URL rewriting
```

## Architecture: Capability Mixin Pattern

Consumers opt into capabilities at the TypeScript type level. An app that only needs search never sees `deleteResource` in autocomplete.

```typescript
// Minimal — read-only, no dangerous methods exist on the type
const api = createReadOnlyClient(config);

// Full admin access — users, batch, uploads
const api = createAdminClient(config);

// Custom composition
const api = createClient(config, withSearch, withResources, withBatch);
```

## Key Concepts

### Authentication Modes

1. **API Key Mode** (server-side): `SHA256(apiKey + queryString)`
2. **Session Key Mode** (client-side): Same signature, `authmode=sessionkey` appended AFTER signing

### ResourceSpace API Quirks

- **All requests are GET** — RS validates signature against `$_SERVER["QUERY_STRING"]`
- `authmode=sessionkey` MUST be excluded from signature computation
- RS returns errors as HTTP 200 responses with error strings
- `get_resource_path` returns JSON-encoded string, not plain string
- Response formats vary: arrays, wrapped objects, strings, null

### URL Rewriting

For Docker environments where internal/external URLs differ. Configure `internalUrl` to rewrite RS-returned URLs for server-to-server communication.

## Security Model (CRITICAL)

### Hardcoded Controls (not configurable)

1. **save_user field allowlist** — only `fullname`, `email`, `password`, `comments` pass through. `usergroup`, `approved`, `ip_restrict` are ALWAYS stripped.
2. **new_user usergroup** — read from `config.signupUsergroup`, NEVER from function parameters
3. **approved=0 enforcement** — new users always created as pending (RS defaults approved=1)
4. **Batch size limits** — configurable via `config.maxBatchSize` (default 100), enforced on all batch operations

### Security Tests

Dedicated tests in `tests/security/` verify these controls cannot be bypassed:
- `save-user-allowlist.test.ts` — field stripping
- `new-user-usergroup.test.ts` — usergroup hardcoding
- `batch-limits.test.ts` — size enforcement

## Code Conventions

- Mixin functions named `withX()` return extended client types
- All API methods return `Promise<T>` with typed responses
- Errors use `ResourceSpaceError` hierarchy with RS function context
- Config validated at construction time via `validateConfig()`
- No runtime dependencies beyond Node.js builtins

## Integration

### As Git Submodule

```bash
git submodule add https://github.com/Magnolia-Tech-Services-LLC/magnolia-resourcespace.git lib/resourcespace-client
```

### In package.json

```json
{
  "dependencies": {
    "@magnolia/resourcespace": "file:./lib/resourcespace-client"
  }
}
```

## Related Projects

- **magnolia-canopy**: Copyright protection platform (API key auth)
- **magnolia-photos-frontend**: Photo gallery frontend (session key auth)
