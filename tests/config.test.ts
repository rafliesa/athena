import { describe, expect, it } from 'vitest';
import {
  createApiConfig,
  createCodexConfig,
  DEFAULT_SYSTEM_PROMPT,
  parseConfig,
} from '../src/domain/config.js';

describe('config', () => {
  it('creates configs with the lowest-cost default model', () => {
    expect(createApiConfig('sk-test')).toEqual({
      provider: 'api',
      model: 'gpt-5.6-luna',
      apiKey: 'sk-test',
      systemPrompt: DEFAULT_SYSTEM_PROMPT,
    });
    expect(createCodexConfig()).toEqual({
      provider: 'codex',
      model: 'gpt-5.6-luna',
      systemPrompt: DEFAULT_SYSTEM_PROMPT,
    });
  });

  it('rejects malformed persisted config', () => {
    expect(parseConfig({ provider: 'api', model: 'gpt-5.6-luna' })).toBeNull();
    expect(parseConfig({ provider: 'codex', model: 'not-a-model' })).toBeNull();
    expect(parseConfig(null)).toBeNull();
  });

  it('normalizes valid persisted config', () => {
    expect(
      parseConfig({
        provider: 'codex',
        model: 'gpt-5.6-terra',
        ignored: true,
      }),
    ).toEqual({
      provider: 'codex',
      model: 'gpt-5.6-terra',
      systemPrompt: DEFAULT_SYSTEM_PROMPT,
    });
  });

  it('preserves a custom system prompt', () => {
    expect(
      parseConfig({
        provider: 'codex',
        model: 'gpt-5.6-terra',
        systemPrompt: 'Be concise.',
      }),
    ).toEqual({
      provider: 'codex',
      model: 'gpt-5.6-terra',
      systemPrompt: 'Be concise.',
    });
  });
});
