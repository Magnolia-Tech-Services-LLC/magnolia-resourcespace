import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RSClientCore } from '../../src/core/client.js';
import { withBatch } from '../../src/capabilities/batch.js';
import { BatchSizeLimitError } from '../../src/core/errors.js';

const TEST_CONFIG = {
  baseUrl: 'https://dam.example.com/api/',
  user: 'admin',
  secret: 'a'.repeat(64),
  authMode: 'apiKey' as const,
  maxBatchSize: 10, // Small limit for testing
};

describe('batch size limits', () => {
  let client: ReturnType<typeof withBatch<RSClientCore>>;

  beforeEach(() => {
    client = withBatch(new RSClientCore(TEST_CONFIG));
    vi.spyOn(client, 'makeRequest').mockResolvedValue(true);
  });

  it('allows batches within the limit', async () => {
    const ids = Array.from({ length: 10 }, (_, i) => i + 1);
    await expect(client.batchFieldUpdate(ids, 8, 'test')).resolves.toBe(true);
  });

  it('throws BatchSizeLimitError when batch exceeds limit', async () => {
    const ids = Array.from({ length: 11 }, (_, i) => i + 1);
    await expect(client.batchFieldUpdate(ids, 8, 'test')).rejects.toThrow(BatchSizeLimitError);
  });

  it('enforces limit on batchDelete', async () => {
    const ids = Array.from({ length: 11 }, (_, i) => i + 1);
    await expect(client.batchDelete(ids)).rejects.toThrow(BatchSizeLimitError);
  });

  it('enforces limit on batchCollectionAdd', async () => {
    const ids = Array.from({ length: 11 }, (_, i) => i + 1);
    await expect(client.batchCollectionAdd(1, ids)).rejects.toThrow(BatchSizeLimitError);
  });

  it('enforces limit on batchNodesAdd', async () => {
    const ids = Array.from({ length: 11 }, (_, i) => i + 1);
    await expect(client.batchNodesAdd(ids, [1, 2, 3])).rejects.toThrow(BatchSizeLimitError);
  });

  it('enforces limit on batchArchiveStatus', async () => {
    const ids = Array.from({ length: 11 }, (_, i) => i + 1);
    await expect(client.batchArchiveStatus(ids, 2)).rejects.toThrow(BatchSizeLimitError);
  });

  it('uses default limit of 100 when not configured', async () => {
    const clientDefault = withBatch(new RSClientCore({
      ...TEST_CONFIG,
      maxBatchSize: undefined,
    }));
    vi.spyOn(clientDefault, 'makeRequest').mockResolvedValue(true);

    const ids = Array.from({ length: 100 }, (_, i) => i + 1);
    await expect(clientDefault.batchFieldUpdate(ids, 8, 'test')).resolves.toBe(true);

    const tooMany = Array.from({ length: 101 }, (_, i) => i + 1);
    await expect(clientDefault.batchFieldUpdate(tooMany, 8, 'test')).rejects.toThrow(BatchSizeLimitError);
  });
});
