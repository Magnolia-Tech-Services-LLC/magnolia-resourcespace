import { describe, it, expect, afterEach, vi } from 'vitest';
import { withUsers } from '../../src/capabilities/users.js';
import { mockFetch, getCapturedParams, createTestCore } from '../helpers.js';
import { SecurityError } from '../../src/core/errors.js';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('withUsers', () => {
  describe('getUser()', () => {
    it('calls get_users with exact username match', async () => {
      const mock = mockFetch([{ ref: '1', username: 'alice', usergroup: '3' }]);
      const client = withUsers(createTestCore());

      const user = await client.getUser('alice');

      const params = getCapturedParams(mock);
      expect(params.get('function')).toBe('get_users');
      expect(params.get('find')).toBe('alice');
      expect(params.get('exact_username_match')).toBe('true');
      // Verify numeric normalization
      expect(user?.ref).toBe(1);
      expect(user?.usergroup).toBe(3);
    });

    it('returns null when user not found', async () => {
      mockFetch([]);
      const client = withUsers(createTestCore());

      const user = await client.getUser('nonexistent');

      expect(user).toBeNull();
    });
  });

  describe('checkCredentials()', () => {
    it('calls login function', async () => {
      const mock = mockFetch('"abc123def456abc123def456abc123def456"');
      const client = withUsers(createTestCore());

      const sessionKey = await client.checkCredentials('alice', 'pass123');

      const params = getCapturedParams(mock);
      expect(params.get('function')).toBe('login');
      expect(params.get('username')).toBe('alice');
      expect(params.get('password')).toBe('pass123');
      expect(sessionKey).toBe('abc123def456abc123def456abc123def456');
    });

    it('returns null on failed login', async () => {
      mockFetch('"false"');
      const client = withUsers(createTestCore());

      const result = await client.checkCredentials('alice', 'wrong');

      expect(result).toBeNull();
    });
  });

  describe('createUser()', () => {
    it('calls new_user with only username and usergroup (per RS API)', async () => {
      // First call: new_user → ref. Second call: save_user → success
      let callCount = 0;
      vi.stubGlobal('fetch', vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // new_user response
          return Promise.resolve({
            status: 200,
            text: () => Promise.resolve('42'),
          });
        }
        // save_user response
        return Promise.resolve({
          status: 200,
          text: () => Promise.resolve(JSON.stringify({ status: 'success', data: null })),
        });
      }));

      const client = withUsers(createTestCore({ signupUsergroup: 5 }));
      const ref = await client.createUser({
        username: 'newuser@example.com',
        email: 'newuser@example.com',
        password: 'secret123',
      });

      expect(ref).toBe(42);

      // Verify new_user call — should only have username and usergroup
      const firstCallUrl = (vi.mocked(fetch).mock.calls[0][0] as string);
      const newUserParams = new URLSearchParams(firstCallUrl.split('?')[1]);
      expect(newUserParams.get('function')).toBe('new_user');
      expect(newUserParams.get('username')).toBe('newuser@example.com');
      expect(newUserParams.get('usergroup')).toBe('5');
      expect(newUserParams.has('email')).toBe(false); // NOT passed to new_user
      expect(newUserParams.has('password')).toBe(false); // NOT passed to new_user

      // Verify save_user call — sets approved=0 and includes email/password
      const secondCallUrl = (vi.mocked(fetch).mock.calls[1][0] as string);
      const saveUserParams = new URLSearchParams(secondCallUrl.split('?')[1]);
      expect(saveUserParams.get('function')).toBe('save_user');
      const saveData = JSON.parse(saveUserParams.get('data')!);
      expect(saveData.approved).toBe(0);
      expect(saveData.email).toBe('newuser@example.com');
      expect(saveData.password).toBe('secret123');
    });

    it('retries save_user on failure and throws SecurityError after max retries', async () => {
      let callCount = 0;
      vi.stubGlobal('fetch', vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // new_user success
          return Promise.resolve({
            status: 200,
            text: () => Promise.resolve('42'),
          });
        }
        // All save_user calls fail
        return Promise.resolve({
          status: 500,
          text: () => Promise.resolve('Internal Server Error'),
        });
      }));

      const client = withUsers(createTestCore());

      await expect(client.createUser({
        username: 'test@example.com',
        email: 'test@example.com',
      })).rejects.toThrow(SecurityError);

      // new_user (1) + save_user retries (3) = 4 calls
      expect(vi.mocked(fetch)).toHaveBeenCalledTimes(4);
    }, 10000); // Higher timeout for retry delays
  });

  describe('saveUser()', () => {
    it('passes allowed fields only', async () => {
      const mock = mockFetch({ status: 'success', data: null });
      const client = withUsers(createTestCore());

      await client.saveUser(42, { fullname: 'Alice', email: 'alice@test.com' });

      const params = getCapturedParams(mock);
      expect(params.get('function')).toBe('save_user');
      expect(params.get('ref')).toBe('42');
      const data = JSON.parse(params.get('data')!);
      expect(data.fullname).toBe('Alice');
      expect(data.email).toBe('alice@test.com');
    });

    it('throws SecurityError when all fields stripped', async () => {
      mockFetch({});
      const client = withUsers(createTestCore());

      await expect(client.saveUser(42, {} as any)).rejects.toThrow(SecurityError);
    });
  });
});
