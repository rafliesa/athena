import { describe, expect, it } from 'vitest';
import { createApiConfig, createCodexConfig, parseConfig } from '../src/domain/config.js';

describe('config', () => {
  it('creates configs with the lowest-cost default model', () => {
    expect(createApiConfig('sk-test')).toEqual({
      provider: 'api',
      model: 'gpt-5.6-luna',
      apiKey: 'sk-test',
    });
    expect(createCodexConfig()).toEqual({
      provider: 'codex',
      model: 'gpt-5.6-luna',
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
    ).toEqual({ provider: 'codex', model: 'gpt-5.6-terra' });
  });
});
