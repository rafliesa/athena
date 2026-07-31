import { describe, expect, it } from 'vitest';
import {
  createApiConfig,
  createCodexConfig,
  DEFAULT_SYSTEM_PROMPT,
  parseConfig,
} from '../src/domain/config.js';
import { DEFAULT_AGENT_PERMISSIONS } from '../src/domain/permissions.js';

describe('config', () => {
  it('creates configs with the lowest-cost default model', () => {
    expect(createApiConfig('sk-test')).toEqual({
      provider: 'api',
      model: 'gpt-5.6-luna',
      apiKey: 'sk-test',
      systemPrompt: DEFAULT_SYSTEM_PROMPT,
      permissions: DEFAULT_AGENT_PERMISSIONS,
    });
    expect(createCodexConfig()).toEqual({
      provider: 'codex',
      model: 'gpt-5.6-luna',
      systemPrompt: DEFAULT_SYSTEM_PROMPT,
      permissions: DEFAULT_AGENT_PERMISSIONS,
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
      permissions: DEFAULT_AGENT_PERMISSIONS,
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
      permissions: DEFAULT_AGENT_PERMISSIONS,
    });
  });

  it('preserves valid permissions and rejects malformed permission values', () => {
    expect(
      parseConfig({
        provider: 'codex',
        model: 'gpt-5.6-terra',
        permissions: {
          canEditFiles: false,
          canRunCommands: true,
        },
      }),
    ).toMatchObject({
      permissions: {
        canEditFiles: false,
        canRunCommands: true,
      },
    });
    expect(
      parseConfig({
        provider: 'codex',
        model: 'gpt-5.6-terra',
        permissions: {
          canEditFiles: 'yes',
          canRunCommands: true,
        },
      }),
    ).toBeNull();
  });
});
