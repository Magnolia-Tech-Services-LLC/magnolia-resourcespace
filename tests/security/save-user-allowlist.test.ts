import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RSClientCore } from '../../src/core/client.js';
import { withUsers } from '../../src/capabilities/users.js';
import { SecurityError } from '../../src/core/errors.js';

const TEST_CONFIG = {
  baseUrl: 'https://dam.example.com/api/',
  user: 'admin',
  secret: 'a'.repeat(64),
  authMode: 'apiKey' as const,
};

describe('save_user field allowlist', () => {
  let client: ReturnType<typeof withUsers<RSClientCore>>;

  beforeEach(() => {
    client = withUsers(new RSClientCore(TEST_CONFIG));
    // Mock makeRequest to capture what params are sent
    vi.spyOn(client, 'makeRequest').mockResolvedValue({ status: 'success', data: null });
  });

  it('allows fullname, email, password, comments', async () => {
    await client.saveUser(1, {
      fullname: 'Test User',
      email: 'test@example.com',
      password: 'newpass',
      comments: 'note',
    });

    expect(client.makeRequest).toHaveBeenCalledWith('save_user', {
      ref: '1',
      data: JSON.stringify({
        fullname: 'Test User',
        email: 'test@example.com',
        password: 'newpass',
        comments: 'note',
      }),
    });
  });

  it('strips disallowed fields: usergroup', async () => {
    await client.saveUser(1, {
      fullname: 'Test User',
      usergroup: 1, // DANGEROUS — admin group
    } as any);

    const call = (client.makeRequest as any).mock.calls[0];
    const sentData = JSON.parse(call[1].data);

    expect(sentData).toHaveProperty('fullname', 'Test User');
    expect(sentData).not.toHaveProperty('usergroup');
  });

  it('strips disallowed fields: approved', async () => {
    await client.saveUser(1, {
      fullname: 'Test User',
      approved: 1, // DANGEROUS — bypasses approval
    } as any);

    const call = (client.makeRequest as any).mock.calls[0];
    const sentData = JSON.parse(call[1].data);

    expect(sentData).not.toHaveProperty('approved');
  });

  it('strips disallowed fields: ip_restrict', async () => {
    await client.saveUser(1, {
      fullname: 'Test User',
      ip_restrict: '', // DANGEROUS — removes IP restrictions
    } as any);

    const call = (client.makeRequest as any).mock.calls[0];
    const sentData = JSON.parse(call[1].data);

    expect(sentData).not.toHaveProperty('ip_restrict');
  });

  it('throws SecurityError when all fields are disallowed', async () => {
    await expect(
      client.saveUser(1, {
        usergroup: 1,
        approved: 1,
      } as any),
    ).rejects.toThrow(SecurityError);
  });

  it('throws SecurityError with empty data', async () => {
    await expect(client.saveUser(1, {})).rejects.toThrow(SecurityError);
  });
});
