import { DEFAULT_SYSTEM_PROMPT, type AthenaConfig } from '../domain/config.js';
import { resolveAgentPermissions } from '../domain/permissions.js';
import { createPermissionedToolRegistry } from '../tools/registry.js';
import { CodexProvider } from './codex/CodexProvider.js';
import { OpenAIProvider } from './openai/OpenAIProvider.js';
import type { Provider } from './provider.js';

export function createProvider(config: AthenaConfig): Provider {
  const permissions = resolveAgentPermissions(config.permissions);
  const tools = createPermissionedToolRegistry(permissions);

  return config.provider === 'codex'
    ? new CodexProvider(
        config.model,
        undefined,
        undefined,
        config.systemPrompt ?? DEFAULT_SYSTEM_PROMPT,
        tools,
        permissions.canEditFiles ? 'workspace-write' : 'read-only',
      )
    : new OpenAIProvider(
        config.apiKey,
        config.model,
        undefined,
        config.systemPrompt ?? DEFAULT_SYSTEM_PROMPT,
        tools,
      );
}
