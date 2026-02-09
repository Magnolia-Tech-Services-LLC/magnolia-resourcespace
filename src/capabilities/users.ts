import type { RSClientCore } from '../core/client.js';
import type { User, UserUpdateData, CreateUserParams } from '../core/types.js';
import { SecurityError } from '../core/errors.js';
import { ensureArray, toNumber } from '../utils/response.js';

// ---------------------------------------------------------------------------
// SECURITY: Field allowlist for save_user
//
// RS save_user accepts ANY user table column including:
//   usergroup, approved, ip_restrict, account_expires, etc.
// Passing these would enable privilege escalation.
// We ONLY allow safe profile fields.
// ---------------------------------------------------------------------------
const SAVE_USER_ALLOWED_FIELDS = new Set<keyof UserUpdateData>([
  'fullname',
  'email',
  'password',
  'comments',
]);

export interface UsersCapability {
  /** Look up a user by username (exact match). */
  getUser(username: string): Promise<User | null>;

  /**
   * Get full user data including comments.
   * Can look up by username (string) or ref (number).
   */
  getFullUser(usernameOrRef: string | number): Promise<User | null>;

  /** Get the numeric ref ID for a username. */
  getUserRef(username: string): Promise<number | null>;

  /** List users, optionally filtering by search string. */
  getUsers(filter?: string): Promise<User[]>;

  /**
   * Authenticate a user. Returns the session key on success, null on failure.
   * The session key can then be used to create a session-key-authenticated client.
   */
  checkCredentials(username: string, password: string): Promise<string | null>;

  /**
   * Create a new user account.
   *
   * SECURITY:
   * - Usergroup is read from client config (`signupUsergroup`), NEVER from parameters.
   * - Created users have `approved=0` (pending) to prevent auto-approval
   *   (RS database defaults approved=1).
   *
   * @returns The new user's ref ID.
   */
  createUser(params: CreateUserParams): Promise<number>;

  /**
   * Update user profile data.
   *
   * SECURITY: Only the following fields are allowed:
   *   fullname, email, password, comments
   *
   * Fields like usergroup, approved, ip_restrict are silently stripped.
   * Throws SecurityError if no valid fields remain after filtering.
   */
  saveUser(userRef: number, data: UserUpdateData): Promise<{ success: boolean; error?: string }>;
}

export function withUsers<T extends RSClientCore>(client: T): T & UsersCapability {
  const methods: UsersCapability = {
    async getUser(username: string): Promise<User | null> {
      const users = await client.makeRequest<User[]>('get_users', {
        find: username,
        exact_username_match: true,
      });
      const arr = ensureArray<User>(users);
      return arr.length > 0 ? normalizeUser(arr[0]) : null;
    },

    async getFullUser(usernameOrRef: string | number): Promise<User | null> {
      const findParam = typeof usernameOrRef === 'number'
        ? usernameOrRef.toString()
        : usernameOrRef;

      const params: Record<string, string | number | boolean> = { find: findParam };
      if (typeof usernameOrRef === 'string') {
        params.exact_username_match = true;
      }

      const users = await client.makeRequest<User[]>('get_users', params);
      const arr = ensureArray<User>(users);
      return arr.length > 0 ? normalizeUser(arr[0]) : null;
    },

    async getUserRef(username: string): Promise<number | null> {
      const user = await methods.getUser(username);
      return user?.ref ?? null;
    },

    async getUsers(filter?: string): Promise<User[]> {
      const params: Record<string, string> = {};
      if (filter) params.find = filter;
      const users = await client.makeRequest<User[]>('get_users', params);
      return ensureArray<User>(users).map(normalizeUser);
    },

    async checkCredentials(username: string, password: string): Promise<string | null> {
      try {
        const result = await client.makeRequest<string | null>('login', {
          username,
          password,
        });
        // RS login returns the session key as a plain string on success
        if (typeof result === 'string' && result.length >= 32) {
          return result;
        }
        return null;
      } catch {
        return null;
      }
    },

    async createUser(params: CreateUserParams): Promise<number> {
      // SECURITY: Usergroup from client config, NEVER from parameters
      const usergroup = client.config.signupUsergroup ?? 9;

      // RS new_user only accepts $username and $usergroup (per RS API docs)
      const result = await client.makeRequest<number | { ref: number; user: number }>('new_user', {
        username: params.username,
        usergroup,
      });

      // RS returns varying formats: { ref: N }, { user: N }, or just N
      let ref: number | null = null;
      if (typeof result === 'object' && result !== null) {
        ref = toNumber((result as Record<string, unknown>).ref as string | number)
          ?? toNumber((result as Record<string, unknown>).user as string | number);
      } else {
        ref = toNumber(result);
      }

      if (ref === null) throw new Error('new_user returned invalid ref');

      // SECURITY: Explicitly set approved=0 (RS database defaults approved=1!)
      // This is the CRITICAL security step — if it fails, user is auto-approved.
      // We retry with backoff because a transient failure here = security hole.
      const saveData: Record<string, string | number> = { approved: 0 };
      if (params.fullname) saveData.fullname = params.fullname;
      if (params.email) saveData.email = params.email;
      if (params.password) saveData.password = params.password;

      const MAX_RETRIES = 3;
      const BACKOFF_BASE_MS = 500;
      let lastError: unknown;

      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
          await client.makeRequest('save_user', {
            ref: ref.toString(),
            data: JSON.stringify(saveData),
          });
          return ref; // Success — user created with approved=0
        } catch (error) {
          lastError = error;
          if (attempt < MAX_RETRIES) {
            client.log.warn(
              `createUser save_user attempt ${attempt}/${MAX_RETRIES} failed, retrying...`,
              { userRef: ref, error: error instanceof Error ? error.message : String(error) },
            );
            await new Promise(resolve => setTimeout(resolve, BACKOFF_BASE_MS * attempt));
          }
        }
      }

      // All retries failed — user exists but may be auto-approved (approved=1 DB default)
      // This is a CRITICAL security problem
      throw new SecurityError(
        `CRITICAL: User ${ref} was created but save_user failed after ${MAX_RETRIES} attempts. ` +
        `User may be auto-approved (RS defaults approved=1). ` +
        `Manually set approved=0 for user ref ${ref}. ` +
        `Cause: ${lastError instanceof Error ? lastError.message : String(lastError)}`,
      );
    },

    async saveUser(userRef: number, data: UserUpdateData): Promise<{ success: boolean; error?: string }> {
      // SECURITY: Allowlist fields to prevent privilege escalation.
      // RS save_user accepts usergroup, approved, ip_restrict, etc.
      // We must NEVER pass those.
      const sanitized: Record<string, string> = {};
      for (const [key, value] of Object.entries(data)) {
        if (SAVE_USER_ALLOWED_FIELDS.has(key as keyof UserUpdateData) && value !== undefined) {
          sanitized[key] = value;
        }
      }

      if (Object.keys(sanitized).length === 0) {
        throw new SecurityError(
          'No valid fields to update. Allowed fields: ' +
          Array.from(SAVE_USER_ALLOWED_FIELDS).join(', '),
        );
      }

      try {
        const result = await client.makeRequest<{ status?: string; data?: unknown; error?: string }>(
          'save_user',
          {
            ref: userRef.toString(),
            data: JSON.stringify(sanitized),
          },
        );

        // JSend success: { status: "success", data: null }
        if (result && typeof result === 'object' && result.status === 'success') {
          return { success: true };
        }

        // JSend fail: { status: "fail", data: { message: "..." } }
        if (result && typeof result === 'object' && result.status === 'fail') {
          const failData = result.data as { message?: string } | null;
          return { success: false, error: failData?.message || 'Save failed' };
        }

        // Legacy error
        if (result && typeof result === 'object' && 'error' in result) {
          return { success: false, error: result.error || 'Unknown error' };
        }

        return { success: false, error: 'Unexpected response format' };
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Unknown error';
        return { success: false, error: msg };
      }
    },
  };

  return Object.assign(client, methods);
}

function normalizeUser(user: Record<string, unknown>): User {
  return {
    ...user,
    ref: toNumber(user.ref as string | number) ?? 0,
    usergroup: toNumber(user.usergroup as string | number) ?? 0,
  } as User;
}
