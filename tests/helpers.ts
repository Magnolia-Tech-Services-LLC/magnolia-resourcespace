/**
 * Test helpers: mock fetch and create test clients.
 */
import { vi } from 'vitest';
import { RSClientCore } from '../src/core/client.js';
import type { RSConfig } from '../src/core/types.js';

/** Minimal valid config for tests */
export const TEST_CONFIG: RSConfig = {
  baseUrl: 'https://dam.example.com/api/',
  user: 'testuser',
  secret: 'a'.repeat(32), // meets min length
  authMode: 'apiKey',
  signupUsergroup: 5,
  maxBatchSize: 10,
};

/**
 * Mock global fetch to return a specific JSON body.
 * Returns the mock function so tests can inspect calls.
 */
export function mockFetch(responseBody: unknown, status = 200) {
  const mockFn = vi.fn().mockResolvedValue({
    status,
    text: () => Promise.resolve(
      typeof responseBody === 'string' ? responseBody : JSON.stringify(responseBody),
    ),
  });
  vi.stubGlobal('fetch', mockFn);
  return mockFn;
}

/**
 * Extract the query string from the first fetch call's URL.
 * Returns it as a URLSearchParams object for easy inspection.
 */
export function getCapturedParams(mockFn: ReturnType<typeof vi.fn>): URLSearchParams {
  const url = mockFn.mock.calls[0][0] as string;
  const queryString = url.split('?')[1] ?? '';
  return new URLSearchParams(queryString);
}

/**
 * Create a core client for testing.
 */
export function createTestCore(configOverrides?: Partial<RSConfig>): RSClientCore {
  return new RSClientCore({ ...TEST_CONFIG, ...configOverrides });
}
