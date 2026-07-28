import { describe, expect, it } from 'vitest';
import { CodexProvider } from '../src/providers/codex/CodexProvider.js';
import { createProvider } from '../src/providers/createProvider.js';
import { OpenAIProvider } from '../src/providers/openai/OpenAIProvider.js';

describe('createProvider', () => {
  it('creates an OpenAI provider for API configuration', () => {
    const provider = createProvider({
      provider: 'api',
      model: 'gpt-5.6-terra',
      apiKey: 'secret-key',
    });

    expect(provider).toBeInstanceOf(OpenAIProvider);
    expect(provider.name).toBe('api');
    expect(provider.model).toBe('gpt-5.6-terra');
  });

  it('creates a Codex provider for Codex configuration', () => {
    const provider = createProvider({
      provider: 'codex',
      model: 'gpt-5.6-sol',
    });

    expect(provider).toBeInstanceOf(CodexProvider);
    expect(provider.name).toBe('codex');
    expect(provider.model).toBe('gpt-5.6-sol');
  });
});
