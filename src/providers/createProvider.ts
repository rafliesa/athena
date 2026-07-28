import type { AthenaConfig } from '../domain/config.js';
import { CodexProvider } from './codex/CodexProvider.js';
import { OpenAIProvider } from './openai/OpenAIProvider.js';
import type { Provider } from './provider.js';

export function createProvider(config: AthenaConfig): Provider {
  return config.provider === 'codex'
    ? new CodexProvider(config.model)
    : new OpenAIProvider(config.apiKey, config.model);
}
