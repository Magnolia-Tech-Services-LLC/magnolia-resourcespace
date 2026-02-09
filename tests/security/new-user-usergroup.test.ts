import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RSClientCore } from '../../src/core/client.js';
import { withUsers } from '../../src/capabilities/users.js';

const TEST_CONFIG = {
  baseUrl: 'https://dam.example.com/api/',
  user: 'admin',
  secret: 'a'.repeat(64),
  authMode: 'apiKey' as const,
  signupUsergroup: 9,
};

describe('createUser usergroup enforcement', () => {
  let client: ReturnType<typeof withUsers<RSClientCore>>;

  beforeEach(() => {
    client = withUsers(new RSClientCore(TEST_CONFIG));
    // Mock makeRequest: first call (new_user) returns ref, second (save_user) succeeds
    vi.spyOn(client, 'makeRequest')
      .mockResolvedValueOnce({ ref: 42 }) // new_user response
      .mockResolvedValueOnce({ status: 'success' }); // save_user response
  });

  it('uses signupUsergroup from config, not from parameters', async () => {
    await client.createUser({
      username: 'test@example.com',
      email: 'test@example.com',
    });

    // First call should be new_user with hardcoded usergroup
    const newUserCall = (client.makeRequest as any).mock.calls[0];
    expect(newUserCall[0]).toBe('new_user');
    expect(newUserCall[1].usergroup).toBe(9); // From config
  });

  it('ignores usergroup passed in params', async () => {
    await client.createUser({
      username: 'test@example.com',
      email: 'test@example.com',
      usergroup: 1, // DANGEROUS — admin group, should be ignored
    } as any);

    const newUserCall = (client.makeRequest as any).mock.calls[0];
    expect(newUserCall[1].usergroup).toBe(9); // Config value, not 1
  });

  it('defaults to usergroup 9 when not configured', async () => {
    const clientNoConfig = withUsers(new RSClientCore({
      ...TEST_CONFIG,
      signupUsergroup: undefined,
    }));
    vi.spyOn(clientNoConfig, 'makeRequest')
      .mockResolvedValueOnce({ ref: 42 })
      .mockResolvedValueOnce({ status: 'success' });

    await clientNoConfig.createUser({
      username: 'test@example.com',
      email: 'test@example.com',
    });

    const newUserCall = (clientNoConfig.makeRequest as any).mock.calls[0];
    expect(newUserCall[1].usergroup).toBe(9); // Default
  });

  it('sets approved=0 in save_user after creation', async () => {
    await client.createUser({
      username: 'test@example.com',
      email: 'test@example.com',
      fullname: 'Test User',
    });

    // Second call should be save_user with approved=0
    const saveUserCall = (client.makeRequest as any).mock.calls[1];
    expect(saveUserCall[0]).toBe('save_user');
    const savedData = JSON.parse(saveUserCall[1].data);
    expect(savedData.approved).toBe(0);
    expect(savedData.fullname).toBe('Test User');
  });
});
