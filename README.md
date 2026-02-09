# @magnolia/resourcespace

A comprehensive TypeScript client library for the [ResourceSpace](https://www.resourcespace.com/) DAM API.

## Features

- **Capability-based API** — opt into only what you need, enforced at the type level
- **Security hardened** — field allowlists, usergroup locking, batch size limits
- **Dual output** — ESM + CommonJS with full type declarations
- **Zero runtime dependencies** — Node.js builtins only
- **Production tested** — adopted from battle-tested ResourceSpace integrations

## Installation

As a git submodule:

```bash
git submodule add https://github.com/Magnolia-Tech-Services-LLC/magnolia-resourcespace.git lib/resourcespace-client
```

In your `package.json`:

```json
{
  "dependencies": {
    "@magnolia/resourcespace": "file:./lib/resourcespace-client"
  }
}
```

## Quick Start

```typescript
import { createReadOnlyClient } from '@magnolia/resourcespace';

const client = createReadOnlyClient({
  baseUrl: 'https://dam.example.com/api/',
  user: 'api_user',
  secret: 'your-api-key',
  authMode: 'apiKey',
});

// Search for resources
const results = await client.search('landscape');

// Get a specific resource
const resource = await client.getResource(42);
```

## Configuration

```typescript
import type { RSConfig } from '@magnolia/resourcespace';

const config: RSConfig = {
  baseUrl: 'https://dam.example.com/api/',  // Required — RS API base URL
  user: 'api_user',                          // Required — API username
  secret: 'your-api-key-or-session-key',     // Required — min 32 chars
  authMode: 'apiKey',                        // 'apiKey' or 'sessionKey'

  // Optional
  internalUrl: 'http://resourcespace:80/',   // Docker internal URL rewriting
  timeout: 30000,                            // Request timeout in ms
  signupUsergroup: 9,                        // Usergroup for new users (security)
  maxBatchSize: 100,                         // Max items per batch operation
  logger: console,                           // Pluggable logger
};
```

Or from environment variables:

```typescript
import { configFromEnv } from '@magnolia/resourcespace';

// Reads RS_BASE_URL, RS_USER, RS_SECRET, RS_AUTH_MODE, etc.
const config = configFromEnv();
```

## Client Tiers

### Read-Only Client

Search, browse resources/collections/fields, check system status. No write or delete methods available.

```typescript
import { createReadOnlyClient } from '@magnolia/resourcespace';

const client = createReadOnlyClient(config);

const results = await client.search('portrait', { perPage: 20 });
const resource = await client.getResource(results[0].ref);
const path = await client.getResourcePath(resource.ref);
const fields = await client.getFields();
const types = await client.getResourceTypes();
```

### Admin Client

Full access including user management (security hardened), batch operations, and file uploads.

```typescript
import { createAdminClient } from '@magnolia/resourcespace';

const client = createAdminClient(config);

// Everything from read-only, plus:
await client.createUser({ username: 'new@example.com', email: 'new@example.com' });
await client.batchFieldUpdate([1, 2, 3], 8, 'landscape');
await client.uploadFile(42);
```

### Custom Composition

Pick exactly the capabilities you need:

```typescript
import {
  RSClientCore,
  createClient,
  withSearch,
  withResources,
  withBatch,
} from '@magnolia/resourcespace';

const client = createClient(config, withSearch, withResources, withBatch);
// client.search()           ✓ available
// client.batchDelete()      ✓ available
// client.createUser()       ✗ doesn't exist on the type
```

## Capabilities

| Capability | Factory | Methods |
|-----------|---------|---------|
| `withSearch` | Read-only | `search`, `searchByField` |
| `withResources` | Read-only | `getResource`, `getResourcePath`, `getResourceFieldData`, `createResource`, `deleteResource`, ... |
| `withCollections` | Read-only | `getCollections`, `getCollectionResources`, `createCollection`, `shareCollection`, ... |
| `withFields` | Read-only | `getFields`, `getFieldOptions`, `getNodes`, `updateField`, `resolveFieldDisplayName` |
| `withSystem` | Read-only | `getResourceTypes`, `getApiVersion`, `getSystemStatus` |
| `withUsers` | Admin | `getUser`, `createUser`, `saveUser`, `checkCredentials` |
| `withBatch` | Admin | `batchFieldUpdate`, `batchDelete`, `batchCollectionAdd`, `batchNodesAdd`, ... |
| `withUpload` | Admin | `uploadFile`, `addAlternativeFile` |

## Security

### User Management

`saveUser` enforces a field allowlist — only `fullname`, `email`, `password`, and `comments` are accepted. Attempts to set `usergroup`, `approved`, or `ip_restrict` are silently stripped:

```typescript
// usergroup is stripped — cannot escalate privileges
await client.saveUser(42, {
  fullname: 'Updated Name',
  usergroup: 1, // IGNORED — stripped by allowlist
});
```

`createUser` always uses `config.signupUsergroup` (default 9) and sets `approved: 0`:

```typescript
// Usergroup comes from config, not from this call
await client.createUser({
  username: 'new@example.com',
  email: 'new@example.com',
});
```

### Batch Size Limits

All batch operations enforce `config.maxBatchSize` (default 100):

```typescript
// Throws BatchSizeLimitError if array exceeds limit
await client.batchDelete(resourceIds);
```

## Error Handling

```typescript
import {
  ResourceSpaceError,
  PermissionError,
  BatchSizeLimitError,
  SecurityError,
} from '@magnolia/resourcespace';

try {
  await client.search('test');
} catch (err) {
  if (err instanceof PermissionError) {
    // RS returned "Access denied"
  } else if (err instanceof BatchSizeLimitError) {
    // Batch too large
  } else if (err instanceof ResourceSpaceError) {
    // General RS API error — check err.functionName, err.rsError
  }
}
```

## Development

```bash
npm install
npm run test         # Run tests
npm run typecheck    # Type checking
npm run build        # Build dist/
```

## License

Private — Magnolia Tech Services LLC
