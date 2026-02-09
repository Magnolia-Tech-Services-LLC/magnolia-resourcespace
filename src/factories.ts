import type { RSConfig } from './core/types.js';
import { RSClientCore } from './core/client.js';
import { withSearch } from './capabilities/search.js';
import { withResources } from './capabilities/resources.js';
import { withCollections } from './capabilities/collections.js';
import { withFields } from './capabilities/fields.js';
import { withUsers } from './capabilities/users.js';
import { withSystem } from './capabilities/system.js';
import { withBatch } from './capabilities/batch.js';
import { withUpload } from './capabilities/upload.js';

/**
 * Create a basic client with core capabilities.
 * Capabilities: search, resources, collections, fields, system.
 *
 * Includes read AND write methods for resources/collections/fields
 * (RS enforces server-side permissions regardless).
 *
 * Does NOT include: user management, batch operations, file uploads.
 * Suitable for: gallery apps, search interfaces, content management.
 */
export function createBasicClient(config: RSConfig) {
  return withSystem(withFields(withCollections(withResources(withSearch(new RSClientCore(config))))));
}

/** @deprecated Use createBasicClient instead. This is an alias for backwards compatibility. */
export const createReadOnlyClient = createBasicClient;

/** @deprecated Use createBasicClient instead. This was always identical to createBasicClient. */
export const createStandardClient = createBasicClient;

/**
 * Create an admin client with full access.
 * Capabilities: everything + users, batch operations, uploads.
 *
 * Includes security-hardened user management (field allowlists, usergroup locking).
 * Suitable for: admin panels, backend services, migration scripts.
 */
export function createAdminClient(config: RSConfig) {
  return withUpload(withBatch(withUsers(
    withSystem(withFields(withCollections(withResources(withSearch(new RSClientCore(config))))))
  )));
}

// ---------------------------------------------------------------------------
// Capability function type helper
// ---------------------------------------------------------------------------
type CapabilityFn<In, Out> = (client: In) => Out;

/**
 * Create a custom client by composing specific capabilities.
 * Type inference is fully automatic for up to 8 capabilities.
 *
 * @example
 * ```ts
 * // Only search + system info — fully typed, no annotations needed
 * const client = createClient(config, withSearch, withSystem);
 *
 * // Search + users (no resources, no collections)
 * const client = createClient(config, withSearch, withUsers);
 * ```
 */
// Overloads for 1-8 capabilities with full type inference
export function createClient<A>(
  config: RSConfig,
  c1: CapabilityFn<RSClientCore, A>,
): A;
export function createClient<A, B>(
  config: RSConfig,
  c1: CapabilityFn<RSClientCore, A>,
  c2: CapabilityFn<A, B>,
): B;
export function createClient<A, B, C>(
  config: RSConfig,
  c1: CapabilityFn<RSClientCore, A>,
  c2: CapabilityFn<A, B>,
  c3: CapabilityFn<B, C>,
): C;
export function createClient<A, B, C, D>(
  config: RSConfig,
  c1: CapabilityFn<RSClientCore, A>,
  c2: CapabilityFn<A, B>,
  c3: CapabilityFn<B, C>,
  c4: CapabilityFn<C, D>,
): D;
export function createClient<A, B, C, D, E>(
  config: RSConfig,
  c1: CapabilityFn<RSClientCore, A>,
  c2: CapabilityFn<A, B>,
  c3: CapabilityFn<B, C>,
  c4: CapabilityFn<C, D>,
  c5: CapabilityFn<D, E>,
): E;
export function createClient<A, B, C, D, E, F>(
  config: RSConfig,
  c1: CapabilityFn<RSClientCore, A>,
  c2: CapabilityFn<A, B>,
  c3: CapabilityFn<B, C>,
  c4: CapabilityFn<C, D>,
  c5: CapabilityFn<D, E>,
  c6: CapabilityFn<E, F>,
): F;
export function createClient<A, B, C, D, E, F, G>(
  config: RSConfig,
  c1: CapabilityFn<RSClientCore, A>,
  c2: CapabilityFn<A, B>,
  c3: CapabilityFn<B, C>,
  c4: CapabilityFn<C, D>,
  c5: CapabilityFn<D, E>,
  c6: CapabilityFn<E, F>,
  c7: CapabilityFn<F, G>,
): G;
export function createClient<A, B, C, D, E, F, G, H>(
  config: RSConfig,
  c1: CapabilityFn<RSClientCore, A>,
  c2: CapabilityFn<A, B>,
  c3: CapabilityFn<B, C>,
  c4: CapabilityFn<C, D>,
  c5: CapabilityFn<D, E>,
  c6: CapabilityFn<E, F>,
  c7: CapabilityFn<F, G>,
  c8: CapabilityFn<G, H>,
): H;
// Implementation (any is safe here — overloads enforce types for consumers)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createClient(
  config: RSConfig,
  ...capabilities: Array<(client: any) => any>
): any {
  let client: any = new RSClientCore(config);
  for (const cap of capabilities) {
    client = cap(client);
  }
  return client;
}
