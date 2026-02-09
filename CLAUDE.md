# CLAUDE.md - Magnolia ResourceSpace Client

## Project Overview

**magnolia-resourcespace** is a comprehensive TypeScript client library for the ResourceSpace DAM (Digital Asset Management) API. It provides a unified interface for both **magnolia-canopy** and **magnolia-photos-frontend** projects.

**Repository:** `Magnolia-Tech-Services-LLC/magnolia-resourcespace`

## Tech Stack

- **Language:** TypeScript
- **Build:** tsup (ESM + CJS dual output)
- **Testing:** Vitest
- **Dependencies:** Minimal (Node.js crypto only)

## Commands

```bash
npm run build        # Build library (dist/)
npm run test         # Run tests
npm run lint         # ESLint
npm run typecheck    # TypeScript checks
```

## Project Structure

```
src/
├── index.ts            # Main exports
├── client.ts           # ResourceSpaceClient class
├── auth/
│   ├── signature.ts    # SHA256 signing
│   └── session.ts      # Session key auth
├── api/
│   ├── resources.ts    # Resource CRUD
│   ├── search.ts       # Search operations
│   ├── collections.ts  # Collection management
│   ├── users.ts        # User management
│   ├── fields.ts       # Field/metadata ops
│   └── system.ts       # System info
├── types/              # TypeScript interfaces
└── utils/              # Helpers (query builder, errors)
```

## Key Concepts

### Authentication Modes

1. **API Key Mode** (server-side): `SHA256(apiKey + queryString)`
2. **Session Key Mode** (client-side): Same signature, but adds `authmode=sessionkey` AFTER signing

### URL Rewriting

For Docker environments where internal/external URLs differ:
- `baseUrl`: External URL (browser-accessible)
- `internalUrl`: Internal URL (server-to-server)

### ResourceSpace API Pattern

All RS API calls follow this pattern:
```
{baseUrl}/api/?{queryString}&sign={signature}
```

Where `queryString` includes:
- `user` - API user
- `function` - API function name
- `param1`, `param2`, etc. - Function parameters

## Code Conventions

- All API methods return `Promise<T>` with typed responses
- Errors throw `ResourceSpaceError` with status codes
- Configuration validated at construction time
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

- **magnolia-canopy**: Copyright protection platform (uses API key auth)
- **magnolia-photos-frontend**: Photo gallery frontend (uses session key auth)

## Implementation Plan

See `PLAN.md` for the full implementation roadmap (~8 hours total).
