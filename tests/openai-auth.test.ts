import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { validateApiKey } from '../src/auth/openai.js';

describe('validateApiKey', () => {
  let fetchMock: ReturnType<typeof vi.fn<typeof fetch>>;

  beforeEach(() => {
    fetchMock = vi.fn<typeof fetch>();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('validates the key with an authenticated models request', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 200 }));

    await validateApiKey('sk-secret');

    expect(fetchMock).toHaveBeenCalledWith('https://api.openai.com/v1/models', {
      headers: { Authorization: 'Bearer sk-secret' },
    });
  });

  it('reports an invalid key without exposing the secret', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 401 }));

    const error = await validateApiKey('sk-secret').catch((cause: unknown) => cause);

    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toBe('API key validation failed (401).');
    expect((error as Error).message).not.toContain('sk-secret');
  });

  it('propagates network failures', async () => {
    fetchMock.mockRejectedValue(new Error('network unavailable'));

    await expect(validateApiKey('sk-secret')).rejects.toThrow('network unavailable');
  });
});
