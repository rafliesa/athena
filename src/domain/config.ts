import { DEFAULT_MODEL, isModelId, type ModelId } from './models.js';

export type ApiConfig = {
  provider: 'api';
  model: ModelId;
  apiKey: string;
};

export type CodexConfig = {
  provider: 'codex';
  model: ModelId;
};

export type AthenaConfig = ApiConfig | CodexConfig;
export type ProviderName = AthenaConfig['provider'];

export function createApiConfig(apiKey: string): ApiConfig {
  return { provider: 'api', model: DEFAULT_MODEL, apiKey };
}

export function createCodexConfig(): CodexConfig {
  return { provider: 'codex', model: DEFAULT_MODEL };
}

export function parseConfig(value: unknown): AthenaConfig | null {
  if (!isRecord(value) || !isModelId(value.model)) return null;
  if (value.provider === 'codex') return { provider: 'codex', model: value.model };
  if (value.provider === 'api' && typeof value.apiKey === 'string' && value.apiKey.length > 0) {
    return { provider: 'api', model: value.model, apiKey: value.apiKey };
  }
  return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
